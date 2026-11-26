"use client";

import { useState } from "react";

type MembershipEnquiry = {
  id: string;
  customer_name: string;
  customer_mobile: string;
  customer_email: string | null;
  plan_id: string;
  message: string;
  enquiry_status: "submitted" | "reviewing" | "contacted" | "closed";
  created_at: string;
};

const statuses: MembershipEnquiry["enquiry_status"][] = [
  "submitted",
  "reviewing",
  "contacted",
  "closed",
];

export function AdminMembershipEnquiries({
  initialEnquiries,
}: {
  initialEnquiries: MembershipEnquiry[];
}) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  async function updateStatus(id: string, status: MembershipEnquiry["enquiry_status"]) {
    setPendingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/membership-enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("id" in result) ||
        !("enquiry_status" in result) ||
        result.enquiry_status !== status
      ) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "The enquiry status could not be updated.";
        setError(message);
        return;
      }
      setEnquiries((current) =>
        current.map((enquiry) =>
          enquiry.id === id
            ? { ...enquiry, enquiry_status: status }
            : enquiry
        )
      );
    } catch {
      setError("The enquiry status could not be updated. Check your connection and try again.");
    } finally {
      setPendingId("");
    }
  }

  return (
    <section className="section section-light">
      <div className="shell">
        <div className="section-title">
          <div>
            <div className="eyebrow">Admin operations</div>
            <h2>Membership enquiries</h2>
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        {enquiries.length === 0 ? (
          <div className="empty-state"><h2>No enquiries yet</h2><p>Guest membership enquiries will appear here.</p></div>
        ) : (
          <div className="product-grid">
            {enquiries.map((enquiry) => (
              <article className="form-card" key={enquiry.id}>
                <div className="eyebrow">{enquiry.plan_id}</div>
                <p>Guest enquiry</p>
                <p>Customer: {enquiry.customer_name}</p>
                <p>{enquiry.message}</p>
                <p>Mobile: <a href={`tel:${enquiry.customer_mobile}`}>{enquiry.customer_mobile}</a></p>
                {enquiry.customer_email && <p>Email: <a href={`mailto:${enquiry.customer_email}`}>{enquiry.customer_email}</a></p>}
                <p>{new Date(enquiry.created_at).toLocaleString("en-IN")}</p>
                <label htmlFor={`membership-status-${enquiry.id}`}>Status</label>
                <select
                  id={`membership-status-${enquiry.id}`}
                  value={enquiry.enquiry_status}
                  disabled={pendingId === enquiry.id}
                  onChange={(event) => {
                    const selected = statuses.find((status) => status === event.target.value);
                    if (selected) void updateStatus(enquiry.id, selected);
                  }}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
