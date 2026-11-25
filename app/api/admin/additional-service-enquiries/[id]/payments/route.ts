import { createClient } from "@/lib/supabase/server";
import { isPaymentMethod } from "@/lib/additionalServiceEnquiries";
import { isSameOriginRequest } from "@/lib/sameOrigin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "This payment could not be recorded from this origin." }, { status: 403 });
  }
  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return Response.json({ error: "Invalid enquiry reference." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (auth.user.app_metadata?.role !== "admin") {
    return Response.json({ error: "Admin access is required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid payment details." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid payment details." }, { status: 400 });
  }
  const payment = body as Record<string, unknown>;
  const amountInr = payment.amountInr;
  const method = payment.method;
  const reference = payment.reference;
  if (
    typeof amountInr !== "number" ||
    !Number.isSafeInteger(amountInr) ||
    amountInr <= 0 ||
    amountInr > 2_147_483_647 ||
    !isPaymentMethod(method) ||
    typeof reference !== "string" ||
    reference.trim().length < 1 ||
    reference.trim().length > 120 ||
    payment.confirmed !== true
  ) {
    return Response.json(
      { error: "Enter the amount, method and reference, and confirm the payment was independently verified." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("record_additional_service_enquiry_payment", {
    p_enquiry_id: id,
    p_amount_inr: amountInr,
    p_payment_method: method,
    p_payment_reference: reference.trim(),
    p_confirmed: true,
  });
  if (error) {
    console.error("Additional enquiry payment recording failed:", error.code);
    const message = error.code === "23505"
      ? "That payment reference has already been recorded."
      : error.code === "P0002"
        ? "Enquiry not found."
        : error.code === "22023"
          ? error.message
          : "The payment could not be recorded.";
    return Response.json({ error: message }, { status: error.code === "P0002" ? 404 : 400 });
  }
  return Response.json({ payment: data }, { headers: { "Cache-Control": "no-store" } });
}
