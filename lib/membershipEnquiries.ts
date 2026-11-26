import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const membershipPlanIds = ["player-care", "pro-player", "club-academy"];

export function isValidMembershipPlan(value: string) {
  return membershipPlanIds.includes(value);
}

export function normalizeMembershipMobile(value: string) {
  const cleaned = value.trim().replace(/[()\s.-]/g, "");
  let digits = cleaned.replace(/\D/g, "");
  if (!cleaned.startsWith("+") && digits.length === 10) return `+91${digits}`;
  if (!cleaned.startsWith("+") && digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  if (!cleaned.startsWith("+") && digits.startsWith("00")) digits = digits.slice(2);
  return `+${digits}`;
}

export function hashMembershipClientIp(
  request: Request,
  secret: string | undefined
) {
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("Membership rate-limit HMAC secret is not configured.");
  }

  const suppliedIp = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (!suppliedIp || suppliedIp.includes(",") || isIP(suppliedIp) === 0) {
    throw new Error("Vercel did not provide a valid single client IP.");
  }
  const normalizedIp =
    isIP(suppliedIp) === 6
      ? new URL(`http://[${suppliedIp}]`).hostname.slice(1, -1)
      : suppliedIp;
  return createHmac("sha256", secret).update(normalizedIp).digest("hex");
}
