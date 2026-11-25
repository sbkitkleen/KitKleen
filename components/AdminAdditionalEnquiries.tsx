"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PaymentRecord = {
  id: string;
  amount_inr: number;
  payment_method: string;
  payment_reference: string;
  verified_at: string;
};

type Attachment = {
  id: string;
  original_filename: string;
  signed_url: string | null;
};

type WorkflowUpdate = Pick<
  AdminEnquiry,
  "enquiry_status" | "order_status" | "payment_status" | "amount_due_inr" | "updated_at"
>;

type PaymentUpdate = Pick<AdminEnquiry, "payment_status" | "amount_due_inr" | "payments">;

export type AdminEnquiry = {
  id: string;
  enquiry_reference: string;
  service_category: string;
  service_details: Record<string, unknown>;
  customer_name: string;
  mobile: string;
  email: string | null;
  location: string;
  amount_due_inr: number | null;
  enquiry_status: string;
  order_status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  payments: PaymentRecord[];
  attachments: Attachment[];
};

type RecordedPaymentResponse = {
  recorded: true;
  payment: { id: string; status: string };
  enquiry?: PaymentUpdate;
  refreshWarning?: string;
};

const enquiryStatuses = [
  ["new", "New"],
  ["reviewing", "Reviewing"],
  ["awaiting_customer", "Awaiting customer"],
  ["closed", "Closed"],
];
const orderStatuses = [
  ["not_started", "Not started"],
  ["awaiting_inspection", "Awaiting inspection"],
  ["awaiting_quote", "Awaiting quote"],
  ["quote_sent", "Quote sent"],
  ["confirmed", "Confirmed"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isWorkflowUpdate(value: unknown): value is WorkflowUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const update = value as Record<string, unknown>;
  return typeof update.enquiry_status === "string" &&
    typeof update.order_status === "string" &&
    typeof update.payment_status === "string" &&
    (update.amount_due_inr === null || typeof update.amount_due_inr === "number") &&
    typeof update.updated_at === "string";
}

function isPaymentUpdate(value: unknown): value is PaymentUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const update = value as Record<string, unknown>;
  return (update.amount_due_inr === null || typeof update.amount_due_inr === "number") &&
    typeof update.payment_status === "string" &&
    Array.isArray(update.payments) &&
    update.payments.every((payment) => {
      if (!payment || typeof payment !== "object" || Array.isArray(payment)) return false;
      const record = payment as Record<string, unknown>;
      return typeof record.id === "string" &&
        typeof record.amount_inr === "number" &&
        typeof record.payment_method === "string" &&
        typeof record.payment_reference === "string" &&
        typeof record.verified_at === "string";
    });
}

