create table if not exists public.additional_service_enquiries (
  id uuid primary key default gen_random_uuid(),
  enquiry_reference text not null unique default (
    'ASE-' || upper(replace(gen_random_uuid()::text, '-', ''))
  ),
  customer_user_id uuid references auth.users(id) on delete set null,
  service_category text not null check (
    service_category in ('bat-repair', 'glove-repair', 'pads-repair', 'leather-balls', 'jerseys')
  ),
  service_details jsonb not null default '{}'::jsonb check (jsonb_typeof(service_details) = 'object'),
  customer_name text not null check (length(customer_name) between 1 and 120),
  mobile text not null check (length(mobile) between 7 and 30),
  email text,
  location text not null check (length(location) between 1 and 240),
  amount_due_inr integer check (amount_due_inr is null or amount_due_inr >= 0),
  enquiry_status text not null default 'new' check (
    enquiry_status in ('new', 'reviewing', 'awaiting_customer', 'closed')
  ),
  order_status text not null default 'not_started' check (
    order_status in (
      'not_started', 'awaiting_inspection', 'awaiting_quote', 'quote_sent',
      'confirmed', 'in_progress', 'completed', 'cancelled'
    )
  ),
  payment_status text not null default 'not_due' check (
    payment_status in ('not_due', 'due', 'partially_paid', 'paid')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists additional_service_enquiries_created_at_idx
  on public.additional_service_enquiries (created_at desc);
create index if not exists additional_service_enquiries_customer_user_id_idx
  on public.additional_service_enquiries (customer_user_id)
  where customer_user_id is not null;

create table if not exists public.additional_service_enquiry_payments (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.additional_service_enquiries(id) on delete cascade,
  amount_inr integer not null check (amount_inr > 0),
  payment_method text not null check (
    payment_method in ('upi', 'bank_transfer', 'cash', 'other')
  ),
  payment_reference text not null check (length(payment_reference) between 1 and 120),
  payment_status text not null default 'verified' check (payment_status = 'verified'),
  verified_by uuid not null references auth.users(id),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (payment_reference)
);

create index if not exists additional_service_enquiry_payments_enquiry_id_idx
  on public.additional_service_enquiry_payments (enquiry_id, created_at desc);

create table if not exists public.additional_service_enquiry_attachments (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.additional_service_enquiries(id) on delete cascade,
  bucket_id text not null default 'additional-service-enquiries'
    check (bucket_id = 'additional-service-enquiries'),
  object_path text not null unique,
  original_filename text not null check (length(original_filename) between 1 and 160),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 5242880),
  created_at timestamptz not null default now()
);

create index if not exists additional_service_enquiry_attachments_enquiry_id_idx
  on public.additional_service_enquiry_attachments (enquiry_id);

create table if not exists public.additional_service_enquiry_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

create index if not exists additional_service_enquiry_rate_limits_window_idx
  on public.additional_service_enquiry_rate_limits (window_started_at);

create table if not exists public.additional_service_enquiry_idempotency (
  idempotency_key uuid primary key,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  enquiry_id uuid references public.additional_service_enquiries(id) on delete cascade,
  submission_status text not null default 'processing'
    check (submission_status in ('processing', 'completed')),
  lease_expires_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (submission_status = 'processing' and enquiry_id is null)
    or (submission_status = 'completed' and enquiry_id is not null)
  )
);

create index if not exists additional_service_enquiry_idempotency_expires_idx
  on public.additional_service_enquiry_idempotency (expires_at);

alter table public.additional_service_enquiries enable row level security;
alter table public.additional_service_enquiry_payments enable row level security;
alter table public.additional_service_enquiry_attachments enable row level security;
alter table public.additional_service_enquiry_rate_limits enable row level security;
alter table public.additional_service_enquiry_idempotency enable row level security;

revoke all on public.additional_service_enquiries from public, anon, authenticated;
revoke all on public.additional_service_enquiry_payments from public, anon, authenticated;
revoke all on public.additional_service_enquiry_attachments from public, anon, authenticated;
revoke all on public.additional_service_enquiry_rate_limits from public, anon, authenticated;
revoke all on public.additional_service_enquiry_idempotency from public, anon, authenticated;
grant all on public.additional_service_enquiries to service_role;
grant all on public.additional_service_enquiry_payments to service_role;
grant all on public.additional_service_enquiry_attachments to service_role;
grant all on public.additional_service_enquiry_rate_limits to service_role;
grant all on public.additional_service_enquiry_idempotency to service_role;
grant select on public.additional_service_enquiries to authenticated;
grant select on public.additional_service_enquiry_payments to authenticated;
grant select on public.additional_service_enquiry_attachments to authenticated;

