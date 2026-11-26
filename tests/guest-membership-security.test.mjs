import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  beginMembershipSubmission,
  completeMembershipSubmission,
  createMembershipSubmissionState,
  finishMembershipSubmission,
} from "../lib/membershipSubmissionIdempotency.ts";
import {
  hashMembershipClientIp,
  isValidMembershipPlan,
  normalizeMembershipMobile,
} from "../lib/membershipEnquiries.ts";

const migrationUrl = new URL(
  "../supabase/migrations/20261126105000_guest_membership_enquiries.sql",
  import.meta.url
);

test("guest membership migration is standalone and contains only membership objects", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.match(migration, /create table public\.membership_enquiries/i);
  assert.match(migration, /create table public\.membership_enquiry_rate_limits/i);
  assert.match(migration, /create table public\.membership_enquiry_submission_idempotency/i);
  assert.doesNotMatch(
    migration,
    /customer_profiles|customer_user_id|auth\.users|phone_confirmed_at|submit_public_booking_idempotent_for_customer|complete_additional_service_enquiry_submission_for_customer/i
  );
  assert.match(migration, /plan_id in \('player-care', 'pro-player', 'club-academy'\)/i);
  assert.match(migration, /customer_mobile ~ '\^\\\+\[1-9\]\[0-9\]\{7,14\}\$'/i);
  assert.match(migration, /membership_enquiries_created_at_idx/);
  assert.match(migration, /membership_enquiries enable row level security/i);
  assert.match(migration, /membership_enquiry_rate_limits enable row level security/i);
  assert.match(migration, /membership_enquiry_submission_idempotency enable row level security/i);
});

test("membership idempotency and rate-limit RPC signatures, ownership, and grants match", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const declarations = new Map(
    [...migration.matchAll(
      /create or replace function public\.([a-z0-9_]+)\(([\s\S]*?)\)\s*returns/gi
    )].map(([, name, args]) => [
      name.toLowerCase(),
      args.trim()
        ? args.split(",").map((argument) => argument.trim().split(/\s+/).at(-1).toLowerCase()).join(", ")
        : "",
    ])
  );
  const permissions = [
    ...migration.matchAll(
      /(?:revoke all on function|grant execute on function|alter function)\s+public\.([a-z0-9_]+)\(([\s\S]*?)\)/gi
    ),
  ];
  assert.equal(declarations.size, 3);
  for (const [, name, signature] of permissions) {
    assert.equal(
      signature.split(",").map((type) => type.trim().toLowerCase()).join(", "),
      declarations.get(name.toLowerCase()),
      `function signature mismatch for ${name}`
    );
  }
  assert.match(migration, /auth\.role\(\) is distinct from 'service_role'/gi);
  assert.match(migration, /grant execute on function public\.consume_membership_enquiry_rate_limit\(text\)\s+to service_role/i);
  assert.match(migration, /grant execute on function public\.submit_membership_enquiry_idempotent\(\s*uuid, text, text, text, text, text, text, text\s*\)\s+to service_role/i);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(p_idempotency_key::text, 0\)\)/i);
  assert.match(
    migration,
    /select i\.payload_hash, i\.enquiry_id, e\.enquiry_status[\s\S]*join public\.membership_enquiries e on e\.id = i\.enquiry_id/i
  );
  assert.match(migration, /return query select v_enquiry_id, v_enquiry_status, false/i);
  assert.match(migration, /using errcode = 'P4090'/i);
  assert.match(migration, /using errcode = 'P4290'/i);
  assert.match(migration, /return v_request_count <= 5/i);
  assert.match(migration, /create trigger guest_membership_enquiries_set_updated_at/i);
});

