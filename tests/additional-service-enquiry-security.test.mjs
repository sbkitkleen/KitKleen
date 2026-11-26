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
  assert.match(migration, /on conflict \(id\) do nothing/i);
  assert.match(migration, /existing_bucket\.public is distinct from false/i);
  assert.match(migration, /existing_bucket\.file_size_limit is distinct from 5242880/i);
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

test("booking migration preserves customer inserts and limits Admin access and grants", async () => {
  const restrictionUrl = new URL(
    "../supabase/migrations/20261125190000_restrict_booking_admin_access.sql",
    import.meta.url
  );
  const restriction = await readFile(restrictionUrl, "utf8");
  const bookingInsertColumns = restriction.match(
    /grant insert \(([^)]*)\) on table public\.bookings to anon/i
  )?.[1];
  const itemInsertColumns = restriction.match(
    /grant insert \(([^)]*)\) on table public\.booking_items to anon/i
  )?.[1];
  assert.ok(bookingInsertColumns);
  assert.ok(itemInsertColumns);
  assert.deepEqual(
    bookingInsertColumns.split(",").map((column) => column.trim()),
    ["id", "customer_name", "mobile", "email", "location", "service_type", "preferred_date", "notes", "estimated_total", "status"]
  );
  assert.deepEqual(
    itemInsertColumns.split(",").map((column) => column.trim()),
    ["booking_id", "item_name", "quantity", "unit_price", "total_price"]
  );
  assert.match(restriction, /from pg_policies[\s\S]*tablename in \('bookings', 'booking_items'\)/i);
  assert.match(restriction, /cmd <> 'INSERT'/i);
  assert.match(restriction, /drop policy %I on %I\.%I/i);
  assert.match(restriction, /revoke all privileges on table public\.bookings, public\.booking_items\s+from public, anon, authenticated/i);
  assert.match(restriction, /foreach privilege_name in array array\['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'\]/i);
  assert.match(restriction, /revoke %s \(%s\) on table public\.%I from public, anon, authenticated/i);
  assert.match(restriction, /from pg_attribute[\s\S]*attnum > 0[\s\S]*not attisdropped/i);
  assert.doesNotMatch(restriction, /revoke all privileges\s*\(/i);
  assert.match(restriction, /grant insert \([\s\S]*\) on table public\.bookings to anon/i);
  assert.match(restriction, /grant insert \([\s\S]*\) on table public\.booking_items to anon/i);
  assert.match(restriction, /grant select on table public\.bookings to authenticated/i);
  assert.match(restriction, /grant update \(status\) on table public\.bookings to authenticated/i);
  assert.match(restriction, /grant select \(booking_id, item_name, quantity, unit_price, total_price\)[\s\S]*on table public\.booking_items to authenticated/i);
  assert.match(restriction, /KitKleen customers can submit bookings[\s\S]*for insert\s+to anon[\s\S]*with check \(true\)/i);
  assert.match(restriction, /KitKleen customers can submit booking items[\s\S]*for insert\s+to anon[\s\S]*with check \(true\)/i);
  assert.match(restriction, /Admins can read bookings[\s\S]*app_metadata.*role.*admin/i);
  assert.match(restriction, /Admins can update booking status[\s\S]*app_metadata.*role.*admin/i);
  assert.match(restriction, /Admins can read booking items[\s\S]*app_metadata.*role.*admin/i);
  assert.doesNotMatch(restriction, /grant\s+(?:all|delete|truncate|references|trigger)\b/i);
});

test("booking grants cover the current customer and Admin query paths", async () => {
  const bookingForm = await readFile(
    new URL("../components/BookingForm.tsx", import.meta.url),
    "utf8"
  );
  const dashboard = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
  const detail = await readFile(
    new URL("../app/admin/bookings/[id]/page.tsx", import.meta.url),
    "utf8"
  );

  assert.match(bookingForm, /fetch\("\/api\/bookings"/);
  assert.doesNotMatch(bookingForm, /\.from\("(?:bookings|booking_items)"\)\s*\.insert\(/);
  assert.doesNotMatch(bookingForm, /SUPABASE_SERVICE_ROLE_KEY|createAdminClient/);
  assert.match(dashboard, /\.from\("bookings"\)[\s\S]*?\.select\("\*"\)/);
  assert.match(detail, /\.from\("bookings"\)[\s\S]*?\.select\("id,customer_name,mobile,email,location,service_type,preferred_date,notes,estimated_total,status,created_at"\)/);
  assert.match(detail, /\.from\("booking_items"\)[\s\S]*?\.select\("item_name,quantity,unit_price,total_price"\)/);
  assert.match(detail, /\.update\(\{status:nextStatus\}\)[\s\S]*?\.select\("id,status"\)/);
});

test("public booking RPC is atomic, validates totals, and forces the initial status", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261126090000_harden_public_booking_submissions.sql", import.meta.url),
    "utf8"
  );
  const submission = migration.match(
    /create or replace function public\.submit_public_booking[\s\S]*?\n\$\$;/i
  )?.[0];
  assert.ok(submission);
  assert.match(migration, /revoke insert on table public\.bookings, public\.booking_items from public, anon/i);
  assert.match(submission, /auth\.role\(\) is distinct from 'service_role'/i);
  assert.match(submission, /'new'\s*\);/i);
  assert.match(submission, /v_items_total <> v_estimated_total/i);
  assert.match(submission, /v_line_total::bigint <> v_quantity::bigint \* v_unit_price::bigint/i);
  assert.match(submission, /insert into public\.booking_items[\s\S]*v_booking_id/i);
  assert.match(migration, /grant execute on function public\.submit_public_booking\(jsonb, jsonb\) to service_role/i);
  assert.match(migration, /alter function public\.submit_public_booking\(jsonb, jsonb\) owner to postgres/i);
  assert.match(migration, /return v_request_count <= 12/i);
  assert.match(migration, /create table if not exists public\.booking_submission_rate_limits/i);
  assert.match(migration, /revoke all on function public\.consume_public_booking_rate_limit\(text\)[\s\S]*?from public, anon, authenticated, service_role[\s\S]*?grant execute on function public\.consume_public_booking_rate_limit\(text\) to service_role/i);
});

