import { createAdminClient } from "@/lib/supabase/admin";
import {
  InvalidBookingRequestError,
  parsePublicBookingSubmission,
  readBoundedJsonRequest,
  RequestBodyTooLargeError,
} from "@/lib/bookingSubmission";
import { hashTrustedClientIp } from "@/lib/additionalServiceSubmission";
import { isSameOriginRequest } from "@/lib/sameOrigin";

export const runtime = "nodejs";

const maximumRequestBytes = 32 * 1024;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "This booking could not be submitted from this origin." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return Response.json(
      { error: "Submit the booking using the provided form." },
      { status: 415, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json(
      { error: "Online bookings are temporarily unavailable. Please contact KitKleen." },
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
      "Booking trusted IP configuration failed:",
      error instanceof Error ? error.message : "Unknown configuration error"
    );
    return Response.json(
      { error: "Online bookings are temporarily unavailable. Please contact KitKleen." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = createAdminClient();
  const { data: rateAllowed, error: rateLimitError } = await supabase.rpc(
    "consume_public_booking_rate_limit",
    { p_ip_hash: ipHash }
  );
  if (rateLimitError) {
    console.error("Booking rate limiting failed:", rateLimitError.code);
    return Response.json(
      { error: "Online bookings are temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (rateAllowed !== true) {
    return Response.json(
      { error: "Too many bookings were submitted from this connection. Please try again in an hour." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } }
    );
  }

  let requestBody: unknown;
  try {
    requestBody = await readBoundedJsonRequest(request, maximumRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: error.message }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof InvalidBookingRequestError) {
      return Response.json({ error: "The booking details could not be read." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    console.error("Booking request body could not be read.");
    return Response.json({ error: "The booking could not be submitted. Please try again." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let submission;
  try {
    submission = parsePublicBookingSubmission(requestBody);
  } catch (error) {
    if (!(error instanceof InvalidBookingRequestError)) {
      console.error("Booking validation failed unexpectedly.");
    }
    return Response.json(
      { error: "Check the booking details and selected services, then try again." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { error } = await supabase.rpc("submit_public_booking", {
    p_booking: submission.booking,
    p_items: submission.items,
  });
  if (error) {
    console.error("Booking persistence failed:", error.code);
    return Response.json(
      { error: "Your booking could not be submitted. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    { accepted: true },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
