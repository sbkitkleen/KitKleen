"use client";

import { useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa6";
import {
  calculateJerseyAdjustment,
  type AdditionalServiceId,
  type DistanceBand,
} from "@/lib/additionalServiceEnquiries";

type Offering = {
  id: AdditionalServiceId;
  title: string;
  description: string;
  price: string;
};

const offerings: Offering[] = [
  {
    id: "bat-repair",
    title: "Bat Repairs",
    description: "₹99 upfront inspection, adjusted against the final repair order.",
    price: "₹99",
  },
  {
    id: "glove-repair",
    title: "Glove Repairs",
    description: "₹99 upfront inspection, adjusted against the final repair order.",
    price: "₹99",
  },
  {
    id: "pads-repair",
    title: "Pads Repairs",
    description: "₹99 upfront inspection, adjusted against the final repair order.",
    price: "₹99",
  },
  {
    id: "leather-balls",
    title: "Leather Cricket Balls",
    description: "Red or white leather · minimum order of 2 balls.",
    price: "₹350 / ₹450 / ₹550",
  },
  {
    id: "jerseys",
    title: "Jerseys",
    description: "Sample/design visit · ₹99 within 10 km / ₹199 beyond.",
    price: "₹99 / ₹199",
  },
];

const ballTiers = [350, 450, 550] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function AdditionalServiceEnquiryForm({
  offering,
  onClose,
}: {
  offering: Offering;
  onClose: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [equipmentDetails, setEquipmentDetails] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [ballColour, setBallColour] = useState<"red" | "white">("red");
  const [ballTier, setBallTier] = useState<(typeof ballTiers)[number]>(350);
  const [ballQuantity, setBallQuantity] = useState("2");
  const [ballDistance, setBallDistance] = useState<DistanceBand | "">("");
  const [jerseyQuantity, setJerseyQuantity] = useState("0");
  const [jerseyDistance, setJerseyDistance] = useState<DistanceBand | "">("");
  const [designDetails, setDesignDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reference, setReference] = useState("");
  const idempotencyKey = useRef<string | null>(null);

  const isRepair = offering.id === "bat-repair" ||
    offering.id === "glove-repair" ||
    offering.id === "pads-repair";
  const ballCount = Number(ballQuantity);
  const ballSubtotal = Number.isSafeInteger(ballCount) && ballCount >= 2
    ? ballTier * ballCount
    : 0;
  const jerseyCount = Number(jerseyQuantity);
  const jerseyFee = jerseyDistance === "within" ? 99 : jerseyDistance === "outside" ? 199 : null;
  const jerseyPreview = calculateJerseyAdjustment(
    jerseyFee ?? 99,
    Number.isSafeInteger(jerseyCount) && jerseyCount >= 0 ? jerseyCount : 0
  );
  const repairPlaceholder = offering.id === "bat-repair"
    ? "Describe the bat damage or repair required."
    : offering.id === "glove-repair"
      ? "Describe the glove damage or repair required."
      : "Describe the pad damage or repair required.";

  async function submitEnquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    const submissionKey = idempotencyKey.current ?? crypto.randomUUID();
    idempotencyKey.current = submissionKey;
    const formData = new FormData(event.currentTarget);
    formData.set("idempotencyKey", submissionKey);

    try {
      const response = await fetch("/api/additional-service-enquiries", {
        method: "POST",
        body: formData,
      });
      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new Error("The enquiry could not be saved. Please try again.");
      }
      if (!response.ok) {
        const message = isRecord(result) && typeof result.error === "string"
          ? result.error
          : "The enquiry could not be saved. Please try again.";
        throw new Error(message);
      }
      if (!isRecord(result) || typeof result.reference !== "string") {
        throw new Error("The server did not confirm an enquiry reference.");
      }
      setReference(result.reference);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The enquiry could not be saved. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="service-selection-card additional-request-panel">
      <div className="additional-request-heading">
        <div>
          <div className="eyebrow">Independent enquiry</div>
          <h3>{offering.title}</h3>
        </div>
      </div>

      {reference ? (
        <div className="additional-submission-success" role="status">
          <strong>Enquiry saved</strong>
          <span>Reference: {reference}</span>
          <small>No payment was collected. The applicable fee is shown in this enquiry.</small>
        </div>
      ) : (
        <form
          className="additional-request-form"
          onSubmit={submitEnquiry}
          onChangeCapture={() => {
            idempotencyKey.current = null;
          }}
        >
          <input type="hidden" name="serviceCategory" value={offering.id} />
          <fieldset className="additional-form-fields" disabled={busy}>
            {isRepair && (
              <>
                <div className="additional-service-fields">
                  <label>
                    Equipment details *
                    <input
                      name="equipmentDetails"
                      required
                      maxLength={300}
                      value={equipmentDetails}
                      onChange={(event) => setEquipmentDetails(event.target.value)}
                      placeholder={`${offering.title.replace(/ Repairs$/, "")} brand/model or equipment details`}
                    />
                  </label>
                  <label>
                    Describe the repair required *
                    <textarea
                      name="repairDescription"
                      required
                      maxLength={2000}
                      rows={3}
                      value={repairDescription}
                      onChange={(event) => setRepairDescription(event.target.value)}
                      placeholder={repairPlaceholder}
                    />
                  </label>
                  <label className="additional-photo-field">
                    Optional photo
                    <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
                    <small>JPEG, PNG or WebP, up to 5 MB. The image is uploaded privately with this enquiry.</small>
                  </label>
                  <p className="additional-fee-notice">
                    <strong>
                      ₹99 inspection fee payable before inspection. This amount will be adjusted against the final repair order. Repair charges will be quoted after inspection.
                    </strong>{" "}
                    Payment is not collected through this enquiry form.
                  </p>
                </div>
              </>
            )}

            {offering.id === "leather-balls" && (
              <div className="additional-service-fields">
                <label>
                  Leather ball colour *
                  <select
                    name="ballColour"
                    value={ballColour}
                    onChange={(event) => {
                      if (event.target.value === "red" || event.target.value === "white") {
                        setBallColour(event.target.value);
                      }
                    }}
                  >
                    <option value="red">Red leather</option>
                    <option value="white">White leather</option>
                  </select>
                </label>
                <label>
                  Indicative price tier *
                  <select
                    name="ballTier"
                    value={ballTier}
                    onChange={(event) => {
                      const tier = ballTiers.find((value) => value === Number(event.target.value));
                      if (tier !== undefined) setBallTier(tier);
                    }}
                  >
                    {ballTiers.map((tier) => (
                      <option value={tier} key={tier}>₹{tier} per ball</option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity (minimum 2) *
                  <input
                    name="ballQuantity"
                    type="number"
                    min={2}
                    max={Math.floor(Number.MAX_SAFE_INTEGER / ballTier)}
                    step={1}
                    required
                    value={ballQuantity}
                    onChange={(event) => setBallQuantity(event.target.value)}
                  />
                </label>
                <fieldset className="additional-distance-field">
                  <legend>Delivery distance *</legend>
                  <label>
                    <input
                      required
                      type="radio"
                      name="ballDistance"
                      value="within"
                      checked={ballDistance === "within"}
                      onChange={() => setBallDistance("within")}
                    />
                    Within 10 km · ₹99 delivery
                  </label>
                  <label>
                    <input
                      required
                      type="radio"
                      name="ballDistance"
                      value="outside"
                      checked={ballDistance === "outside"}
                      onChange={() => setBallDistance("outside")}
                    />
                    More than 10 km
                  </label>
                </fieldset>
                <p className="additional-fee-notice">
                  Indicative product subtotal: ₹{ballSubtotal}
                  {ballDistance === "within" && ` + ₹99 delivery = ₹${ballSubtotal + 99}`}
                  {ballDistance === "outside" && " + delivery to be confirmed manually"}
                  . Minimum order is 2 balls. Specific variants and descriptions will be confirmed. No delivery fee or policy is assumed beyond 10 km.
                </p>
              </div>
            )}

            {offering.id === "jerseys" && (
              <div className="additional-service-fields">
                <label>
                  Number of jerseys *
                  <span className="additional-field-hint">
                    Enter 0 if you are enquiring about a visit without placing an order.
                  </span>
                  <input
                    name="jerseyQuantity"
                    type="number"
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    step={1}
                    required
                    value={jerseyQuantity}
                    onChange={(event) => setJerseyQuantity(event.target.value)}
                  />
                </label>
                <fieldset className="additional-distance-field">
                  <legend>Sample/design visit distance *</legend>
                  <label>
                    <input
                      required
                      type="radio"
                      name="jerseyDistance"
                      value="within"
                      checked={jerseyDistance === "within"}
                      onChange={() => setJerseyDistance("within")}
                    />
                    Within 10 km · ₹99 upfront
                  </label>
                  <label>
                    <input
                      required
                      type="radio"
                      name="jerseyDistance"
                      value="outside"
                      checked={jerseyDistance === "outside"}
                      onChange={() => setJerseyDistance("outside")}
                    />
                    More than 10 km · ₹199 upfront
                  </label>
                </fieldset>
                <label>
                  Design/customisation details *
                  <textarea
                    name="designDetails"
                    required
                    maxLength={2000}
                    rows={3}
                    value={designDetails}
                    onChange={(event) => setDesignDetails(event.target.value)}
                    placeholder="Describe the jersey printing or customisation you have in mind."
                  />
                </label>
                {jerseyFee !== null && (
                  <dl className="jersey-adjustment-preview">
                    <div><dt>Sample/design fee paid</dt><dd>₹0 — no payment collected</dd></div>
                    <div><dt>Sample/design fee due before visit</dt><dd>₹{jerseyFee}</dd></div>
                    <div><dt>Number of jerseys ordered</dt><dd>{jerseyCount}</dd></div>
                    <div><dt>Eligible adjustment preview if fee is paid</dt><dd>₹{jerseyPreview.adjustment}</dd></div>
                    <div><dt>Expired unused amount</dt><dd>₹{jerseyPreview.expiredAmount}</dd></div>
                    <div className="jersey-remaining">
                      <dt>Remaining amount payable</dt>
                      <dd>{jerseyCount ? `Quoted jersey order total − ₹${jerseyPreview.adjustment}` : "No order selected"}</dd>
                    </div>
                  </dl>
                )}
                <div className="additional-fee-notice additional-policy-notice">
                  <strong>Sample/design fee terms — please read before proceeding</strong>
                  <ul>
                    <li>₹99 upfront within 10 km; ₹199 upfront beyond 10 km. No payment is collected here.</li>
                    <li>After payment and a jersey order, the adjustment is ₹20 per jersey, capped at the upfront fee.</li>
                    <li>Any unused balance expires. It is not refundable, carried forward or transferable.</li>
                    <li>If no jersey order is placed, the upfront fee is non-refundable.</li>
                    <li>Jersey prices, designs and the size chart will be confirmed later.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="additional-customer-fields">
              <label>
                Full name *
                <input
                  name="customerName"
                  required
                  maxLength={120}
                  autoComplete="name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </label>
              <label>
                Mobile number *
                <input
                  name="mobile"
                  required
                  autoComplete="tel"
                  type="tel"
                  inputMode="tel"
                  pattern="[0-9+()\- ]{7,18}"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  autoComplete="email"
                  type="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                City / delivery location *
                <input
                  name="location"
                  required
                  maxLength={240}
                  autoComplete="address-level2"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>
            </div>

            <div className="additional-form-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Saving enquiry…" : "Save enquiry"} <span aria-hidden="true">→</span>
              </button>
              <small>
                No payment is collected. Your enquiry is saved separately for KitKleen to review.
              </small>
            </div>
          </fieldset>
          {errorMessage && <p className="additional-submission-error" role="alert">{errorMessage}</p>}
        </form>
      )}
      {reference && (
        <button className="additional-close-saved" type="button" onClick={onClose}>
          Close this enquiry
        </button>
      )}
    </div>
  );
}

export function AdditionalServices() {
  const [openServices, setOpenServices] = useState<AdditionalServiceId[]>([]);

  function toggleService(service: AdditionalServiceId) {
    setOpenServices((current) =>
      current.includes(service)
        ? current.filter((value) => value !== service)
        : [...current, service]
    );
  }

  return (
    <section className="additional-services" aria-labelledby="additional-services-heading">
      <div className="services-category-heading">
        <div>
          <div className="eyebrow">Beyond gear care</div>
          <h2 id="additional-services-heading">Additional <em>Services.</em></h2>
        </div>
        <span>5 services</span>
      </div>
      <p className="kit-packages-intro">
        Repairs, cricket balls and custom jerseys — enquire directly with our team.
        No upfront payment is collected through this page.
      </p>

      <div className="service-care-options additional-offerings">
        {offerings.map((offering) => {
          const expanded = openServices.includes(offering.id);
          const formId = `additional-enquiry-${offering.id}`;
          return (
            <div className={`additional-offering-row${expanded ? " is-expanded" : ""}`} key={offering.id}>
              <div className={`service-care-option${expanded ? " is-expanded" : ""}`}>
                <div className="service-care-copy">
                  <strong>{offering.title}</strong>
                  <small>{offering.description}</small>
                </div>
                <strong className="service-care-price">{offering.price}</strong>
                <button
                  className="care-add-button additional-enquire-button"
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={formId}
                  onClick={() => toggleService(offering.id)}
                >
                  {expanded ? "Close" : "Enquire"}
                  <FaChevronDown aria-hidden="true" />
                </button>
              </div>
              <div id={formId} hidden={!expanded}>
                <AdditionalServiceEnquiryForm
                  offering={offering}
                  onClose={() => toggleService(offering.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
