import { bags, careLevels, kitPackages, services, type CareLevelId } from "./data";

const gearCatalogue = [...services, ...bags];
const MAX_LINES = 50;
const MAX_QTY_PER_LINE = 100;
const MAX_TOTAL_QTY = 200;
const MAX_LINE_TOTAL_PAISE = 2_147_483_647;

export type OrderHandoverMethod = "pickup" | "customer_dropoff";
export type OrderPaymentPreference = "razorpay" | "upi" | "cash";

export type PricedOrderLine = {
  item_type: "gear" | "package";
  item_id: string;
  item_name: string;
  care_level: CareLevelId;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
};

export type ValidatedOrderSubmission = {
  customer: {
    name: string;
    mobile: string;
    email: string | null;
    location: string;
    delivery_address: string | null;
    pickup_instructions: string | null;
    notes: string | null;
  };
  handover: {
    method: OrderHandoverMethod;
    requested_at: string;
  };
  payment_preference: OrderPaymentPreference;
  items: PricedOrderLine[];
  subtotal_paise: number;
  currency_code: "INR";
};

export class InvalidOrderSubmissionError extends Error {
  constructor() {
    super("The order details are invalid.");
    this.name = "InvalidOrderSubmissionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function requiredText(value: unknown, max: number): string {
  if (typeof value !== "string") throw new InvalidOrderSubmissionError();
  const result = value.trim();
  if (!result || result.length > max) throw new InvalidOrderSubmissionError();
  return result;
}

function optionalText(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new InvalidOrderSubmissionError();
  const result = value.trim();
  if (result.length > max) throw new InvalidOrderSubmissionError();
  return result || null;
}

function isCareLevel(value: unknown): value is CareLevelId {
  return typeof value === "string" && careLevels.some((level) => level.id === value);
}

function parseRequestedAt(value: unknown): string {
  const text = requiredText(value, 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    throw new InvalidOrderSubmissionError();
  }
  const [datePart, timePart] = text.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    hour > 23 || minute > 59
  ) throw new InvalidOrderSubmissionError();
  return text;
}

/**
 * Accepts only stable product/package identifiers and quantities from the browser.
 * All names and prices are re-resolved from lib/data.ts on the server.
 * Amounts are returned in integer paise; GST/tax is deliberately not inferred.
 */
export function parsePublicOrderSubmission(value: unknown): ValidatedOrderSubmission {
  if (!isRecord(value) || !exactKeys(value, ["customer", "handover", "paymentPreference", "items"])) {
    throw new InvalidOrderSubmissionError();
  }

  const customer = value.customer;
  if (!isRecord(customer) || !exactKeys(customer, [
    "name", "mobile", "email", "location", "deliveryAddress", "pickupInstructions", "notes",
  ])) throw new InvalidOrderSubmissionError();

  const name = requiredText(customer.name, 120);
  const mobile = requiredText(customer.mobile, 18);
  if (!/^\+[1-9]\d{7,14}$/.test(mobile)) throw new InvalidOrderSubmissionError();

  const rawEmail = optionalText(customer.email, 254);
  const email = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;
  if (rawEmail && !email) throw new InvalidOrderSubmissionError();

  const location = requiredText(customer.location, 240);
  const deliveryAddress = optionalText(customer.deliveryAddress, 500);
  const pickupInstructions = optionalText(customer.pickupInstructions, 500);
  const notes = optionalText(customer.notes, 2000);

  const handover = value.handover;
  if (!isRecord(handover) || !exactKeys(handover, ["method", "requestedAt"])) {
    throw new InvalidOrderSubmissionError();
  }
  if (handover.method !== "pickup" && handover.method !== "customer_dropoff") {
    throw new InvalidOrderSubmissionError();
  }
  if (handover.method === "pickup" && !deliveryAddress) {
    throw new InvalidOrderSubmissionError();
  }

  const paymentPreference = value.paymentPreference;
  if (!["razorpay", "upi", "cash"].includes(String(paymentPreference))) {
    throw new InvalidOrderSubmissionError();
  }

  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > MAX_LINES) {
    throw new InvalidOrderSubmissionError();
  }

  const lines: PricedOrderLine[] = [];
  let totalQuantity = 0;
  let subtotalPaise = 0;

  for (const raw of value.items) {
    if (!isRecord(raw)) throw new InvalidOrderSubmissionError();

    if (raw.kind === "gear") {
      if (!exactKeys(raw, ["kind", "productId", "careLevelId", "qty"]) ||
          typeof raw.productId !== "string" || !isCareLevel(raw.careLevelId)) {
        throw new InvalidOrderSubmissionError();
      }
      const product = gearCatalogue.find((item) => item.id === raw.productId);
      if (!product) throw new InvalidOrderSubmissionError();
      const qty = raw.qty;
      if (typeof qty !== "number" || !Number.isSafeInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
        throw new InvalidOrderSubmissionError();
      }
      const unitPricePaise = product.prices[raw.careLevelId] * 100;
      const lineTotalPaise = unitPricePaise * qty;
      if (!Number.isSafeInteger(lineTotalPaise) || lineTotalPaise > MAX_LINE_TOTAL_PAISE) {
        throw new InvalidOrderSubmissionError();
      }
      lines.push({
        item_type: "gear", item_id: product.id, item_name: product.name,
        care_level: raw.careLevelId, quantity: qty,
        unit_price_paise: unitPricePaise, line_total_paise: lineTotalPaise,
      });
      totalQuantity += qty;
      subtotalPaise += lineTotalPaise;
      continue;
    }

    if (raw.kind === "package") {
      if (!exactKeys(raw, ["kind", "packageId", "careLevelId", "qty"]) ||
          typeof raw.packageId !== "string" || !isCareLevel(raw.careLevelId)) {
        throw new InvalidOrderSubmissionError();
      }
      const product = kitPackages.find((item) => item.id === raw.packageId);
      if (!product) throw new InvalidOrderSubmissionError();
      const qty = raw.qty;
      if (typeof qty !== "number" || !Number.isSafeInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
        throw new InvalidOrderSubmissionError();
      }
      const unitPricePaise = product.prices[raw.careLevelId] * 100;
      const lineTotalPaise = unitPricePaise * qty;
      if (!Number.isSafeInteger(lineTotalPaise) || lineTotalPaise > MAX_LINE_TOTAL_PAISE) {
        throw new InvalidOrderSubmissionError();
      }
      lines.push({
        item_type: "package", item_id: product.id, item_name: product.name,
        care_level: raw.careLevelId, quantity: qty,
        unit_price_paise: unitPricePaise, line_total_paise: lineTotalPaise,
      });
      totalQuantity += qty;
      subtotalPaise += lineTotalPaise;
      continue;
    }

    throw new InvalidOrderSubmissionError();
  }

  if (
    totalQuantity > MAX_TOTAL_QTY ||
    !Number.isSafeInteger(subtotalPaise) ||
    subtotalPaise > MAX_LINE_TOTAL_PAISE
  ) throw new InvalidOrderSubmissionError();

  return {
    customer: {
      name, mobile, email, location, delivery_address: deliveryAddress,
      pickup_instructions: pickupInstructions, notes,
    },
    handover: {
      method: handover.method,
      requested_at: parseRequestedAt(handover.requestedAt),
    },
    payment_preference: paymentPreference as OrderPaymentPreference,
    items: lines,
    subtotal_paise: subtotalPaise,
    currency_code: "INR",
  };
}
