import Link from "next/link";
import { AdminMembershipEnquiries } from "@/components/AdminMembershipEnquiries";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMembershipEnquiriesPage() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return (
      <main className="admin-access-message">
        <h1>Sign in required</h1>
        <p>Sign in to KitKleen admin to view membership enquiries.</p>
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
    .from("membership_enquiries")
    .select("id,customer_name,customer_mobile,customer_email,plan_id,message,enquiry_status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Membership enquiry admin load failed:", error.code);
    return (
      <main className="admin-access-message">
        <h1>Enquiry queue unavailable</h1>
        <p>The membership enquiry schema may not have been applied yet.</p>
        <Link href="/admin">Return to admin</Link>
      </main>
    );
  }

  return (
    <main>
      <div className="shell" style={{ paddingTop: 24 }}>
        <Link className="btn btn-secondary" href="/admin">Back to booking operations</Link>
      </div>
      <AdminMembershipEnquiries initialEnquiries={data ?? []} />
    </main>
  );
}
