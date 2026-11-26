import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  beginBookingSubmission,
  completeBookingSubmission,
  createBookingSubmissionState,
  finishBookingSubmission,
} from "../lib/bookingSubmissionIdempotency.ts";

test("double-clicks are guarded while the first booking request is in flight", () => {
  const state = createBookingSubmissionState();
  let generatedKeys = 0;
  const createKey = () => `booking-key-${++generatedKeys}`;

  assert.equal(beginBookingSubmission(state, "same request", createKey), "booking-key-1");
  assert.equal(beginBookingSubmission(state, "same request", createKey), null);
  assert.equal(generatedKeys, 1);
  assert.equal(state.inProgress, true);

  finishBookingSubmission(state);
  completeBookingSubmission(state);
  assert.equal(state.pending, null);
});

test("a retry reuses its key, while a changed or completed booking gets a new key", () => {
  const state = createBookingSubmissionState();
  let generatedKeys = 0;
  const createKey = () => `booking-key-${++generatedKeys}`;

  const firstKey = beginBookingSubmission(state, "request one", createKey);
  assert.equal(firstKey, "booking-key-1");
  finishBookingSubmission(state);
  assert.equal(beginBookingSubmission(state, "request one", createKey), firstKey);
  finishBookingSubmission(state);

  assert.equal(beginBookingSubmission(state, "request two", createKey), "booking-key-2");
  finishBookingSubmission(state);
  completeBookingSubmission(state);
  assert.equal(beginBookingSubmission(state, "request two", createKey), "booking-key-3");
});

test("booking API sends the key, canonical payload hash, and trusted IP to the idempotent RPC", async () => {
  const [route, form] = await Promise.all([
    readFile(new URL("../app/api/bookings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/BookingForm.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(form, /"Idempotency-Key": idempotencyKey/);
  assert.match(form, /disabled=\{isSubmitting\}/);
  assert.match(form, /if\(submissionState\.current\.inProgress\)return/);
  assert.match(route, /request\.headers\.get\("idempotency-key"\)/);
  assert.match(route, /submit_public_booking_idempotent/);
  assert.match(route, /p_idempotency_key: idempotencyKey/);
  assert.match(route, /p_payload_hash: payloadHash/);
  assert.match(route, /p_ip_hash: ipHash/);
  assert.match(route, /bookingId: result\.booking_id/);
});

test("database idempotency migration serializes concurrent duplicate submissions", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261126100000_idempotent_public_booking_submissions.sql", import.meta.url),
    "utf8"
  );
  const submission = migration.match(
    /create or replace function public\.submit_public_booking_idempotent[\s\S]*?\n\$\$;/i
  )?.[0];
  assert.ok(submission);
  assert.match(migration, /idempotency_key uuid primary key/i);
  assert.match(migration, /booking_id uuid not null references public\.bookings\(id\)/i);
  assert.match(submission, /pg_advisory_xact_lock\(hashtextextended\(p_idempotency_key::text, 0\)\)/i);
  assert.match(submission, /where i\.idempotency_key = p_idempotency_key/i);
  assert.match(submission, /if found then[\s\S]*?return query select v_booking_id, false/i);
  assert.match(submission, /v_existing_hash <> p_payload_hash/);
  assert.ok(
    submission.indexOf("where i.idempotency_key = p_idempotency_key") <
    submission.indexOf("consume_public_booking_rate_limit")
  );
  assert.ok(
    submission.indexOf("consume_public_booking_rate_limit") <
    submission.indexOf("public.submit_public_booking(p_booking, p_items)")
  );
  assert.match(submission, /insert into public\.booking_submission_idempotency/i);
  assert.match(migration, /revoke all on function public\.submit_public_booking_idempotent[\s\S]*?from public, anon, authenticated, service_role[\s\S]*?grant execute on function public\.submit_public_booking_idempotent[\s\S]*?to service_role/i);
});
