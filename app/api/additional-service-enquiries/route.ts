import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAdditionalEnquiry } from "@/lib/additionalServiceEnquiries";
import {
  hasValidImageSignature,
  hashTrustedClientIp,
  parseBoundedMultipartForm,
  RequestBodyTooLargeError,
} from "@/lib/additionalServiceSubmission";
import { isSameOriginRequest } from "@/lib/sameOrigin";

export const runtime = "nodejs";

const bucketName = "additional-service-enquiries";
const maximumRequestBytes = 6 * 1024 * 1024;
const fileExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const idempotencyKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function payloadHash(enquiry: ReturnType<typeof parseAdditionalEnquiry>) {
  const photoHash = enquiry.photo
    ? createHash("sha256").update(Buffer.from(await enquiry.photo.arrayBuffer())).digest("hex")
    : null;
  return createHash("sha256")
    .update(JSON.stringify({
      serviceCategory: enquiry.serviceCategory,
      serviceDetails: enquiry.serviceDetails,
      customerName: enquiry.customerName,
      mobile: enquiry.mobile,
      email: enquiry.email,
      location: enquiry.location,
      amountDueInr: enquiry.amountDueInr,
      photo: enquiry.photo
        ? {
            contentHash: photoHash,
            name: enquiry.photo.name,
            type: enquiry.photo.type,
            size: enquiry.photo.size,
          }
        : null,
    }))
    .digest("hex");
}

