"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  beginMembershipSubmission,
  completeMembershipSubmission,
  createMembershipSubmissionState,
  finishMembershipSubmission,
} from "@/lib/membershipSubmissionIdempotency";

export function MembershipEnquiryForm({ planId }: { planId: string }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const submissionState = useRef(createMembershipSubmissionState());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 1 || trimmedMessage.length > 2000) {
      setError("Enter a message of up to 2,000 characters.");
      return;
    }

    const submission = {
      planId,
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      message: trimmedMessage,
    };
    const idempotencyKey = beginMembershipSubmission(
      submissionState.current,
      JSON.stringify(submission)
    );
    if (!idempotencyKey) return;

    setPending(true);
    try {
      const response = await fetch("/api/membership-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submission, idempotencyKey }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" || !("id" in result)) {
        const errorMessage =
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Your enquiry could not be submitted. Please try again.";
        setError(errorMessage);
        return;
      }
      completeMembershipSubmission(submissionState.current);
      setSuccess(true);
      setMessage("");
      router.refresh();
    } catch {
      setError("Your enquiry could not be submitted. Check your connection and try again.");
    } finally {
      finishMembershipSubmission(submissionState.current);
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="empty-state" role="status">
        <h2>Enquiry received</h2>
        <p>Your expression of interest has been recorded. Membership plans are not yet available for purchase.</p>
        <a className="btn btn-primary" href="/subscriptions">Back to memberships</a>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <label htmlFor="membership-customer-name">Your name</label>
      <input
        id="membership-customer-name"
        autoComplete="name"
        maxLength={120}
        value={customerName}
        onChange={(event) => setCustomerName(event.target.value)}
        required
      />
      <label htmlFor="membership-mobile">Mobile number</label>
      <input
        id="membership-mobile"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        maxLength={30}
        placeholder="+91 98765 43210"
        value={mobile}
        onChange={(event) => setMobile(event.target.value)}
        required
      />
      <label htmlFor="membership-email">Email (optional)</label>
      <input
        id="membership-email"
        type="email"
        autoComplete="email"
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <label htmlFor="membership-message">Tell us what you need</label>
      <textarea
        id="membership-message"
        maxLength={2000}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Share your gear-care routine, team size or questions."
        required
      />
      <button className="btn btn-primary form-submit" type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit membership enquiry"}
      </button>
      <p className="form-note">This is an enquiry only, not a subscription or purchase.</p>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
