import Link from "next/link";
import { AdminAdditionalEnquiries, type AdminEnquiry } from "@/components/AdminAdditionalEnquiries";
import { createClient } from "@/lib/supabase/server";

export default async function AdditionalEnquiriesPage() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return (
      <main className="admin-access-message">
        <h1>Sign in required</h1>
        <p>Sign in to KitKleen admin to view additional service enquiries.</p>
        <Link href="/admin/login">Open admin sign in</Link>
      </main>
    );
  }
  if (auth.user.app_metadata?.role !== "admin") {
    return (
      <main className="admin-access-message">
        <h1>Admin role required</h1>
        <p>This queue is restricted to accounts with the trusted Supabase app_metadata role set to admin.</p>
        <Link href="/admin">Return to admin</Link>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("additional_service_enquiries")
    .select("id, enquiry_reference, service_category, service_details, customer_name, mobile, email, location, amount_due_inr, enquiry_status, order_status, payment_status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Additional service enquiry admin load failed:", error.code);
    return (
      <main className="admin-access-message">
        <h1>Enquiry queue unavailable</h1>
        <p>The approved enquiry schema may not have been applied yet. No enquiry data was changed.</p>
        <Link href="/admin">Return to admin</Link>
      </main>
    );
  }

  const enquiryIds = (data ?? []).map((enquiry) => enquiry.id);
  const [paymentResult, attachmentResult] = enquiryIds.length
    ? await Promise.all([
        supabase
          .from("additional_service_enquiry_payments")
          .select("id, enquiry_id, amount_inr, payment_method, payment_reference, verified_at")
          .in("enquiry_id", enquiryIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("additional_service_enquiry_attachments")
          .select("id, enquiry_id, object_path, original_filename")
          .in("enquiry_id", enquiryIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (paymentResult.error || attachmentResult.error) {
    console.error(
      "Additional service enquiry detail load failed:",
      paymentResult.error?.code,
      attachmentResult.error?.code
    );
    return (
      <main className="admin-access-message">
        <h1>Enquiry details unavailable</h1>
        <p>Could not load the separate payment or attachment records. No enquiry data was changed.</p>
        <Link href="/admin">Return to admin</Link>
      </main>
    );
  }

  const attachmentRows = await Promise.all(
    (attachmentResult.data ?? []).map(async (attachment) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from("additional-service-enquiries")
        .createSignedUrl(attachment.object_path, 600);
      if (signedError) {
        console.error("Additional enquiry signed attachment URL failed:", signedError.message);
      }
      return {
        id: attachment.id,
        enquiry_id: attachment.enquiry_id,
        original_filename: attachment.original_filename,
        signed_url: signed?.signedUrl ?? null,
      };
    })
  );

  const enquiries: AdminEnquiry[] = (data ?? []).map((enquiry) => ({
    ...enquiry,
    service_details: enquiry.service_details as Record<string, unknown>,
    payments: (paymentResult.data ?? [])
      .filter((payment) => payment.enquiry_id === enquiry.id)
      .map(({ id, amount_inr, payment_method, payment_reference, verified_at }) => ({
        id,
        amount_inr,
        payment_method,
        payment_reference,
        verified_at,
      })),
    attachments: attachmentRows
      .filter((attachment) => attachment.enquiry_id === enquiry.id)
      .map(({ id, original_filename, signed_url }) => ({ id, original_filename, signed_url })),
  }));

  return <AdminAdditionalEnquiries initialEnquiries={enquiries} adminEmail={auth.user.email ?? ""} />;
}
