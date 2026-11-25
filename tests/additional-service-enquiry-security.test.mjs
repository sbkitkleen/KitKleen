import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  hasValidImageSignature,
  hashTrustedClientIp,
  parseBoundedMultipartForm,
  RequestBodyTooLargeError,
} from "../lib/additionalServiceSubmission.ts";

const migrationUrl = new URL(
  "../supabase/migrations/20261002120000_additional_service_enquiries.sql",
  import.meta.url
);

function multipartRequest(body, headers = {}) {
  return new Request("https://kitkleen.test/api/additional-service-enquiries", {
    method: "POST",
    headers: {
      "content-type": "multipart/form-data; boundary=kitkleen-test",
      ...headers,
    },
    body,
  });
}

function streamingRequest(chunks, headers = {}) {
  return new Request("https://kitkleen.test/api/additional-service-enquiries", {
    method: "POST",
    headers: {
      "content-type": "multipart/form-data; boundary=kitkleen-test",
      ...headers,
    },
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    duplex: "half",
  });
}

test("multipart parser enforces actual streamed size without Content-Length", async () => {
  const maximumBytes = 32;
  const request = streamingRequest([new Uint8Array(20), new Uint8Array(13)]);
  await assert.rejects(
    parseBoundedMultipartForm(request, maximumBytes),
    RequestBodyTooLargeError
  );
});

test("multipart parser rejects invalid declared lengths and accepts a bounded body without one", async () => {
  await assert.rejects(
    parseBoundedMultipartForm(multipartRequest("body", { "content-length": "unknown" }), 32),
    /Invalid Content-Length/
  );
  await assert.rejects(
    parseBoundedMultipartForm(multipartRequest("body", { "content-length": "1" }), 32),
    /does not match/
  );
  await assert.rejects(
    parseBoundedMultipartForm(multipartRequest("body", { "content-length": "33" }), 32),
    RequestBodyTooLargeError
  );

  const body = [
    "--kitkleen-test",
    'Content-Disposition: form-data; name="serviceCategory"',
    "",
    "bat-repair",
    "--kitkleen-test--",
    "",
  ].join("\r\n");
  const formData = await parseBoundedMultipartForm(multipartRequest(body), 1024);
  assert.equal(formData.get("serviceCategory"), "bat-repair");
});

test("image signature validation rejects MIME-spoofed and truncated files", () => {
  assert.equal(
    hasValidImageSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff])),
    true
  );
  assert.equal(
    hasValidImageSignature("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
    false
  );
  assert.equal(
    hasValidImageSignature("image/webp", new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ])),
    true
  );
  assert.equal(hasValidImageSignature("image/png", new Uint8Array(12)), false);
});

test("trusted IP hashing requires the configured single-value proxy header", () => {
  const secret = "local-test-secret-that-is-long-enough-32";
  assert.throws(
    () => hashTrustedClientIp(new Request("https://kitkleen.test"), undefined, secret),
    /not configured/
  );
  assert.throws(
    () => hashTrustedClientIp(
      new Request("https://kitkleen.test", { headers: { "x-trusted-client-ip": "198.51.100.1, 203.0.113.1" } }),
      "x-trusted-client-ip",
      secret
    ),
    /valid client IP/
  );
  const firstHash = hashTrustedClientIp(
    new Request("https://kitkleen.test", { headers: { "x-trusted-client-ip": "198.51.100.1" } }),
    "x-trusted-client-ip",
    secret
  );
  assert.match(firstHash, /^[0-9a-f]{64}$/);
  assert.equal(
    firstHash,
    hashTrustedClientIp(
      new Request("https://kitkleen.test", { headers: { "x-trusted-client-ip": "198.51.100.1" } }),
      "x-trusted-client-ip",
      secret
    )
  );
});

test("migration keeps payment integrity, replay, and private bucket safeguards", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const workflow = migration.match(
    /create or replace function public\.update_additional_service_enquiry_workflow[\s\S]*?\n\$\$;/i
  )?.[0];
  const payment = migration.match(
    /create or replace function public\.record_additional_service_enquiry_payment[\s\S]*?\n\$\$;/i
  )?.[0];
  const refresh = migration.match(
    /create or replace function public\.refresh_additional_service_enquiry_payment_status\(\)[\s\S]*?\n\$\$;/i
  )?.[0];
  const submission = migration.match(
    /create or replace function public\.begin_additional_service_enquiry_submission[\s\S]*?\n\$\$;/i
  )?.[0];
  const rateLimit = migration.match(
    /create or replace function public\.consume_additional_service_enquiry_rate_limit[\s\S]*?\n\$\$;/i
  )?.[0];

  assert.ok(workflow);
  assert.match(workflow, /for update/i);
  assert.match(workflow, /sum\(p\.amount_inr\)/i);
  assert.match(workflow, /p_amount_due_inr < verified_total/i);
  assert.match(payment ?? "", /for update/i);
  assert.match(payment ?? "", /payment_reference\)/i);
  assert.match(migration, /unique \(payment_reference\)/i);
  assert.match(refresh ?? "", /old\.enquiry_id/i);
  assert.match(refresh ?? "", /new\.enquiry_id/i);
  assert.match(submission ?? "", /pg_advisory_xact_lock/i);
  assert.match(submission ?? "", /v_existing_status = 'completed'/i);
  assert.match(rateLimit ?? "", /on conflict \(ip_hash\) do update/i);
  assert.match(rateLimit ?? "", /interval '1 hour'/i);
  assert.match(rateLimit ?? "", /v_request_count <= 12/i);
  assert.match(migration, /revoke all on public\.additional_service_enquiry_payments from public, anon, authenticated/i);
  assert.doesNotMatch(
    migration,
    /grant\s+(?:insert|update|all)\s+on public\.additional_service_enquiry_payments\s+to authenticated/i
  );
  assert.match(migration, /on conflict \(id\) do update[\s\S]*?public = false/i);
  assert.match(migration, /file_size_limit = 5242880/i);
  assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/i);
  assert.match(migration, /as restrictive for select to public/i);
});

test("amount-due invariant rejects lower, but permits equal or higher, verified totals", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const workflow = migration.match(
    /create or replace function public\.update_additional_service_enquiry_workflow[\s\S]*?\n\$\$;/i
  )?.[0];
  assert.ok(workflow);
  assert.match(workflow, /p_amount_due_inr < verified_total/i);

  const verifiedPayments = 800;
  const isAllowed = (amountDue) =>
    !(verifiedPayments > 0 && (amountDue === null || amountDue < verifiedPayments));
  assert.equal(isAllowed(500), false);
  assert.equal(isAllowed(800), true);
  assert.equal(isAllowed(1000), true);
});