test("booking API enforces same-origin requests and uses server-side canonical pricing", async () => {
  const [route, helper] = await Promise.all([
    readFile(new URL("../app/api/bookings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/bookingSubmission.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /const supabase = createAdminClient\(\)/);
  assert.match(route, /supabase\.rpc\(\s*"submit_public_booking"/);
  assert.match(route, /hashTrustedClientIp/);
  assert.match(route, /consume_public_booking_rate_limit/);
  assert.match(route, /Retry-After.*3600/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /readBoundedJsonRequest/);
  assert.match(helper, /product\.prices\[careLevelId\]/);
  assert.match(helper, /kit\.prices\[careLevelId\]/);
  assert.match(helper, /unit_price: unitPrice/);
});

test("Admin routes and pages require a verified app_metadata admin role", async () => {
  const [dashboard, detail, enquiriesPage, updateRoute, paymentRoute] = await Promise.all([
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/bookings/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/additional-enquiries/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/additional-service-enquiries/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/additional-service-enquiries/[id]/payments/route.ts", import.meta.url), "utf8"),
  ]);
  for (const source of [dashboard, detail, enquiriesPage, updateRoute, paymentRoute]) {
    assert.match(source, /app_metadata(?:\?\.|\.)role\s*!==?\s*["']admin["']/);
    assert.match(source, /auth\.getUser\(\)/);
    assert.doesNotMatch(source, /user_metadata/);
  }
});

test("public enquiry submission preserves size, origin, rate-limit, and idempotency controls", async () => {
  const route = await readFile(
    new URL("../app/api/additional-service-enquiries/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /consume_additional_service_enquiry_rate_limit/);
  assert.match(route, /begin_additional_service_enquiry_submission/);
  assert.match(route, /complete_additional_service_enquiry_submission/);
  assert.match(route, /hasValidImageSignature/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("service-role RPCs remain restricted and never gain public execution grants", async () => {
  const [enquiryMigration, bookingMigration] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(new URL("../supabase/migrations/20261126090000_harden_public_booking_submissions.sql", import.meta.url), "utf8"),
  ]);
  assert.match(enquiryMigration, /revoke all on function public\.consume_additional_service_enquiry_rate_limit\(text\)[\s\S]*?from public, anon, authenticated, service_role[\s\S]*?grant execute on function public\.consume_additional_service_enquiry_rate_limit\(text\)\s+to service_role/i);
  assert.match(enquiryMigration, /revoke all on function public\.complete_additional_service_enquiry_submission\([\s\S]*?\) from public, anon, authenticated, service_role[\s\S]*?to service_role/i);
  assert.match(enquiryMigration, /auth\.role\(\) is distinct from 'service_role'/i);
  assert.match(bookingMigration, /revoke all on function public\.submit_public_booking\(jsonb, jsonb\)[\s\S]*?from public, anon, authenticated, service_role[\s\S]*?grant execute on function public\.submit_public_booking\(jsonb, jsonb\) to service_role/i);
  assert.doesNotMatch(bookingMigration, /grant execute on function public\.submit_public_booking\(jsonb, jsonb\) to anon/i);
});

test("application config enables production security response headers", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /NODE_ENV === "production"/);
});

test("additional-service storage setup does not overwrite existing bucket configuration", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.match(migration, /on conflict \(id\) do nothing/i);
  assert.match(migration, /existing_bucket\.public is distinct from false/i);
  assert.match(migration, /existing_bucket\.file_size_limit is distinct from 5242880/i);
  assert.match(migration, /existing_bucket\.allowed_mime_types\s+is distinct from array\['image\/jpeg', 'image\/png', 'image\/webp'\]/i);
  assert.doesNotMatch(migration, /on conflict \(id\) do update/i);
  assert.match(migration, /create policy "Restrict additional service attachment reads"\s+on storage\.objects as restrictive for select to public/i);
  assert.match(migration, /bucket_id <> 'additional-service-enquiries'[\s\S]*auth\.jwt\(\).*role.*admin/i);
  assert.match(migration, /create policy "Restrict direct additional service attachment inserts"\s+on storage\.objects as restrictive for insert to public[\s\S]*bucket_id <> 'additional-service-enquiries'/i);
});
