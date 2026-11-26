export const additionalServiceIds = [
  "bat-repair",
  "glove-repair",
  "pads-repair",
  "leather-balls",
  "jerseys",
] as const;

export type AdditionalServiceId = (typeof additionalServiceIds)[number];
export type DistanceBand = "within" | "outside";
export type PaymentMethod = "upi" | "bank_transfer" | "cash" | "other";

export type ParsedAdditionalEnquiry = {
  serviceCategory: AdditionalServiceId;
  customerName: string;
  mobile: string;
  email: string | null;
  location: string;
  serviceDetails: Record<string, string | number | boolean | null>;
  amountDueInr: number | null;
  photo: File | null;
};

const ballTiers = [350, 450, 550] as const;
const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const maximumPhotoBytes = 5 * 1024 * 1024;

export function calculateJerseyAdjustment(upfrontFee: number, quantity: number) {
  const fee = Number.isFinite(upfrontFee) ? Math.max(0, Math.floor(upfrontFee)) : 0;
  const jerseys = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
  const adjustment = Math.min(20 * jerseys, fee);
  return { adjustment, expiredAmount: fee - adjustment };
}

function isAdditionalServiceId(value: unknown): value is AdditionalServiceId {
  return typeof value === "string" && additionalServiceIds.some((id) => id === value);
}

function requiredText(formData: FormData, key: string, maximumLength = 500) {
  const value = formData.get(key);
  if (typeof value !== "string") throw new Error(`Enter ${key}.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maximumLength) {
    throw new Error(`Enter ${key} using no more than ${maximumLength} characters.`);
  }
  return trimmed;
}

function optionalText(formData: FormData, key: string, maximumLength = 254) {
  const value = formData.get(key);
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`Enter a valid ${key}.`);
  const trimmed = value.trim();
  if (trimmed.length > maximumLength) throw new Error(`${key} is too long.`);
  return trimmed || null;
}

function positiveInteger(formData: FormData, key: string, minimum: number) {
  const value = formData.get(key);
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(`Enter a valid ${key}.`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) {
    throw new Error(`${key} must be at least ${minimum}.`);
  }
  return number;
}

function distanceBand(formData: FormData, key: string): DistanceBand {
  const value = formData.get(key);
  if (value !== "within" && value !== "outside") {
    throw new Error("Select the applicable distance.");
  }
  return value;
}

function parsePhoto(formData: FormData) {
  const value = formData.get("photo");
  if (value === null || typeof value === "string") {
    if (value === null || value === "") return null;
    throw new Error("Choose a valid photo.");
  }
  if (value.size === 0) return null;
  if (!allowedPhotoTypes.includes(value.type)) {
    throw new Error("Use a JPEG, PNG or WebP photo.");
  }
  if (value.size > maximumPhotoBytes) {
    throw new Error("The photo must be 5 MB or smaller.");
  }
  return value;
}

export function parseAdditionalEnquiry(formData: FormData): ParsedAdditionalEnquiry {
  const serviceCategory = formData.get("serviceCategory");
  if (!isAdditionalServiceId(serviceCategory)) throw new Error("Select a valid additional service.");

  const customerName = requiredText(formData, "customerName", 120);
  const mobile = requiredText(formData, "mobile", 30);
  if (!/^[0-9+()\- ]{7,18}$/.test(mobile)) throw new Error("Enter a valid mobile number.");
  const email = optionalText(formData, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  const location = requiredText(formData, "location", 240);
  const photo = parsePhoto(formData);
  let serviceDetails: ParsedAdditionalEnquiry["serviceDetails"];
  let amountDueInr: number | null;

  if (
    serviceCategory === "bat-repair" ||
    serviceCategory === "glove-repair" ||
    serviceCategory === "pads-repair"
  ) {
    serviceDetails = {
      equipmentDetails: requiredText(formData, "equipmentDetails", 300),
      repairDescription: requiredText(formData, "repairDescription", 2000),
      repairQuoteInr: null,
    };
    amountDueInr = 99;
  } else if (serviceCategory === "leather-balls") {
    const colour = formData.get("ballColour");
    if (colour !== "red" && colour !== "white") {
      throw new Error("Select red or white leather balls.");
    }
    const rawTier = formData.get("ballTier");
    const tierValue = typeof rawTier === "string" ? Number(rawTier) : Number.NaN;
    if (!ballTiers.some((tier) => tier === tierValue)) {
      throw new Error("Select a valid indicative ball price tier.");
    }
    const quantity = positiveInteger(formData, "ballQuantity", 2);
    const distance = distanceBand(formData, "ballDistance");
    const estimatedProductTotalInr = tierValue * quantity;
    if (!Number.isSafeInteger(estimatedProductTotalInr)) {
      throw new Error("The selected ball quantity is too large.");
    }
    serviceDetails = {
      colour,
      indicativePricePerBallInr: tierValue,
      quantity,
      deliveryDistance: distance,
      estimatedProductTotalInr,
      deliveryFeeInr: distance === "within" ? 99 : null,
      deliveryRequiresManualConfirmation: distance === "outside",
    };
    amountDueInr = null;
  } else {
    const quantity = positiveInteger(formData, "jerseyQuantity", 0);
    const distance = distanceBand(formData, "jerseyDistance");
    const designDetails = requiredText(formData, "designDetails", 2000);
    const upfrontFeeInr = distance === "within" ? 99 : 199;
    const adjustment = calculateJerseyAdjustment(upfrontFeeInr, quantity);
    serviceDetails = {
      distance,
      quantityRequested: quantity,
      designDetails,
      upfrontSampleDesignFeeInr: upfrontFeeInr,
      eligibleAdjustmentPreviewInr: adjustment.adjustment,
      expiredUnusedBalancePreviewInr: adjustment.expiredAmount,
      jerseyPriceInr: null,
    };
    amountDueInr = upfrontFeeInr;
  }

  return {
    serviceCategory,
    customerName,
    mobile,
    email,
    location,
    serviceDetails,
    amountDueInr,
    photo,
  };
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "upi" || value === "bank_transfer" || value === "cash" || value === "other";
}
