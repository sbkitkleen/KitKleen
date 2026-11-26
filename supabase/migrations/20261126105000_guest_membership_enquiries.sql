create table public.membership_enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null
    check (length(trim(customer_name)) between 2 and 120),
  customer_mobile text not null
    check (customer_mobile ~ '^\+[1-9][0-9]{7,14}$'),
  customer_email text
    check (
      customer_email is null
      or (
        length(customer_email) <= 254
        and customer_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  plan_id text not null
    check (plan_id in ('player-care', 'pro-player', 'club-academy')),
  message text not null
    check (length(trim(message)) between 1 and 2000),
  enquiry_status text not null default 'submitted'
    check (enquiry_status in ('submitted', 'reviewing', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index membership_enquiries_created_at_idx
  on public.membership_enquiries (created_at desc);

create table public.membership_enquiry_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create table public.membership_enquiry_submission_idempotency (
  idempotency_key uuid primary key,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  enquiry_id uuid not null references public.membership_enquiries(id),
  enquiry_status text not null
    check (enquiry_status in ('submitted', 'reviewing', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.membership_enquiries enable row level security;
alter table public.membership_enquiry_rate_limits enable row level security;
alter table public.membership_enquiry_submission_idempotency enable row level security;

revoke all on public.membership_enquiries from public, anon, authenticated;
revoke all on public.membership_enquiry_rate_limits from public, anon, authenticated;
revoke all on public.membership_enquiry_submission_idempotency
  from public, anon, authenticated;
grant all on public.membership_enquiries to service_role;
grant all on public.membership_enquiry_rate_limits to service_role;
grant all on public.membership_enquiry_submission_idempotency to service_role;
grant select on public.membership_enquiries to authenticated;
grant update (enquiry_status) on public.membership_enquiries to authenticated;

create policy "Admins can read guest membership enquiries"
  on public.membership_enquiries for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can update guest membership enquiry status"
  on public.membership_enquiries for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and enquiry_status in ('submitted', 'reviewing', 'contacted', 'closed')
  );

create or replace function public.consume_membership_enquiry_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_request_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid client network hash' using errcode = '22023';
  end if;

  insert into public.membership_enquiry_rate_limits as existing_limit (
    ip_hash, window_started_at, request_count
  ) values (p_ip_hash, clock_timestamp(), 1)
  on conflict (ip_hash) do update
    set window_started_at = case
          when existing_limit.window_started_at <= clock_timestamp() - interval '1 hour'
            then clock_timestamp()
          else existing_limit.window_started_at
        end,
        request_count = case
          when existing_limit.window_started_at <= clock_timestamp() - interval '1 hour'
            then 1
          else existing_limit.request_count + 1
        end
  returning request_count into v_request_count;

  return v_request_count <= 5;
end;
$$;
revoke all on function public.consume_membership_enquiry_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_membership_enquiry_rate_limit(text)
  to service_role;
alter function public.consume_membership_enquiry_rate_limit(text) owner to postgres;

create or replace function public.submit_membership_enquiry_idempotent(
  p_idempotency_key uuid,
  p_payload_hash text,
  p_ip_hash text,
  p_customer_name text,
  p_customer_mobile text,
  p_customer_email text,
  p_plan_id text,
  p_message text
)
returns table (enquiry_id uuid, enquiry_status text, created boolean)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_existing_hash text;
  v_enquiry_id uuid;
  v_enquiry_status text;
  v_rate_allowed boolean;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_idempotency_key is null
    or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid membership submission idempotency details'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));

  select i.payload_hash, i.enquiry_id, e.enquiry_status
    into v_existing_hash, v_enquiry_id, v_enquiry_status
    from public.membership_enquiry_submission_idempotency i
    join public.membership_enquiries e on e.id = i.enquiry_id
    where i.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_hash <> p_payload_hash then
      raise exception 'Idempotency key was already used with different details'
        using errcode = 'P4090';
    end if;
    return query select v_enquiry_id, v_enquiry_status, false;
    return;
  end if;

  select public.consume_membership_enquiry_rate_limit(p_ip_hash)
    into v_rate_allowed;
  if v_rate_allowed is distinct from true then
    raise exception 'Membership enquiry rate limit exceeded'
      using errcode = 'P4290';
  end if;

  insert into public.membership_enquiries as inserted_enquiry (
    customer_name,
    customer_mobile,
    customer_email,
    plan_id,
    message
  ) values (
    p_customer_name,
    p_customer_mobile,
    p_customer_email,
    p_plan_id,
    p_message
  )
  returning inserted_enquiry.id, inserted_enquiry.enquiry_status
    into v_enquiry_id, v_enquiry_status;

  insert into public.membership_enquiry_submission_idempotency (
    idempotency_key,
    payload_hash,
    enquiry_id,
    enquiry_status
  ) values (
    p_idempotency_key,
    p_payload_hash,
    v_enquiry_id,
    v_enquiry_status
  );

  return query select v_enquiry_id, v_enquiry_status, true;
end;
$$;
revoke all on function public.submit_membership_enquiry_idempotent(
  uuid, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.submit_membership_enquiry_idempotent(
  uuid, text, text, text, text, text, text, text
) to service_role;
alter function public.submit_membership_enquiry_idempotent(
  uuid, text, text, text, text, text, text, text
) owner to postgres;

create or replace function public.set_guest_membership_enquiry_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.set_guest_membership_enquiry_updated_at()
  from public, anon, authenticated, service_role;
alter function public.set_guest_membership_enquiry_updated_at() owner to postgres;

create trigger guest_membership_enquiries_set_updated_at
  before update on public.membership_enquiries
  for each row execute function public.set_guest_membership_enquiry_updated_at();
