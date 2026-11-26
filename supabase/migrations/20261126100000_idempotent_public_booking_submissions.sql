create table if not exists public.booking_submission_idempotency (
  idempotency_key uuid primary key,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  booking_id uuid not null references public.bookings(id),
  created_at timestamptz not null default now()
);

alter table public.booking_submission_idempotency enable row level security;
revoke all on public.booking_submission_idempotency from public, anon, authenticated;
grant all on public.booking_submission_idempotency to service_role;

create or replace function public.submit_public_booking_idempotent(
  p_booking jsonb,
  p_items jsonb,
  p_idempotency_key uuid,
  p_payload_hash text,
  p_ip_hash text
)
returns table (booking_id uuid, created boolean)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_existing_hash text;
  v_booking_id uuid;
  v_rate_allowed boolean;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_idempotency_key is null
    or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid booking submission idempotency details' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));

  select i.payload_hash, i.booking_id
    into v_existing_hash, v_booking_id
    from public.booking_submission_idempotency i
    where i.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_hash <> p_payload_hash then
      raise exception 'Idempotency key was already used with different details'
        using errcode = 'P4090';
    end if;
    return query select v_booking_id, false;
    return;
  end if;

  select public.consume_public_booking_rate_limit(p_ip_hash)
    into v_rate_allowed;
  if v_rate_allowed is distinct from true then
    raise exception 'Booking submission rate limit exceeded' using errcode = 'P4290';
  end if;

  v_booking_id := public.submit_public_booking(p_booking, p_items);

  insert into public.booking_submission_idempotency (
    idempotency_key, payload_hash, booking_id
  ) values (
    p_idempotency_key, p_payload_hash, v_booking_id
  );

  return query select v_booking_id, true;
end;
$$;
revoke all on function public.submit_public_booking_idempotent(jsonb, jsonb, uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_public_booking_idempotent(jsonb, jsonb, uuid, text, text)
  to service_role;
alter function public.submit_public_booking_idempotent(jsonb, jsonb, uuid, text, text)
  owner to postgres;
