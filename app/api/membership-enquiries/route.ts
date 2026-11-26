import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  InvalidBookingRequestError,
  readBoundedJsonRequest,
  RequestBodyTooLargeError,
} from "@/lib/bookingSubmission";
import {
  hashMembershipClientIp,
  isValidMembershipPlan,
  normalizeMembershipMobile,
} from "@/lib/membershipEnquiries";
import { isSameOriginRequest } from "@/lib/sameOrigin";

export const runtime = "nodejs";

const maximumRequestBytes = 8 * 1024;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "This enquiry could not be accepted from this origin." }, { status: 403, headers });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return Response.json({ error: "Submit the enquiry using the provided form." }, { status: 415, headers });
  }
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return Response.json({ error: "Membership enquiries are temporarily unavailable." }, { status: 503, headers });
  }

  let body: unknown;
  try {
    body = await readBoundedJsonRequest(request, maximumRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The enquiry is too large." }, { status: 413, headers });
    }
    if (error instanceof InvalidBookingRequestError) {
      return Response.json({ error: "The enquiry request is invalid." }, { status: 400, headers });
    }
    console.error("Membership enquiry request body could not be read.");
    return Response.json({ error: "The enquiry request could not be read." }, { status: 400, headers });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Enter a valid membership enquiry." }, { status: 400, headers });
  }
  const payload = body as Record<string, unknown>;
  const planId = typeof payload.planId === "string" ? payload.planId : "";
  const idempotencyKey =
    typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : "";
  const customerName =
    typeof payload.customerName === "string" ? payload.customerName.trim() : "";
  const rawMobile = typeof payload.mobile === "string" ? payload.mobile : "";
  const mobile = normalizeMembershipMobile(rawMobile);
  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (
    !isValidMembershipPlan(planId) ||
    Object.keys(payload).some((key) =>
      !["planId", "idempotencyKey", "customerName", "mobile", "email", "message"].includes(key)
    ) ||
    !uuidPattern.test(idempotencyKey) ||
    ("email" in payload && typeof payload.email !== "string") ||
    customerName.length < 2 ||
    customerName.length > 120 ||
    !/^[0-9+()\- .]{7,30}$/.test(rawMobile.trim()) ||
    !/^\+[1-9]\d{7,14}$/.test(mobile) ||
    (email !== "" &&
      (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
    message.length < 1 ||
    message.length > 2000
  ) {
    return Response.json(
      { error: "Check your name, contact details, membership option and message." },
      { status: 400, headers }
    );
  }

  let ipHash: string;
  try {
    ipHash = hashMembershipClientIp(
      request,
      process.env.ADDITIONAL_ENQUIRY_RATE_LIMIT_SECRET
    );
  } catch (error) {
    console.error(
      "Membership enquiry client IP hashing failed:",
      error instanceof Error ? error.message : "Unknown configuration error"
    );
    return Response.json({ error: "Membership enquiries are temporarily unavailable." }, { status: 503, headers });
  }

  const adminClient = createAdminClient();
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({
      planId,
      customerName,
      mobile,
      email: email || null,
      message,
    }))
    .digest("hex");
  const { data, error: submissionError } = await adminClient.rpc(
    "submit_membership_enquiry_idempotent",
    {
      p_idempotency_key: idempotencyKey,
      p_payload_hash: payloadHash,
      p_ip_hash: ipHash,
      p_customer_name: customerName,
      p_customer_mobile: mobile,
      p_customer_email: email || null,
      p_plan_id: planId,
      p_message: message,
    }
  );
  if (submissionError?.code === "P4090") {
    return Response.json(
      { error: "This submission key was already used for different enquiry details. Start a new submission." },
      { status: 409, headers }
    );
  }
  if (submissionError?.code === "P4290") {
    return Response.json(
      { error: "Too many membership enquiries were submitted. Please try again later." },
      { status: 429, headers: { ...headers, "Retry-After": "3600" } }
    );
  }
  if (submissionError) {
    console.error("Membership enquiry submission failed:", submissionError.code);
    return Response.json({ error: "Your enquiry could not be saved. Please try again." }, { status: 503, headers });
  }
  const result = Array.isArray(data) ? data[0] : null;
  if (!result?.enquiry_id || !result.enquiry_status) {
    console.error("Membership enquiry submission returned no result.");
    return Response.json({ error: "Your enquiry could not be saved. Please try again." }, { status: 503, headers });
  }

  return Response.json(
    { id: result.enquiry_id, status: result.enquiry_status },
    { status: result.created ? 201 : 200, headers }
  );
}
