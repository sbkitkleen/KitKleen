import { bags, careLevels, kitPackages, services, type CareLevelId } from "./data.ts";

const gearCatalog = [...services, ...bags];
const maximumDatabaseInteger = 2_147_483_647;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("The booking request is too large.");
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidBookingRequestError extends Error {
  constructor() {
    super("The booking request is invalid.");
    this.name = "InvalidBookingRequestError";
  }
}

type BookingRecord = {
  customer_name: string;
  mobile: string;
  email: string | null;
  location: string;
  service_type: string;
  preferred_date: string;
  notes: string | null;
  estimated_total: number;
};

type BookingItemRecord = {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function requiredText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") throw new InvalidBookingRequestError();
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maximumLength) throw new InvalidBookingRequestError();
  return trimmed;
}

function isCareLevelId(value: unknown): value is CareLevelId {
  return typeof value === "string" && careLevels.some((level) => level.id === value);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;

  const todayParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = [
    todayParts.find((part) => part.type === "year")?.value,
    todayParts.find((part) => part.type === "month")?.value,
    todayParts.find((part) => part.type === "day")?.value,
  ].join("-");
  return value >= today;
}

export async function readBoundedJsonRequest(request: Request, maximumBytes: number): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  let expectedLength: number | null = null;
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) throw new InvalidBookingRequestError();
    expectedLength = Number(declaredLength);
    if (!Number.isSafeInteger(expectedLength)) throw new InvalidBookingRequestError();
    if (expectedLength > maximumBytes) throw new RequestBodyTooLargeError();
  }
  if (!request.body) throw new InvalidBookingRequestError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }
  if (expectedLength !== null && totalBytes !== expectedLength) {
    throw new InvalidBookingRequestError();
  }

  const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes).toString("utf8");
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new InvalidBookingRequestError();
  }
}

export function parsePublicBookingSubmission(value: unknown): {
  booking: BookingRecord;
  items: BookingItemRecord[];
} {
  if (!isRecord(value) || !hasExactKeys(value, ["mode", "customer", "items"])) {
    throw new InvalidBookingRequestError();
  }

  const mode = value.mode;
  if (mode !== "package" && mode !== "individual" && mode !== "cart") {
    throw new InvalidBookingRequestError();
  }
  if (!isRecord(value.customer) || !hasExactKeys(value.customer, [
    "name", "mobile", "email", "location", "date", "notes",
  ])) {
    throw new InvalidBookingRequestError();
  }

  const customerName = requiredText(value.customer.name, 120);
  const mobile = requiredText(value.customer.mobile, 30);
  if (!/^[0-9+()\- ]{7,18}$/.test(mobile)) throw new InvalidBookingRequestError();
  const rawEmail = value.customer.email;
  if (rawEmail !== null && typeof rawEmail !== "string") throw new InvalidBookingRequestError();
  const email = typeof rawEmail === "string" ? rawEmail.trim() || null : null;
  if (email && (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )) {
    throw new InvalidBookingRequestError();
  }
  const location = requiredText(value.customer.location, 240);
  const preferredDate = requiredText(value.customer.date, 10);
  if (!isValidDate(preferredDate)) throw new InvalidBookingRequestError();
  const rawNotes = value.customer.notes;
  if (rawNotes !== null && typeof rawNotes !== "string") throw new InvalidBookingRequestError();
  const notes = typeof rawNotes === "string" ? rawNotes.trim() || null : null;
  if (notes && notes.length > 2000) throw new InvalidBookingRequestError();

  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 50) {
    throw new InvalidBookingRequestError();
  }

  const items: BookingItemRecord[] = [];
  let estimatedTotal = 0;
  for (const rawItem of value.items) {
    if (!isRecord(rawItem)) throw new InvalidBookingRequestError();
    const { kind, careLevelId, quantity } = rawItem;
    if (!isCareLevelId(careLevelId) || !Number.isSafeInteger(quantity) || (quantity as number) < 1) {
      throw new InvalidBookingRequestError();
    }
    const careLevel = careLevels.find((level) => level.id === careLevelId);
    if (!careLevel) throw new InvalidBookingRequestError();

    let itemName: string;
    let unitPrice: number;
    if (kind === "gear" && hasExactKeys(rawItem, ["kind", "productId", "careLevelId", "quantity"])) {
      if (mode === "package" || typeof rawItem.productId !== "string") {
        throw new InvalidBookingRequestError();
      }
      const product = gearCatalog.find((item) => item.id === rawItem.productId);
      if (!product) throw new InvalidBookingRequestError();
      itemName = `${product.description} · ${careLevel.name}`;
      unitPrice = product.prices[careLevelId];
    } else if (
      kind === "package" &&
      hasExactKeys(rawItem, ["kind", "packageId", "careLevelId", "quantity"])
    ) {
      if (mode === "individual" || typeof rawItem.packageId !== "string") {
        throw new InvalidBookingRequestError();
      }
      const kit = kitPackages.find((item) => item.id === rawItem.packageId);
      if (!kit) throw new InvalidBookingRequestError();
      itemName = `${kit.name} · ${careLevel.name} (Includes: ${kit.includes.join(", ")})`;
      unitPrice = kit.prices[careLevelId];
    } else {
      throw new InvalidBookingRequestError();
    }

    const itemQuantity = quantity as number;
    const lineTotal = unitPrice * itemQuantity;
    if (
      !Number.isSafeInteger(lineTotal) ||
      estimatedTotal + lineTotal > maximumDatabaseInteger
    ) {
      throw new InvalidBookingRequestError();
    }
    estimatedTotal += lineTotal;
    items.push({
      item_name: itemName,
      quantity: itemQuantity,
      unit_price: unitPrice,
      total_price: lineTotal,
    });
  }

  if (mode === "package" && (items.length !== 1 || items[0].quantity !== 1)) {
    throw new InvalidBookingRequestError();
  }

  const serviceType = mode === "individual"
    ? "Individual Gear"
    : mode === "cart"
      ? "Launch Enquiry — Gear & Package Selection"
      : items[0].item_name.split(" (Includes:")[0];

  return {
    booking: {
      customer_name: customerName,
      mobile,
      email,
      location,
      service_type: serviceType,
      preferred_date: preferredDate,
      notes,
      estimated_total: estimatedTotal,
    },
    items,
  };
}