create policy "Admins can read additional service enquiries"
  on public.additional_service_enquiries for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can read additional service enquiry payments"
  on public.additional_service_enquiry_payments for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can read additional service enquiry attachments"
  on public.additional_service_enquiry_attachments for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.update_additional_service_enquiry_timestamp()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.update_additional_service_enquiry_timestamp()
  from public, anon, authenticated, service_role;
alter function public.update_additional_service_enquiry_timestamp() owner to postgres;

create trigger set_additional_service_enquiries_updated_at
  before update on public.additional_service_enquiries
  for each row execute function public.update_additional_service_enquiry_timestamp();

create or replace function public.sync_additional_service_enquiry_payment_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  verified_total bigint;
begin
  select coalesce(sum(amount_inr), 0)
    into verified_total
    from public.additional_service_enquiry_payments
    where enquiry_id = new.id and payment_status = 'verified';

  if new.amount_due_inr is null or new.amount_due_inr = 0 then
    new.payment_status := case when verified_total > 0 then 'partially_paid' else 'not_due' end;
  elsif verified_total >= new.amount_due_inr then
    new.payment_status := 'paid';
  elsif verified_total > 0 then
    new.payment_status := 'partially_paid';
  else
    new.payment_status := 'due';
  end if;
  return new;
end;
$$;
revoke all on function public.sync_additional_service_enquiry_payment_status()
  from public, anon, authenticated, service_role;
alter function public.sync_additional_service_enquiry_payment_status() owner to postgres;

create trigger sync_additional_service_enquiry_payment_status
  before insert or update on public.additional_service_enquiries
  for each row execute function public.sync_additional_service_enquiry_payment_status();

