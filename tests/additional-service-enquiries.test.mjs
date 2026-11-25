import assert from "node:assert/strict";
import test from "node:test";
import {
  additionalServiceIds,
  calculateJerseyAdjustment,
  parseAdditionalEnquiry,
} from "../lib/additionalServiceEnquiries.ts";

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
