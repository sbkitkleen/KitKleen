import Link from "next/link";
import { redirect } from "next/navigation";
import { MembershipEnquiryForm } from "@/components/MembershipEnquiryForm";
import { isValidMembershipPlan } from "@/lib/membershipEnquiries";

const planNames: Record<string, string> = {
  "player-care": "Player Care",
  "pro-player": "Pro Player",
  "club-academy": "Club & Academy",
};

export default async function MembershipEnquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan = "" } = await searchParams;
  if (!isValidMembershipPlan(plan)) redirect("/subscriptions");

  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <div className="crumb"><Link href="/subscriptions">KitKleen / Memberships</Link> / Enquiry</div>
          <div className="eyebrow">Membership enquiry</div>
          <h1>{planNames[plan]}<br /><em>membership interest.</em></h1>
          <p>Share your contact details and care requirements. No account or OTP is needed; our Admin team can follow up while plans are being finalised.</p>
        </div>
      </section>
      <section className="section section-light">
        <div className="shell auth-wrap">
          <MembershipEnquiryForm planId={plan} />
        </div>
      </section>
    </main>
  );
}