function isRecordedPaymentResponse(value: unknown): value is RecordedPaymentResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (result.recorded !== true || !result.payment || typeof result.payment !== "object") return false;
  const payment = result.payment as Record<string, unknown>;
  return typeof payment.id === "string" &&
    typeof payment.status === "string" &&
    (result.enquiry === undefined || isPaymentUpdate(result.enquiry)) &&
    (result.refreshWarning === undefined || typeof result.refreshWarning === "string");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayDetail(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function EnquiryCard({
  baseEnquiry,
  update,
  onUpdated,
  onPaymentUpdated,
}: {
  baseEnquiry: AdminEnquiry;
  update?: Partial<AdminEnquiry>;
  onUpdated: (updated: WorkflowUpdate) => void;
  onPaymentUpdated: (updated: PaymentUpdate) => void;
}) {
  const enquiry = useMemo(() => ({ ...baseEnquiry, ...update }), [baseEnquiry, update]);
  const router = useRouter();
  const [enquiryStatus, setEnquiryStatus] = useState(enquiry.enquiry_status);
  const [orderStatus, setOrderStatus] = useState(enquiry.order_status);
  const [amountDue, setAmountDue] = useState(
    enquiry.amount_due_inr === null ? "" : String(enquiry.amount_due_inr)
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const paymentInFlight = useRef(false);
  const [previousEnquiry, setPreviousEnquiry] = useState(enquiry);

  if (previousEnquiry !== enquiry) {
    setPreviousEnquiry(enquiry);
    setEnquiryStatus(enquiry.enquiry_status);
    setOrderStatus(enquiry.order_status);
    setAmountDue(enquiry.amount_due_inr === null ? "" : String(enquiry.amount_due_inr));
  }

  async function saveWorkflow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/additional-service-enquiries/${enquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enquiryStatus,
          orderStatus,
          amountDueInr: amountDue === "" ? null : Number(amountDue),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isWorkflowUpdate(result)) {
        const message = result && typeof result === "object" && "error" in result &&
          typeof result.error === "string" ? result.error : "The enquiry could not be updated.";
        throw new Error(message);
      }
      onUpdated(result);
      setEnquiryStatus(result.enquiry_status);
      setOrderStatus(result.order_status);
      setAmountDue(result.amount_due_inr === null ? "" : String(result.amount_due_inr));
      setNotice("Enquiry updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The enquiry could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paymentInFlight.current) return;
    paymentInFlight.current = true;
    setBusy(true);
    setNotice("");
    setPaymentError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/additional-service-enquiries/${enquiry.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInr: Number(formData.get("amountInr")),
          method: formData.get("method"),
          reference: formData.get("reference"),
          confirmed: formData.get("confirmed") === "on",
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result &&
          typeof result.error === "string" ? result.error : "The payment could not be recorded.";
        throw new Error(message);
      }
      if (!isRecordedPaymentResponse(result)) {
        throw new Error("The payment could not be confirmed as recorded. Refresh the page to check its status.");
      }
      if (result.enquiry) onPaymentUpdated(result.enquiry);
      setPaymentError("");
      setNotice(result.refreshWarning ?? "Verified payment recorded.");
      router.refresh();
    } catch (error) {
      setNotice("");
      setPaymentError(error instanceof Error ? error.message : "The payment could not be recorded.");
    } finally {
      paymentInFlight.current = false;
      setBusy(false);
    }
  }

  const totalPaid = enquiry.payments.reduce((total, payment) => total + payment.amount_inr, 0);
  const remainingBalance = enquiry.amount_due_inr === null
    ? null
    : Math.max(0, enquiry.amount_due_inr - totalPaid);

  return (
    <article className="additional-admin-card">
      <header className="additional-admin-card-heading">
        <div>
          <span className="additional-admin-reference">{enquiry.enquiry_reference}</span>
          <h2>{titleCase(enquiry.service_category)}</h2>
        </div>
        <time dateTime={enquiry.created_at}>{formatDate(enquiry.created_at)}</time>
      </header>

      <section className="additional-admin-customer" aria-label="Customer details">
        <div><span>Customer</span><strong>{enquiry.customer_name}</strong></div>
        <div><span>Mobile</span><a href={`tel:${enquiry.mobile}`}>{enquiry.mobile}</a></div>
        <div><span>Email</span><strong>{enquiry.email || "Not supplied"}</strong></div>
        <div><span>Location</span><strong>{enquiry.location}</strong></div>
      </section>

      <section className="additional-admin-details">
        <h3>Enquiry details</h3>
        <dl>
          {Object.entries(enquiry.service_details).map(([key, value]) => (
            <div key={key}>
              <dt>{titleCase(key)}</dt>
              <dd>{typeof value === "number" && key.toLowerCase().includes("inr") ? `₹${value}` : displayDetail(value)}</dd>
            </div>
          ))}
        </dl>
        <p><strong>Current amount due:</strong> {enquiry.amount_due_inr === null ? "Pending manual confirmation" : `₹${enquiry.amount_due_inr}`}</p>
        {enquiry.attachments.length > 0 && (
          <div className="additional-admin-attachments">
            <h4>Supporting photos</h4>
            {enquiry.attachments.map((attachment) => attachment.signed_url ? (
              <a href={attachment.signed_url} target="_blank" rel="noreferrer" key={attachment.id}>
                {attachment.original_filename}
              </a>
            ) : (
              <span key={attachment.id}>{attachment.original_filename} (preview unavailable)</span>
            ))}
          </div>
        )}
      </section>

      <section className="additional-admin-status">
        <h3>Enquiry, order and payment status</h3>
        <div className="additional-admin-status-pills">
          <span>Enquiry: <strong>{titleCase(enquiry.enquiry_status)}</strong></span>
          <span>Order: <strong>{titleCase(enquiry.order_status)}</strong></span>
          <span>Payment: <strong>{titleCase(enquiry.payment_status)}</strong></span>
        </div>
        <form className="additional-admin-workflow" onSubmit={saveWorkflow}>
          <label>
            Enquiry status
            <select value={enquiryStatus} onChange={(event) => setEnquiryStatus(event.target.value)}>
              {enquiryStatuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Order status
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
              {orderStatuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Total amount due (₹)
            <input
              type="number"
              min={0}
              step={1}
              value={amountDue}
              onChange={(event) => setAmountDue(event.target.value)}
              placeholder="Leave blank if not yet confirmed"
            />
            <span className="additional-admin-field-hint">
              For an order quote, include the upfront fee and any remaining balance after the agreed adjustment. Verified payments count toward this total.
            </span>
          </label>
          <button type="submit" className="view-button" disabled={busy}>Save enquiry status</button>
        </form>

        {enquiry.payments.length > 0 && (
          <ul className="additional-admin-payments">
            {enquiry.payments.map((payment) => (
              <li key={payment.id}>
                ₹{payment.amount_inr} · {titleCase(payment.payment_method)} · {payment.payment_reference} · verified {formatDate(payment.verified_at)}
              </li>
            ))}
          </ul>
        )}
        {enquiry.payments.length === 0 && (
          <p className="additional-admin-payments-empty">No verified payments recorded.</p>
        )}
        <p className="additional-admin-balance">
          <strong>Remaining balance:</strong>{" "}
          {remainingBalance === null ? "Pending amount confirmation" : `₹${remainingBalance}`}
        </p>
        {enquiry.amount_due_inr !== null && enquiry.amount_due_inr > 0 && enquiry.payment_status !== "paid" && (
          <form className="additional-admin-payment-form" onSubmit={recordPayment}>
            <strong>Record a verified payment</strong>
            <p>This records an offline payment only. Verify receipt independently; no gateway is connected.</p>
            <label>
              Amount (₹)
              <input
                name="amountInr"
                type="number"
                min={1}
                max={Math.max(
                  0,
                  enquiry.amount_due_inr -
                    enquiry.payments.reduce((total, payment) => total + payment.amount_inr, 0)
                )}
                step={1}
                required
              />
            </label>
            <label>
              Method
              <select name="method" defaultValue="upi">
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Receipt / transaction reference
              <input name="reference" maxLength={120} required />
            </label>
            <label className="additional-admin-confirm">
              <input name="confirmed" type="checkbox" required />
              I have independently verified this payment.
            </label>
            <button type="submit" className="view-button" disabled={busy}>Record payment</button>
          </form>
        )}
        {notice && <p className="additional-admin-notice" role="status">{notice}</p>}
        {paymentError && <p className="additional-admin-error" role="alert">{paymentError}</p>}
      </section>
    </article>
  );
}

export function AdminAdditionalEnquiries({
  initialEnquiries,
  adminEmail,
}: {
  initialEnquiries: AdminEnquiry[];
  adminEmail: string;
}) {
  const [localUpdates, setLocalUpdates] = useState<{
    source: AdminEnquiry[];
    values: Map<string, Partial<AdminEnquiry>>;
  }>(() => ({ source: initialEnquiries, values: new Map() }));
  const updates = localUpdates.source === initialEnquiries ? localUpdates.values : undefined;

  function updateEnquiry(id: string, update: Partial<AdminEnquiry>) {
    setLocalUpdates((current) => {
      const values = current.source === initialEnquiries
        ? new Map(current.values)
        : new Map<string, Partial<AdminEnquiry>>();
      values.set(id, { ...values.get(id), ...update });
      return { source: initialEnquiries, values };
    });
  }

  return (
    <main className="admin-page additional-admin-page">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link className="admin-brand-block" href="/admin">
            <span className="admin-brand-name">KIT<span>KLEEN</span></span>
            <span className="admin-brand-title">Additional service enquiries</span>
          </Link>
          <div className="admin-account">
            <span className="admin-account-email">{adminEmail}</span>
          <Link className="view-button" href="/admin">Back to bookings</Link>
          </div>
        </div>
      </header>
      <div className="admin-content">
        <section className="page-heading">
          <div>
            <span className="page-kicker">Separate enquiry queue</span>
            <h1>Additional Services</h1>
            <p>Repair, cricket ball and jersey enquiries are stored separately from cleaning bookings.</p>
          </div>
          <span className="queue-indicator"><span /> {initialEnquiries.length} enquiries shown</span>
        </section>
        {initialEnquiries.length === 0 ? (
          <section className="bookings-panel empty-state">
            <h3>No additional enquiries yet</h3>
            <p>Submitted enquiries will appear here after the approved database setup is applied.</p>
          </section>
        ) : (
          <section className="additional-admin-list" aria-label="Additional service enquiries">
            {initialEnquiries.map((enquiry) => (
              <EnquiryCard
                key={enquiry.id}
                baseEnquiry={enquiry}
                update={updates?.get(enquiry.id)}
                onUpdated={(update) => updateEnquiry(enquiry.id, update)}
                onPaymentUpdated={(update) => updateEnquiry(enquiry.id, update)}
              />
            ))}
          </section>
        )}
      </div>
      <footer className="additional-admin-footer">
        Payments are only recorded after independent verification. This dashboard does not collect payments.
      </footer>
    </main>
  );
}
