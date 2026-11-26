import { createClient } from "@/lib/supabase/server";
import {
  InvalidBookingRequestError,
  readBoundedJsonRequest,
  RequestBodyTooLargeError,
} from "@/lib/bookingSubmission";
import { isSameOriginRequest } from "@/lib/sameOrigin";

const statuses = ["submitted", "reviewing", "contacted", "closed"] as const;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const headers = { "Cache-Control": "no-store" };
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "This enquiry could not be updated from this origin." },
      { status: 403, headers }
    );
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return Response.json(
      { error: "Submit the status update using the provided interface." },
      { status: 415, headers }
    );
  }

  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return Response.json({ error: "Invalid enquiry reference." }, { status: 400, headers });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "Sign in to continue." }, { status: 401, headers });
  }
  if (auth.user.app_metadata?.role !== "admin") {
    return Response.json({ error: "Admin access is required." }, { status: 403, headers });
  }

  let body: unknown;
  try {
    body = await readBoundedJsonRequest(request, 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The status update is too large." }, { status: 413, headers });
    }
    if (error instanceof InvalidBookingRequestError) {
      return Response.json({ error: "The status update is invalid." }, { status: 400, headers });
    }
    console.error("Membership status update body could not be read.");
    return Response.json({ error: "The status update could not be read." }, { status: 400, headers });
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !("status" in body) ||
    typeof body.status !== "string" ||
    !statuses.includes(body.status as (typeof statuses)[number])
  ) {
    return Response.json({ error: "Select a valid enquiry status." }, { status: 400, headers });
  }

  const { data, error } = await supabase
    .from("membership_enquiries")
    .update({ enquiry_status: body.status })
    .eq("id", id)
    .select("id,enquiry_status")
    .maybeSingle();
  if (error) {
    console.error("Membership enquiry status update failed:", error.code);
    return Response.json({ error: "The enquiry status could not be updated." }, { status: 503, headers });
  }
  if (!data) {
    return Response.json({ error: "Enquiry not found." }, { status: 404, headers });
  }
  return Response.json(data, { headers });
}
