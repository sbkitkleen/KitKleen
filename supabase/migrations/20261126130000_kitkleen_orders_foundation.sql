-- KitKleen Orders foundation v1
-- Prepared against the supplied KitKleen repository snapshot.
-- REVIEW ONLY: do not execute in Production until explicitly approved.
-- No GST/tax rate is assumed. Amounts are stored as integer paise.

begin;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique,
  customer_name text not null check (length(btrim(customer_name)) between 1 and 120),
  customer_mobile text not null check (customer_mobile ~ '^\+[1-9][0-9]{7,14}$'),
  customer_email text,
  customer_location text not null check (length(btrim(customer_location)) between 1 and 240),
  delivery_address text,
  pickup_instructions text,
  customer_notes text,
  admin_notes text,

  handover_method text not null
    check (handover_method in ('pickup', 'customer_dropoff')),
  requested_handover_at timestamp without time zone not null,
  confirmed_handover_at timestamp without time zone,
  handover_status text not null default 'requested'
    check (handover_status in (
      'requested', 'confirmed', 'collection_scheduled', 'gear_received',
      'ready_for_return', 'returned', 'cancelled'
    )),

  order_status text not null default 'awaiting_confirmation'
    check (order_status in (
      'awaiting_confirmation', 'confirmed', 'gear_received', 'inspection',
      'awaiting_customer_approval', 'cleaning', 'quality_check', 'ready',
      'completed', 'on_hold', 'cancelled'
    )),

  payment_preference text not null
    check (payment_preference in ('razorpay', 'upi', 'cash')),
  payment_status text not null default 'pending'
    check (payment_status in (
      'pending', 'partially_paid', 'paid', 'failed', 'refunded', 'partially_refunded'
    )),

  currency_code text not null default 'INR' check (currency_code = 'INR'),
  subtotal_paise bigint not null default 0 check (subtotal_paise >= 0),
  extra_charges_paise bigint not null default 0 check (extra_charges_paise >= 0),
  discount_paise bigint not null default 0 check (discount_paise >= 0),
  tax_amount_paise bigint not null default 0 check (tax_amount_paise >= 0),
  total_paise bigint not null default 0 check (total_paise >= 0),
  amount_paid_paise bigint not null default 0 check (amount_paid_paise >= 0),
  balance_due_paise bigint not null default 0 check (balance_due_paise >= 0),

  customer_notification_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_total_arithmetic check (
    total_paise = subtotal_paise + extra_charges_paise + tax_amount_paise - discount_paise
  ),
  constraint orders_balance_arithmetic check (
    balance_due_paise = greatest(total_paise - amount_paid_paise, 0)
  ),
  constraint orders_pickup_address check (
    handover_method <> 'pickup' or nullif(btrim(delivery_address), '') is not null
  ),
  constraint orders_email_format check (
    customer_email is null or customer_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);
create index if not exists orders_order_status_created_idx
  on public.orders (order_status, created_at desc);
create index if not exists orders_handover_status_requested_idx
  on public.orders (handover_status, requested_handover_at);
create index if not exists orders_customer_mobile_created_idx
  on public.orders (customer_mobile, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_type text not null check (item_type in ('gear', 'package')),
  item_id text not null,
  item_name text not null check (length(btrim(item_name)) between 1 and 240),
  care_level text not null check (care_level in ('fresh', 'deep', 'elite')),
  quantity integer not null check (quantity between 1 and 100),
  unit_price_paise bigint not null check (unit_price_paise >= 0),
  line_total_paise bigint not null check (line_total_paise >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_line_arithmetic check (
    line_total_paise = quantity::bigint * unit_price_paise
  )
);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_method text not null check (payment_method in ('razorpay', 'upi', 'cash')),
  payment_provider text not null check (payment_provider in ('razorpay', 'offline')),
  payment_status text not null default 'pending'
    check (payment_status in (
      'pending', 'authorized', 'captured', 'verified', 'failed',
      'rejected', 'refunded', 'partially_refunded'
    )),
  verification_status text not null default 'not_required'
    check (verification_status in ('not_required', 'pending', 'verified', 'rejected')),
  amount_paise bigint not null check (amount_paise > 0),
  currency_code text not null default 'INR' check (currency_code = 'INR'),
  provider_order_id text,
  provider_payment_id text,
  provider_event_id text,
  idempotency_key text,
  payment_reference text,
  admin_note text,
  verified_by uuid,
  verified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_payments_provider_method check (
    (payment_provider = 'razorpay' and payment_method = 'razorpay')
    or (payment_provider = 'offline' and payment_method in ('upi', 'cash'))
  ),
  constraint order_payments_offline_verification check (
    payment_provider <> 'offline'
    or verification_status in ('pending', 'verified', 'rejected')
  )
);

create unique index if not exists order_payments_provider_payment_unique
  on public.order_payments (payment_provider, provider_payment_id)
  where provider_payment_id is not null;
create unique index if not exists order_payments_provider_event_unique
  on public.order_payments (payment_provider, provider_event_id)
  where provider_event_id is not null;
create unique index if not exists order_payments_idempotency_unique
  on public.order_payments (idempotency_key)
  where idempotency_key is not null;
create index if not exists order_payments_order_created_idx
  on public.order_payments (order_id, created_at desc);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (length(btrim(event_type)) between 1 and 100),
  previous_value jsonb,
  new_value jsonb,
  event_description text not null check (length(btrim(event_description)) between 1 and 1000),
  actor_type text not null
    check (actor_type in ('customer', 'admin', 'system', 'payment_provider')),
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_created_idx
  on public.order_events (order_id, created_at desc);

create table if not exists public.order_extra_charges (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  description text not null check (length(btrim(description)) between 1 and 500),
  amount_paise bigint not null check (amount_paise > 0),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  customer_approved_at timestamptz,
  customer_approval_token_hash text unique,
  approval_expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_extra_charge_approval_token check (
    customer_approval_token_hash is null
    or customer_approval_token_hash ~ '^[0-9a-f]{64}$'
  )
);

create index if not exists order_extra_charges_order_created_idx
  on public.order_extra_charges (order_id, created_at desc);
create index if not exists order_extra_charges_pending_expiry_idx
  on public.order_extra_charges (approval_status, approval_expires_at)
  where approval_status = 'pending';

create table if not exists public.order_tracking_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists order_tracking_tokens_order_created_idx
  on public.order_tracking_tokens (order_id, created_at desc);
create index if not exists order_tracking_tokens_active_expiry_idx
  on public.order_tracking_tokens (expires_at)
  where revoked_at is null;

create table if not exists public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('customer', 'admin')),
  channel text not null check (channel in ('email', 'whatsapp')),
  recipient_address text not null check (length(btrim(recipient_address)) between 1 and 254),
  template_key text not null check (length(btrim(template_key)) between 1 and 120),
  template_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(template_data) = 'object'),
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'processing', 'sent', 'failed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_notifications_queue_idx
  on public.order_notifications (delivery_status, next_attempt_at, created_at)
  where delivery_status in ('queued', 'failed');
create index if not exists order_notifications_order_created_idx
  on public.order_notifications (order_id, created_at desc);

create table if not exists public.order_submission_idempotency (
  idempotency_key uuid primary key,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  order_id uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.order_submission_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

-- All Orders data is server-managed. Public browser roles receive no direct table access.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'orders',
    'order_items',
    'order_payments',
    'order_events',
    'order_extra_charges',
    'order_tracking_tokens',
    'order_notifications',
    'order_submission_idempotency',
    'order_submission_rate_limits'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;

commit;
