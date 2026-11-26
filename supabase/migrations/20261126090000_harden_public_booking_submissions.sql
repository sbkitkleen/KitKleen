revoke insert on table public.bookings, public.booking_items from public, anon;
revoke insert (
  id,
  customer_name,
  mobile,
  email,
  location,
  service_type,
  preferred_date,
  notes,
  estimated_total,
  status
) on table public.bookings from public, anon;
revoke insert (
  booking_id,
  item_name,
  quantity,
  unit_price,
  total_price
) on table public.booking_items from public, anon;

create table if not exists public.booking_submission_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

alter table public.booking_submission_rate_limits enable row level security;
revoke all on public.booking_submission_rate_limits from public, anon, authenticated;
grant all on public.booking_submission_rate_limits to service_role;

create or replace function public.consume_public_booking_rate_limit(p_ip_hash text)
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

  delete from public.booking_submission_rate_limits
    where window_started_at < v_now - interval '1 day';

  insert into public.booking_submission_rate_limits as current_limit (
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
revoke all on function public.consume_public_booking_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_public_booking_rate_limit(text) to service_role;
alter function public.consume_public_booking_rate_limit(text) owner to postgres;

create or replace function public.submit_public_booking(
  p_booking jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_booking_id uuid := gen_random_uuid();
  v_item jsonb;
  v_item_count integer;
  v_quantity integer;
  v_unit_price integer;
  v_line_total integer;
  v_estimated_total integer;
  v_items_total bigint := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_booking is null or jsonb_typeof(p_booking) is distinct from 'object'
    or p_booking - array[
      'customer_name', 'mobile', 'email', 'location', 'service_type',
      'preferred_date', 'notes', 'estimated_total'
    ] <> '{}'::jsonb
    or p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Invalid booking details' using errcode = '22023';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 50
    or jsonb_typeof(p_booking -> 'customer_name') is distinct from 'string'
    or length(trim(p_booking ->> 'customer_name')) not between 1 and 120
    or jsonb_typeof(p_booking -> 'mobile') is distinct from 'string'
    or (p_booking ->> 'mobile') !~ '^[0-9+() -]{7,18}$'
    or jsonb_typeof(p_booking -> 'location') is distinct from 'string'
    or length(trim(p_booking ->> 'location')) not between 1 and 240
    or jsonb_typeof(p_booking -> 'service_type') is distinct from 'string'
    or length(trim(p_booking ->> 'service_type')) not between 1 and 200
    or jsonb_typeof(p_booking -> 'preferred_date') is distinct from 'string'
    or (p_booking ->> 'preferred_date') !~ '^\d{4}-\d{2}-\d{2}$'
    or jsonb_typeof(p_booking -> 'estimated_total') is distinct from 'number' then
    raise exception 'Invalid booking details' using errcode = '22023';
  end if;
  if (p_booking ->> 'estimated_total') !~ '^\d{1,10}$' then
    raise exception 'Invalid booking total' using errcode = '22023';
  end if;
  if (p_booking ->> 'estimated_total')::bigint > 2147483647 then
    raise exception 'Invalid booking total' using errcode = '22023';
  end if;

  if p_booking -> 'email' <> 'null'::jsonb
    and (
      jsonb_typeof(p_booking -> 'email') is distinct from 'string'
      or length(trim(p_booking ->> 'email')) > 254
      or (p_booking ->> 'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) then
    raise exception 'Invalid booking email' using errcode = '22023';
  end if;
  if p_booking -> 'notes' <> 'null'::jsonb
    and (
      jsonb_typeof(p_booking -> 'notes') is distinct from 'string'
      or length(p_booking ->> 'notes') > 2000
    ) then
    raise exception 'Invalid booking notes' using errcode = '22023';
  end if;

  v_estimated_total := (p_booking ->> 'estimated_total')::integer;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or v_item - array['item_name', 'quantity', 'unit_price', 'total_price'] <> '{}'::jsonb
      or jsonb_typeof(v_item -> 'item_name') is distinct from 'string'
      or length(trim(v_item ->> 'item_name')) not between 1 and 240
      or jsonb_typeof(v_item -> 'quantity') is distinct from 'number'
      or (v_item ->> 'quantity') !~ '^\d{1,5}$'
      or jsonb_typeof(v_item -> 'unit_price') is distinct from 'number'
      or (v_item ->> 'unit_price') !~ '^\d{1,10}$'
      or jsonb_typeof(v_item -> 'total_price') is distinct from 'number'
      or (v_item ->> 'total_price') !~ '^\d{1,10}$' then
      raise exception 'Invalid booking item details' using errcode = '22023';
    end if;
    if (v_item ->> 'unit_price')::bigint > 2147483647
      or (v_item ->> 'total_price')::bigint > 2147483647 then
      raise exception 'Invalid booking item details' using errcode = '22023';
    end if;

    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unit_price')::integer;
    v_line_total := (v_item ->> 'total_price')::integer;
    if v_quantity < 1
      or v_line_total::bigint <> v_quantity::bigint * v_unit_price::bigint then
      raise exception 'Invalid booking item totals' using errcode = '22023';
    end if;
    v_items_total := v_items_total + v_line_total;
  end loop;

  if v_items_total <> v_estimated_total then
    raise exception 'Booking total does not match the submitted items' using errcode = '22023';
  end if;

  insert into public.bookings (
    id, customer_name, mobile, email, location, service_type,
    preferred_date, notes, estimated_total, status
  ) values (
    v_booking_id,
    trim(p_booking ->> 'customer_name'),
    trim(p_booking ->> 'mobile'),
    nullif(trim(p_booking ->> 'email'), ''),
    trim(p_booking ->> 'location'),
    trim(p_booking ->> 'service_type'),
    (p_booking ->> 'preferred_date')::date,
    nullif(trim(p_booking ->> 'notes'), ''),
    v_estimated_total,
    'new'
  );

  insert into public.booking_items (
    booking_id, item_name, quantity, unit_price, total_price
  )
  select
    v_booking_id,
    trim(item ->> 'item_name'),
    (item ->> 'quantity')::integer,
    (item ->> 'unit_price')::integer,
    (item ->> 'total_price')::integer
  from jsonb_array_elements(p_items) as submitted_items(item);

  return v_booking_id;
end;
$$;

revoke all on function public.submit_public_booking(jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_public_booking(jsonb, jsonb) to service_role;
alter function public.submit_public_booking(jsonb, jsonb) owner to postgres;