async function releaseReservation(
  supabase: ReturnType<typeof createAdminClient>,
  idempotencyKey: string,
  digest: string
) {
  const { error } = await supabase.rpc("release_additional_service_enquiry_submission", {
    p_idempotency_key: idempotencyKey,
    p_payload_hash: digest,
  });
  if (error) console.error("Additional enquiry idempotency release failed:", error.code);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "This enquiry could not be accepted from this origin." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data(?:\s*;|$)/i.test(contentType)) {
    return Response.json({ error: "Submit the enquiry using the provided form." }, { status: 415 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json(
      { error: "Online enquiries are not configured yet. Please contact KitKleen directly." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  let ipHash: string;
  try {
    ipHash = hashTrustedClientIp(
      request,
      process.env.ADDITIONAL_ENQUIRY_TRUSTED_IP_HEADER,
      process.env.ADDITIONAL_ENQUIRY_RATE_LIMIT_SECRET
    );
  } catch (error) {
    console.error(
      "Additional enquiry trusted IP configuration failed:",
      error instanceof Error ? error.message : "Unknown configuration error"
    );
    return Response.json(
      { error: "Online enquiries are temporarily unavailable. Please contact KitKleen directly." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = createAdminClient();
  const { data: rateAllowed, error: rateLimitError } = await supabase.rpc(
    "consume_additional_service_enquiry_rate_limit",
    { p_ip_hash: ipHash }
  );
  if (rateLimitError) {
    console.error("Additional enquiry rate limiting failed:", rateLimitError.code);
    return Response.json(
      { error: "Online enquiries are temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (rateAllowed !== true) {
    return Response.json(
      { error: "Too many enquiries were submitted from this connection. Please try again in an hour." },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": "3600" },
      }
    );
  }

  let formData: FormData;
  try {
    formData = await parseBoundedMultipartForm(request, maximumRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: error.message }, { status: 413 });
    }
    if (
      error instanceof Error &&
      (error.message.startsWith("Invalid Content-Length") || error.message.includes("does not match"))
    ) {
      return Response.json({ error: "The enquiry request has an invalid size header." }, { status: 400 });
    }
    return Response.json({ error: "The enquiry form could not be read. Please try again." }, { status: 400 });
  }

  const rawIdempotencyKey = formData.get("idempotencyKey");
  if (typeof rawIdempotencyKey !== "string" || !idempotencyKeyPattern.test(rawIdempotencyKey)) {
    return Response.json({ error: "Refresh the form and submit the enquiry again." }, { status: 400 });
  }

  let enquiry;
  try {
    enquiry = parseAdditionalEnquiry(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check the enquiry details and try again.";
    return Response.json({ error: message }, { status: 400 });
  }

  if (enquiry.photo) {
    const signature = new Uint8Array(await enquiry.photo.slice(0, 12).arrayBuffer());
    if (!hasValidImageSignature(enquiry.photo.type, signature)) {
      return Response.json(
        { error: "The selected file is not a valid JPEG, PNG or WebP image." },
        { status: 400 }
      );
    }
  }

  let digest: string;
  try {
    digest = await payloadHash(enquiry);
  } catch {
    return Response.json({ error: "The enquiry attachment could not be processed." }, { status: 400 });
  }
  const { data: reservationData, error: reservationError } = await supabase.rpc(
    "begin_additional_service_enquiry_submission",
    {
      p_idempotency_key: rawIdempotencyKey,
      p_payload_hash: digest,
    }
  );
  if (reservationError) {
    console.error("Additional enquiry idempotency reservation failed:", reservationError.code);
    const duplicateKey = reservationError.message.includes("already used with different details");
    return Response.json(
      { error: duplicateKey ? "This enquiry changed after submission. Refresh and try again." : "The enquiry could not be started. Please try again." },
      { status: duplicateKey ? 409 : 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const reservation = Array.isArray(reservationData) ? reservationData[0] : null;
  if (!reservation || typeof reservation.outcome !== "string") {
    return Response.json(
      { error: "The enquiry could not be started. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (reservation.outcome === "replay" && typeof reservation.enquiry_reference === "string") {
    return Response.json(
      { reference: reservation.enquiry_reference },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (reservation.outcome === "in_progress") {
    return Response.json(
      { error: "This enquiry is already being saved. Please wait a moment before retrying." },
      { status: 409, headers: { "Cache-Control": "no-store", "Retry-After": "5" } }
    );
  }
  if (reservation.outcome !== "started" && reservation.outcome !== "resume") {
    return Response.json(
      { error: "The enquiry could not be started. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  let uploadedObjectPath: string | null = null;
  let attachment: {
    objectPath: string;
    originalFilename: string;
    contentType: string;
    fileSizeBytes: number;
  } | null = null;

  if (enquiry.photo) {
    const extension = fileExtensions[enquiry.photo.type];
    uploadedObjectPath = `enquiries/${rawIdempotencyKey}.${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(uploadedObjectPath, enquiry.photo, {
        contentType: enquiry.photo.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (error) {
      console.error("Additional service attachment upload failed:", error.message);
      await releaseReservation(supabase, rawIdempotencyKey, digest);
      return Response.json(
        { error: "The photo could not be uploaded, so the enquiry was not saved. Please try again." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const originalFilename = enquiry.photo.name
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 160);
    attachment = {
      objectPath: uploadedObjectPath,
      originalFilename: originalFilename || "uploaded-photo",
      contentType: enquiry.photo.type,
      fileSizeBytes: enquiry.photo.size,
    };
  }

  const { data: completionData, error: completionError } = await supabase.rpc(
    "complete_additional_service_enquiry_submission",
    {
      p_idempotency_key: rawIdempotencyKey,
      p_payload_hash: digest,
      p_service_category: enquiry.serviceCategory,
      p_service_details: enquiry.serviceDetails,
      p_customer_name: enquiry.customerName,
      p_mobile: enquiry.mobile,
      p_email: enquiry.email,
      p_location: enquiry.location,
      p_amount_due_inr: enquiry.amountDueInr,
      p_attachment: attachment,
    }
  );
  if (completionError) {
    if (uploadedObjectPath) {
      const { error: cleanupError } = await supabase.storage.from(bucketName).remove([uploadedObjectPath]);
      if (cleanupError) console.error("Additional enquiry attachment cleanup failed:", cleanupError.message);
    }
    await releaseReservation(supabase, rawIdempotencyKey, digest);
    console.error("Additional service enquiry save failed:", completionError.code);
    return Response.json(
      { error: "The enquiry could not be saved. Online enquiries may not be enabled yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const completed = Array.isArray(completionData) ? completionData[0] : null;
  if (
    !completed ||
    (completed.outcome !== "created" && completed.outcome !== "replay") ||
    typeof completed.enquiry_reference !== "string"
  ) {
    if (uploadedObjectPath) {
      const { error: cleanupError } = await supabase.storage.from(bucketName).remove([uploadedObjectPath]);
      if (cleanupError) console.error("Additional enquiry attachment cleanup failed:", cleanupError.message);
    }
    await releaseReservation(supabase, rawIdempotencyKey, digest);
    return Response.json(
      { error: "The enquiry could not be confirmed as saved. Please retry with the same form." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (completed.outcome === "replay" && uploadedObjectPath) {
    const { error: cleanupError } = await supabase.storage.from(bucketName).remove([uploadedObjectPath]);
    if (cleanupError) console.error("Duplicate enquiry attachment cleanup failed:", cleanupError.message);
  }

  return Response.json(
    { reference: completed.enquiry_reference },
    {
      status: completed.outcome === "created" ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