create or replace function public.refresh_additional_service_enquiry_payment_status_for(p_enquiry_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  update public.additional_service_enquiries e
    set payment_status = case
      when e.amount_due_inr is null or e.amount_due_inr = 0 then
        case when exists (
          select 1 from public.additional_service_enquiry_payments p
          where p.enquiry_id = p_enquiry_id and p.payment_status = 'verified'
        ) then 'partially_paid' else 'not_due' end
      when (
        select coalesce(sum(p.amount_inr), 0)
        from public.additional_service_enquiry_payments p
        where p.enquiry_id = p_enquiry_id and p.payment_status = 'verified'
      ) >= e.amount_due_inr then 'paid'
      when exists (
        select 1 from public.additional_service_enquiry_payments p
        where p.enquiry_id = p_enquiry_id and p.payment_status = 'verified'
      ) then 'partially_paid'
      else 'due'
    end
    where e.id = p_enquiry_id
$$;
revoke all on function public.refresh_additional_service_enquiry_payment_status_for(uuid)
  from public, anon, authenticated, service_role;
alter function public.refresh_additional_service_enquiry_payment_status_for(uuid) owner to postgres;

create or replace function public.refresh_additional_service_enquiry_payment_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_additional_service_enquiry_payment_status_for(old.enquiry_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.enquiry_id is distinct from new.enquiry_id then
    perform public.refresh_additional_service_enquiry_payment_status_for(old.enquiry_id);
  end if;

  perform public.refresh_additional_service_enquiry_payment_status_for(new.enquiry_id);
  return new;
end;
$$;
revoke all on function public.refresh_additional_service_enquiry_payment_status()
  from public, anon, authenticated, service_role;
alter function public.refresh_additional_service_enquiry_payment_status() owner to postgres;

create trigger refresh_additional_service_enquiry_payment_status
  after insert or update or delete on public.additional_service_enquiry_payments
  for each row execute function public.refresh_additional_service_enquiry_payment_status();

create or replace function public.update_additional_service_enquiry_workflow(
  p_enquiry_id uuid,
  p_enquiry_status text,
  p_order_status text,
  p_update_amount_due boolean,
  p_amount_due_inr integer
)
returns table (
  id uuid,
  enquiry_status text,
  order_status text,
  payment_status text,
  amount_due_inr integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  verified_total bigint;
begin
  if auth.uid() is null
    or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if p_enquiry_status is not null and p_enquiry_status not in (
    'new', 'reviewing', 'awaiting_customer', 'closed'
  ) then
    raise exception 'Invalid enquiry status' using errcode = '22023';
  end if;
  if p_order_status is not null and p_order_status not in (
    'not_started', 'awaiting_inspection', 'awaiting_quote', 'quote_sent',
    'confirmed', 'in_progress', 'completed', 'cancelled'
  ) then
    raise exception 'Invalid order status' using errcode = '22023';
  end if;
  if p_update_amount_due is null then
    raise exception 'Amount update flag is required' using errcode = '22023';
  end if;
  if p_update_amount_due and p_amount_due_inr is not null and p_amount_due_inr < 0 then
    raise exception 'Amount due cannot be negative' using errcode = '22023';
  end if;

  perform 1
    from public.additional_service_enquiries e
    where e.id = p_enquiry_id
    for update;
  if not found then
    raise exception 'Enquiry not found' using errcode = 'P0002';
  end if;

  if p_update_amount_due then
    select coalesce(sum(p.amount_inr), 0)
      into verified_total
      from public.additional_service_enquiry_payments p
      where p.enquiry_id = p_enquiry_id and p.payment_status = 'verified';
    if verified_total > 0 and (p_amount_due_inr is null or p_amount_due_inr < verified_total) then
      raise exception 'Amount due cannot be lower than verified payments' using errcode = '22023';
    end if;
  end if;

  update public.additional_service_enquiries e
    set enquiry_status = coalesce(p_enquiry_status, e.enquiry_status),
        order_status = coalesce(p_order_status, e.order_status),
        amount_due_inr = case
          when p_update_amount_due then p_amount_due_inr
          else e.amount_due_inr
        end
    where e.id = p_enquiry_id;

  return query
    select e.id, e.enquiry_status, e.order_status, e.payment_status, e.amount_due_inr, e.updated_at
    from public.additional_service_enquiries e
    where e.id = p_enquiry_id;
end;
$$;
revoke all on function public.update_additional_service_enquiry_workflow(uuid, text, text, boolean, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.update_additional_service_enquiry_workflow(uuid, text, text, boolean, integer)
  to authenticated;
alter function public.update_additional_service_enquiry_workflow(uuid, text, text, boolean, integer)
  owner to postgres;

create or replace function public.record_additional_service_enquiry_payment(
  p_enquiry_id uuid,
  p_amount_inr integer,
  p_payment_method text,
  p_payment_reference text,
  p_confirmed boolean
)
returns table (payment_id uuid, enquiry_payment_status text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  enquiry_due integer;
  already_verified bigint;
  created_payment_id uuid;
begin
  if auth.uid() is null
    or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if p_confirmed is distinct from true then
    raise exception 'Payment must be verified before recording' using errcode = '22023';
  end if;
  if p_amount_inr is null or p_amount_inr <= 0
    or p_payment_method is null or p_payment_method not in ('upi', 'bank_transfer', 'cash', 'other')
    or p_payment_reference is null or length(trim(p_payment_reference)) not between 1 and 120 then
    raise exception 'Invalid verified payment details' using errcode = '22023';
  end if;

  select amount_due_inr into enquiry_due
    from public.additional_service_enquiries
    where id = p_enquiry_id
    for update;
  if not found then
    raise exception 'Enquiry not found' using errcode = 'P0002';
  end if;
  if enquiry_due is null or enquiry_due = 0 then
    raise exception 'Set a confirmed amount due before recording payment' using errcode = '22023';
  end if;
  select coalesce(sum(amount_inr), 0) into already_verified
    from public.additional_service_enquiry_payments
    where enquiry_id = p_enquiry_id and payment_status = 'verified';
  if p_amount_inr > enquiry_due - already_verified then
    raise exception 'Payment exceeds the remaining amount due' using errcode = '22023';
  end if;

  insert into public.additional_service_enquiry_payments (
    enquiry_id, amount_inr, payment_method, payment_reference, verified_by
  ) values (
    p_enquiry_id, p_amount_inr, p_payment_method, trim(p_payment_reference), auth.uid()
  ) returning id into created_payment_id;

  return query
    select created_payment_id, e.payment_status
    from public.additional_service_enquiries e
    where e.id = p_enquiry_id;
end;
$$;

revoke all on function public.record_additional_service_enquiry_payment(uuid, integer, text, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.record_additional_service_enquiry_payment(uuid, integer, text, text, boolean)
  to authenticated;
alter function public.record_additional_service_enquiry_payment(uuid, integer, text, text, boolean)
  owner to postgres;

create or replace function public.consume_additional_service_enquiry_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_request_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid rate-limit key' using errcode = '22023';
  end if;

  delete from public.additional_service_enquiry_rate_limits
    where window_started_at < v_now - interval '1 day';

  insert into public.additional_service_enquiry_rate_limits as current_limit (
    ip_hash, window_started_at, request_count, updated_at
  ) values (p_ip_hash, v_now, 1, v_now)
  on conflict (ip_hash) do update
    set window_started_at = case
          when current_limit.window_started_at <= v_now - interval '1 hour' then v_now
          else current_limit.window_started_at
        end,
        request_count = case
          when current_limit.window_started_at <= v_now - interval '1 hour' then 1
          when current_limit.request_count >= 2147483647 then 2147483647
          else current_limit.request_count + 1
        end,
        updated_at = v_now
  returning request_count into v_request_count;

  return v_request_count <= 12;
end;
$$;
revoke all on function public.consume_additional_service_enquiry_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_additional_service_enquiry_rate_limit(text)
  to service_role;
alter function public.consume_additional_service_enquiry_rate_limit(text) owner to postgres;

create or replace function public.begin_additional_service_enquiry_submission(
  p_idempotency_key uuid,
  p_payload_hash text
)
returns table (outcome text, enquiry_id uuid, enquiry_reference text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_existing_hash text;
  v_existing_status text;
  v_lease_expires_at timestamptz;
  v_enquiry_id uuid;
  v_enquiry_reference text;
  v_now timestamptz := clock_timestamp();
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_idempotency_key is null
    or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid submission idempotency details' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  delete from public.additional_service_enquiry_idempotency
    where expires_at <= v_now;

  select i.payload_hash, i.submission_status, i.lease_expires_at, i.enquiry_id
    into v_existing_hash, v_existing_status, v_lease_expires_at, v_enquiry_id
    from public.additional_service_enquiry_idempotency i
    where i.idempotency_key = p_idempotency_key
    for update;

  if found then
    if v_existing_hash <> p_payload_hash then
      raise exception 'Idempotency key was already used with different details'
        using errcode = '22023';
    end if;
    if v_existing_status = 'completed' then
      select e.enquiry_reference into v_enquiry_reference
        from public.additional_service_enquiries e where e.id = v_enquiry_id;
      return query select 'replay'::text, v_enquiry_id, v_enquiry_reference;
      return;
    end if;
    if v_lease_expires_at > v_now then
      return query select 'in_progress'::text, null::uuid, null::text;
      return;
    end if;

    update public.additional_service_enquiry_idempotency i
      set lease_expires_at = v_now + interval '5 minutes',
          expires_at = v_now + interval '30 days',
          updated_at = v_now
      where i.idempotency_key = p_idempotency_key;
    return query select 'resume'::text, null::uuid, null::text;
    return;
  end if;

  insert into public.additional_service_enquiry_idempotency (
    idempotency_key, payload_hash, submission_status, lease_expires_at, expires_at
  ) values (
    p_idempotency_key, p_payload_hash, 'processing',
    v_now + interval '5 minutes', v_now + interval '30 days'
  );
  return query select 'started'::text, null::uuid, null::text;
end;
$$;
revoke all on function public.begin_additional_service_enquiry_submission(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.begin_additional_service_enquiry_submission(uuid, text)
  to service_role;
alter function public.begin_additional_service_enquiry_submission(uuid, text) owner to postgres;

create or replace function public.release_additional_service_enquiry_submission(
  p_idempotency_key uuid,
  p_payload_hash text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  update public.additional_service_enquiry_idempotency i
    set lease_expires_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where i.idempotency_key = p_idempotency_key
      and i.payload_hash = p_payload_hash
      and i.submission_status = 'processing';
end;
$$;
revoke all on function public.release_additional_service_enquiry_submission(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.release_additional_service_enquiry_submission(uuid, text)
  to service_role;
alter function public.release_additional_service_enquiry_submission(uuid, text) owner to postgres;

create or replace function public.complete_additional_service_enquiry_submission(
  p_idempotency_key uuid,
  p_payload_hash text,
  p_service_category text,
  p_service_details jsonb,
  p_customer_name text,
  p_mobile text,
  p_email text,
  p_location text,
  p_amount_due_inr integer,
  p_attachment jsonb
)
returns table (outcome text, enquiry_id uuid, enquiry_reference text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_existing_hash text;
  v_submission_status text;
  v_enquiry_id uuid;
  v_enquiry_reference text;
  v_object_path text;
  v_filename text;
  v_content_type text;
  v_file_size integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_idempotency_key is null
    or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_service_category not in ('bat-repair', 'glove-repair', 'pads-repair', 'leather-balls', 'jerseys')
    or p_service_details is null or jsonb_typeof(p_service_details) <> 'object' then
    raise exception 'Invalid enquiry details' using errcode = '22023';
  end if;

  select i.payload_hash, i.submission_status, i.enquiry_id
    into v_existing_hash, v_submission_status, v_enquiry_id
    from public.additional_service_enquiry_idempotency i
    where i.idempotency_key = p_idempotency_key
    for update;
  if not found then
    raise exception 'Submission reservation not found' using errcode = 'P0002';
  end if;
  if v_existing_hash <> p_payload_hash then
    raise exception 'Idempotency key was already used with different details'
      using errcode = '22023';
  end if;
  if v_submission_status = 'completed' then
    select e.enquiry_reference into v_enquiry_reference
      from public.additional_service_enquiries e where e.id = v_enquiry_id;
    return query select 'replay'::text, v_enquiry_id, v_enquiry_reference;
    return;
  end if;

  insert into public.additional_service_enquiries as inserted_enquiry (
    service_category, service_details, customer_name, mobile, email, location, amount_due_inr
  ) values (
    p_service_category, p_service_details, p_customer_name, p_mobile, p_email, p_location, p_amount_due_inr
  ) returning inserted_enquiry.id, inserted_enquiry.enquiry_reference
    into v_enquiry_id, v_enquiry_reference;

  if p_attachment is not null then
    if jsonb_typeof(p_attachment) <> 'object' then
      raise exception 'Invalid attachment details' using errcode = '22023';
    end if;
    v_object_path := p_attachment ->> 'objectPath';
    v_filename := p_attachment ->> 'originalFilename';
    v_content_type := p_attachment ->> 'contentType';
    v_file_size := (p_attachment ->> 'fileSizeBytes')::integer;
    if v_object_path is null
      or left(v_object_path, length('enquiries/' || p_idempotency_key::text || '.'))
        <> 'enquiries/' || p_idempotency_key::text || '.'
      or v_filename is null or length(v_filename) not between 1 and 160
      or v_content_type not in ('image/jpeg', 'image/png', 'image/webp')
      or v_file_size not between 1 and 5242880
      or (v_content_type = 'image/jpeg' and right(v_object_path, 4) <> '.jpg')
      or (v_content_type = 'image/png' and right(v_object_path, 4) <> '.png')
      or (v_content_type = 'image/webp' and right(v_object_path, 5) <> '.webp') then
      raise exception 'Invalid attachment metadata' using errcode = '22023';
    end if;

    insert into public.additional_service_enquiry_attachments (
      enquiry_id, object_path, original_filename, content_type, file_size_bytes
    ) values (
      v_enquiry_id, v_object_path, v_filename, v_content_type, v_file_size
    );
  end if;

  update public.additional_service_enquiry_idempotency i
    set enquiry_id = v_enquiry_id,
        submission_status = 'completed',
        lease_expires_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where i.idempotency_key = p_idempotency_key;

  return query select 'created'::text, v_enquiry_id, v_enquiry_reference;
end;
$$;
revoke all on function public.complete_additional_service_enquiry_submission(
  uuid, text, text, jsonb, text, text, text, text, integer, jsonb
) from public, anon, authenticated, service_role;
-- Service-role access is required only by the public submission backend.
grant execute on function public.complete_additional_service_enquiry_submission(
  uuid, text, text, jsonb, text, text, text, text, integer, jsonb
) to service_role;
alter function public.complete_additional_service_enquiry_submission(
  uuid, text, text, jsonb, text, text, text, text, integer, jsonb
) owner to postgres;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'additional-service-enquiries',
  'additional-service-enquiries',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set name = excluded.name,
      public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Admins can read additional service enquiry attachments from storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'additional-service-enquiries'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Restrict additional service attachment reads"
  on storage.objects as restrictive for select to public
  using (
    bucket_id <> 'additional-service-enquiries'
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Restrict direct additional service attachment inserts"
  on storage.objects as restrictive for insert to public
  with check (bucket_id <> 'additional-service-enquiries');

create policy "Restrict direct additional service attachment updates"
  on storage.objects as restrictive for update to public
  using (bucket_id <> 'additional-service-enquiries')
  with check (bucket_id <> 'additional-service-enquiries');

create policy "Restrict direct additional service attachment deletes"
  on storage.objects as restrictive for delete to public
  using (bucket_id <> 'additional-service-enquiries');
