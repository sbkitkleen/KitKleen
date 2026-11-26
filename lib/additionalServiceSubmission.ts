import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("The enquiry or photo is too large.");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function parseBoundedMultipartForm(
  request: Request,
  maximumBytes: number
): Promise<FormData> {
  const declaredLength = request.headers.get("content-length");
  let expectedLength: number | null = null;
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      throw new Error("Invalid Content-Length.");
    }
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength)) {
      throw new Error("Invalid Content-Length.");
    }
    if (parsedLength > maximumBytes) {
      throw new RequestBodyTooLargeError();
    }
    expectedLength = parsedLength;
  }

  if (!request.body) throw new Error("The request body is missing.");

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(Buffer.from(value));
  }
  if (expectedLength !== null && totalBytes !== expectedLength) {
    throw new Error("Content-Length does not match the request body.");
  }

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const boundedRequest = new Request(request.url, {
    method: "POST",
    headers,
    body: Buffer.concat(chunks, totalBytes),
  });
  return boundedRequest.formData();
}

export function hashTrustedClientIp(
  request: Request,
  trustedHeader: string | undefined,
  secret: string | undefined
): string {
  if (!trustedHeader || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(trustedHeader)) {
    throw new Error("Trusted proxy IP header is not configured.");
  }
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("Rate-limit HMAC secret is not configured.");
  }

  const suppliedIp = request.headers.get(trustedHeader)?.trim();
  if (!suppliedIp || suppliedIp.includes(",") || isIP(suppliedIp) === 0) {
    throw new Error("Trusted proxy did not provide a valid client IP.");
  }
  const normalizedIp = isIP(suppliedIp) === 6
    ? new URL(`http://[${suppliedIp}]`).hostname.slice(1, -1)
    : suppliedIp;
  return createHmac("sha256", secret).update(normalizedIp).digest("hex");
}

export function hasValidImageSignature(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  return contentType === "image/webp" &&
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}