test("membership plan, mobile and Vercel IP validation are deterministic and fail closed", () => {
  assert.equal(isValidMembershipPlan("player-care"), true);
  assert.equal(isValidMembershipPlan("anything-else"), false);
  assert.equal(normalizeMembershipMobile("98765 43210"), "+919876543210");
  assert.equal(normalizeMembershipMobile("09876543210"), "+919876543210");

  const secret = "local-only-membership-rate-limit-secret-32";
  assert.throws(
    () => hashMembershipClientIp(new Request("https://kitkleen.test"), secret),
    /single client IP/
  );
  assert.throws(
    () => hashMembershipClientIp(
      new Request("https://kitkleen.test", {
        headers: { "x-vercel-forwarded-for": "198.51.100.1, 203.0.113.1" },
      }),
      secret
    ),
    /single client IP/
  );
  const clientIpHash = hashMembershipClientIp(
    new Request("https://kitkleen.test", {
      headers: {
        "x-vercel-forwarded-for": "198.51.100.1",
        "x-forwarded-for": "203.0.113.1",
        "x-real-ip": "203.0.113.1",
      },
    }),
    secret
  );
  assert.match(clientIpHash, /^[0-9a-f]{64}$/);
  assert.equal(
    clientIpHash,
    hashMembershipClientIp(
      new Request("https://kitkleen.test", {
        headers: { "x-vercel-forwarded-for": "198.51.100.1" },
      }),
      secret
    )
  );

  assert.throws(
    () => hashMembershipClientIp(
      new Request("https://kitkleen.test", {
        headers: { "x-forwarded-for": "198.51.100.1" },
      }),
      secret
    ),
    /single client IP/
  );
});

test("membership submission state reuses retries and creates new keys for changed payloads", () => {
  const state = createMembershipSubmissionState();
  const keys = ["first", "changed", "new-attempt"];
  let next = 0;
  const createKey = () => keys[next++];
  const firstPayload = JSON.stringify({ planId: "player-care", message: "first" });

  const firstKey = beginMembershipSubmission(state, firstPayload, createKey);
  assert.equal(firstKey, "first");
  assert.equal(beginMembershipSubmission(state, firstPayload, createKey), null);
  finishMembershipSubmission(state);
  assert.equal(beginMembershipSubmission(state, firstPayload, createKey), firstKey);
  finishMembershipSubmission(state);

  const changedKey = beginMembershipSubmission(
    state,
    JSON.stringify({ planId: "player-care", message: "changed" }),
    createKey
  );
  assert.equal(changedKey, "changed");
  finishMembershipSubmission(state);
  completeMembershipSubmission(state);
  assert.equal(beginMembershipSubmission(state, firstPayload, createKey), "new-attempt");
});

test("membership API and Admin status endpoint use the isolated guest schema", async () => {
  const [api, adminPage, adminForm, adminUpdate, migration] = await Promise.all([
    readFile(new URL("../app/api/membership-enquiries/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/membership-enquiries/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/AdminMembershipEnquiries.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/membership-enquiries/[id]/route.ts", import.meta.url), "utf8"),
    readFile(migrationUrl, "utf8"),
  ]);
  assert.match(api, /submit_membership_enquiry_idempotent/);
  assert.match(api, /hashMembershipClientIp/);
  assert.match(await readFile(new URL("../lib/membershipEnquiries.ts", import.meta.url), "utf8"), /x-vercel-forwarded-for/);
  assert.doesNotMatch(api, /additionalServiceSubmission/);
  assert.match(api, /adminClient\.rpc\(\s*"submit_membership_enquiry_idempotent"/);
  assert.doesNotMatch(api, /customerUserId|createClient|phone_confirmed_at|_for_customer/);
  assert.match(adminPage, /app_metadata\?\.role !== "admin"/);
  assert.match(adminPage, /\.from\("membership_enquiries"\)/);
  assert.doesNotMatch(adminPage, /customer_user_id/);
  assert.match(adminForm, /\/api\/admin\/membership-enquiries\/\$\{id\}/);
  assert.doesNotMatch(adminForm, /createClient|customer_user_id/);
  assert.match(adminUpdate, /isSameOriginRequest\(request\)/);
  assert.match(adminUpdate, /auth\.user\.app_metadata\?\.role !== "admin"/);
  assert.match(adminUpdate, /\.update\(\{ enquiry_status: body\.status \}\)/);
  assert.match(migration, /Admins can read guest membership enquiries[\s\S]*app_metadata.*role.*admin/i);
  assert.match(migration, /Admins can update guest membership enquiry status[\s\S]*app_metadata.*role.*admin/i);
  assert.match(migration, /grant update \(enquiry_status\) on public\.membership_enquiries to authenticated/i);
  assert.doesNotMatch(migration, /grant insert .*membership_enquiries to authenticated/i);
});

test("membership idempotency replay reads the current Admin-updated status", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.match(
    migration,
    /select i\.payload_hash, i\.enquiry_id, e\.enquiry_status[\s\S]*join public\.membership_enquiries e on e\.id = i\.enquiry_id/i
  );
  assert.doesNotMatch(migration, /select i\.payload_hash, i\.enquiry_id, i\.enquiry_status/i);
});
