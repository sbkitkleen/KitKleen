import { createClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/sameOrigin";

const enquiryStatuses = ["new", "reviewing", "awaiting_customer", "closed"];
const orderStatuses = [
  "not_started",
  "awaiting_inspection",
  "awaiting_quote",
  "quote_sent",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  }
  if (data.user.app_metadata?.role !== "admin") {
    return { response: Response.json({ error: "Admin access is required." }, { status: 403 }) };
  }
  return { supabase };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "This enquiry could not be updated from this origin." }, { status: 403 });
  }
  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return Response.json({ error: "Invalid enquiry reference." }, { status: 400 });
  }

  const authorization = await requireAdmin();
  if (authorization.response) return authorization.response;

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return Response.json({ error: "Invalid update details." }, { status: 400 });
    }
    body = value as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid update details." }, { status: 400 });
  }

  const allowedKeys = ["enquiryStatus", "orderStatus", "amountDueInr"];
  if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
    return Response.json({ error: "Unsupported enquiry update." }, { status: 400 });
  }

  const update: {
    enquiry_status?: string;
    order_status?: string;
    amount_due_inr?: number | null;
  } = {};
  if (body.enquiryStatus !== undefined) {
    if (typeof body.enquiryStatus !== "string" || !enquiryStatuses.includes(body.enquiryStatus)) {
      return Response.json({ error: "Select a valid enquiry status." }, { status: 400 });
    }
    update.enquiry_status = body.enquiryStatus;
  }
  if (body.orderStatus !== undefined) {
    if (typeof body.orderStatus !== "string" || !orderStatuses.includes(body.orderStatus)) {
      return Response.json({ error: "Select a valid order status." }, { status: 400 });
    }
    update.order_status = body.orderStatus;
  }
  if (Object.hasOwn(body, "amountDueInr")) {
    const amount = body.amountDueInr;
    if (
      amount !== null &&
      (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0 || amount > 2_147_483_647)
    ) {
      return Response.json({ error: "Enter a valid confirmed amount due." }, { status: 400 });
    }
    update.amount_due_inr = amount;
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Choose an enquiry update." }, { status: 400 });
  }

  const updatesAmount = Object.hasOwn(update, "amount_due_inr");
  const { data, error } = await authorization.supabase.rpc(
    "update_additional_service_enquiry_workflow",
    {
      p_enquiry_id: id,
      p_enquiry_status: update.enquiry_status ?? null,
      p_order_status: update.order_status ?? null,
      p_update_amount_due: updatesAmount,
      p_amount_due_inr: updatesAmount ? update.amount_due_inr ?? null : null,
    }
  );

  if (error) {
    console.error("Additional enquiry admin update failed:", error.code);
    const message = error.message.includes("lower than verified payments")
      ? "Amount due cannot be lower than verified payments."
      : error.code === "P0002"
        ? "Enquiry not found."
        : error.code === "22023"
          ? error.message
          : "The enquiry could not be updated.";
    const status = error.code === "P0002" ? 404 : error.code === "22023" ? 409 : 500;
    return Response.json({ error: message }, { status });
  }
  const updatedEnquiry = Array.isArray(data) ? data[0] : null;
  if (!updatedEnquiry) return Response.json({ error: "Enquiry not found." }, { status: 404 });
  return Response.json(updatedEnquiry, { headers: { "Cache-Control": "no-store" } });
}
