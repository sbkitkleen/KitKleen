import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePublicOrderSubmission, InvalidOrderSubmissionError } from "@/lib/orderSubmission";
import {
  InvalidBookingRequestError,
  readBoundedJsonRequest,
  RequestBodyTooLargeError,
} from "@/lib/bookingSubmission";
import { hashTrustedClientIp } from "@/lib/additionalServiceSubmission";
import { isSameOriginRequest } from "@/lib/sameOrigin";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };
const idempotencyKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "This order could not be submitted from this origin." }, { status: 403, headers: noStore });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return Response.json({ error: "Submit the order using the provided checkout." }, { status: 415, headers: noStore });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.ORDERS_TRUSTED_IP_HEADER ||
    !process.env.ORDERS_RATE_LIMIT_SECRET
  ) {
    return Response.json(
      { error: "Online order submission is not configured yet. Please contact KitKleen." },
      { status: 503, headers: noStore }
    );
  }

  let body: unknown;
  try {
    body = await readBoundedJsonRequest(request, 16 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The order request is too large." }, { status: 413, headers: noStore });
    }
    if (error instanceof InvalidBookingRequestError) {
      return Response.json({ error: "The order request is invalid." }, { status: 400, headers: noStore });
    }
    return Response.json({ error: "The order request could not be read." }, { status: 400, headers: noStore });
  }

  if (
    !isRecord(body) ||
    Object.keys(body).length !== 2 ||
    !Object.hasOwn(body, "idempotencyKey") ||
    !Object.hasOwn(body, "submission") ||
    typeof body.idempotencyKey !== "string" ||
    !idempotencyKeyPattern.test(body.idempotencyKey)
  ) {
    return Response.json({ error: "Refresh checkout and submit the order again." }, { status: 400, headers: noStore });
  }

  let submission;
  try {
    submission = parsePublicOrderSubmission(body.submission);
  } catch (error) {
    if (error instanceof InvalidOrderSubmissionError) {
      return Response.json({ error: "Check your order details and try again." }, { status: 400, headers: noStore });
    }
    console.error("Order validation failed unexpectedly.");
    return Response.json({ error: "The order details could not be validated." }, { status: 400, headers: noStore });
  }

  let ipHash: string;
  try {
    ipHash = hashTrustedClientIp(
      request,
      process.env.ORDERS_TRUSTED_IP_HEADER,
      process.env.ORDERS_RATE_LIMIT_SECRET
    );
  } catch (error) {
    console.error("Orders trusted IP configuration failed:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Online order submission is temporarily unavailable." }, { status: 503, headers: noStore });
  }

  const payloadHash = createHash("sha256").update(JSON.stringify(submission)).digest("hex");
  const orderPayload = {
    customer_name: submission.customer.name,
    customer_mobile: submission.customer.mobile,
    customer_email: submission.customer.email,
    customer_location: submission.customer.location,
    delivery_address: submission.customer.delivery_address,
    pickup_instructions: submission.customer.pickup_instructions,
    customer_notes: submission.customer.notes,
    handover_method: submission.handover.method,
    requested_handover_at: submission.handover.requested_at,
    payment_preference: submission.payment_preference,
    subtotal_paise: submission.subtotal_paise,
    customer_notification_opt_in: false,
  };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("submit_kitkleen_order", {
    p_idempotency_key: body.idempotencyKey,
    p_payload_hash: payloadHash,
    p_order: orderPayload,
    p_items: submission.items,
    p_ip_hash: ipHash,
  });

  if (error) {
    if (error.code === "22023" && error.message.includes("different request")) {
      return Response.json({ error: "This checkout key was already used with different order details. Refresh checkout and try again." }, { status: 409, headers: noStore });
    }
    if (error.code === "P4290") {
      return Response.json(
        { error: "Too many new order attempts from this connection. Please try again in an hour." },
        { status: 429, headers: { ...noStore, "Retry-After": "3600" } }
      );
    }
    console.error("Order persistence failed:", error.code);
    return Response.json({ error: "Your order could not be submitted. Please try again." }, { status: 503, headers: noStore });
  }

  const result = isRecord(data) ? data : null;
  if (
    !result ||
    typeof result.order_id !== "string" ||
    typeof result.order_reference !== "string" ||
    typeof result.created !== "boolean"
  ) {
    console.error("Order submission returned an unexpected result.");
    return Response.json({ error: "Your order could not be confirmed. Please try again." }, { status: 503, headers: noStore });
  }

  return Response.json(
    { accepted: true, orderId: result.order_id, orderReference: result.order_reference },
    { status: result.created ? 201 : 200, headers: noStore }
  );
}
