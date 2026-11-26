import assert from "node:assert/strict";
import test from "node:test";
import {
  additionalServiceIds,
  calculateJerseyAdjustment,
  parseAdditionalEnquiry,
} from "../lib/additionalServiceEnquiries.ts";
import {
  InvalidBookingRequestError,
  parsePublicBookingSubmission,
  readBoundedJsonRequest,
  RequestBodyTooLargeError,
} from "../lib/bookingSubmission.ts";

function createForm(serviceCategory, fields = {}) {
  const form = new FormData();
  form.set("serviceCategory", serviceCategory);
  form.set("customerName", "Asha Customer");
  form.set("mobile", "9876543210");
  form.set("email", "asha@example.com");
  form.set("location", "Bengaluru");
  for (const [key, value] of Object.entries(fields)) form.set(key, String(value));
  return form;
}

test("repair categories persist independent details and the inspection fee", () => {
  const descriptions = [
    ["bat-repair", "Bat", "Cracked toe"],
    ["glove-repair", "Gloves", "Broken stitching"],
    ["pads-repair", "Pads", "Loose strap"],
  ];

  for (const [category, equipmentDetails, repairDescription] of descriptions) {
    const enquiry = parseAdditionalEnquiry(createForm(category, {
      equipmentDetails,
      repairDescription,
    }));
    assert.equal(enquiry.serviceCategory, category);
    assert.equal(enquiry.serviceDetails.equipmentDetails, equipmentDetails);
    assert.equal(enquiry.serviceDetails.repairDescription, repairDescription);
    assert.equal(enquiry.amountDueInr, 99);
    assert.equal(enquiry.photo, null);
  }
});

test("ball enquiries enforce two balls and keep outside-10-km delivery unpriced", () => {
  const base = {
    ballColour: "white",
    ballTier: 450,
    ballDistance: "outside",
  };
  assert.throws(
    () => parseAdditionalEnquiry(createForm("leather-balls", { ...base, ballQuantity: 1 })),
    /at least 2/
  );

  const enquiry = parseAdditionalEnquiry(
    createForm("leather-balls", { ...base, ballQuantity: 2 })
  );
  assert.equal(enquiry.serviceDetails.estimatedProductTotalInr, 900);
  assert.equal(enquiry.serviceDetails.deliveryFeeInr, null);
  assert.equal(enquiry.serviceDetails.deliveryRequiresManualConfirmation, true);
  assert.equal(enquiry.amountDueInr, null);
});

test("jersey visit fees and capped adjustment examples match the agreed policy", () => {
  const examples = [
    [99, 3, 60, 39],
    [99, 5, 99, 0],
    [199, 5, 100, 99],
    [199, 10, 199, 0],
  ];

  for (const [fee, quantity, adjustment, expiredAmount] of examples) {
    const result = calculateJerseyAdjustment(fee, quantity);
    assert.deepEqual(result, { adjustment, expiredAmount });
  }

  const enquiry = parseAdditionalEnquiry(createForm("jerseys", {
    jerseyDistance: "outside",
    jerseyQuantity: 5,
    designDetails: "Player name and number printing",
  }));
  assert.equal(enquiry.amountDueInr, 199);
  assert.equal(enquiry.serviceDetails.eligibleAdjustmentPreviewInr, 100);
  assert.equal(enquiry.serviceDetails.expiredUnusedBalancePreviewInr, 99);
});

test("every additional service has its own supported category", () => {
  assert.equal(new Set(additionalServiceIds).size, 5);
  assert.deepEqual(additionalServiceIds, [
    "bat-repair",
    "glove-repair",
    "pads-repair",
    "leather-balls",
    "jerseys",
  ]);
});

test("booking submission recalculates package prices and totals from the server catalogue", () => {
  const result = parsePublicBookingSubmission({
    mode: "package",
    customer: {
      name: "Asha Customer",
      mobile: "9876543210",
      email: "asha@example.com",
      location: "Bengaluru",
      date: "2026-12-01",
      notes: null,
    },
    items: [{
      kind: "package",
      packageId: "batting-kit",
      careLevelId: "fresh",
      quantity: 1,
    }],
  });
  assert.equal(result.booking.estimated_total, 299);
  assert.equal(result.booking.service_type, "Cricket Kit · KITKLEEN Fresh");
  assert.equal(result.items[0].unit_price, 299);
  assert.equal(result.items[0].total_price, 299);
});

test("booking submission rejects forged prices, invalid dates, and incompatible booking modes", () => {
  const valid = {
    mode: "package",
    customer: {
      name: "Asha Customer",
      mobile: "9876543210",
      email: null,
      location: "Bengaluru",
      date: "2026-12-01",
      notes: null,
    },
    items: [{
      kind: "package",
      packageId: "batting-kit",
      careLevelId: "fresh",
      quantity: 1,
    }],
  };
  assert.throws(
    () => parsePublicBookingSubmission({
      ...valid,
      customer: { ...valid.customer, date: "2026-02-30" },
    }),
    InvalidBookingRequestError
  );
  assert.throws(
    () => parsePublicBookingSubmission({
      ...valid,
      customer: { ...valid.customer, date: "2000-01-01" },
    }),
    InvalidBookingRequestError
  );
  assert.throws(
    () => parsePublicBookingSubmission({
      ...valid,
      items: [{ ...valid.items[0], unit_price: 1 }],
    }),
    InvalidBookingRequestError
  );
  assert.throws(
    () => parsePublicBookingSubmission({
      ...valid,
      items: [{ ...valid.items[0], quantity: 2 }],
    }),
    InvalidBookingRequestError
  );
});

test("booking JSON request reader rejects malformed and oversized streamed bodies", async () => {
  const request = (body) => new Request("https://kitkleen.test/api/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  await assert.rejects(
    readBoundedJsonRequest(request('{"booking":'), 1024),
    InvalidBookingRequestError
  );
  await assert.rejects(
    readBoundedJsonRequest(request("x".repeat(33)), 32),
    RequestBodyTooLargeError
  );
});
