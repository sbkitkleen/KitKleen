-- KitKleen Orders submission hardening v2.
-- Adds database-side payload/amount validation and makes idempotency precede rate limiting.
-- Apply only after reviewing this migration and testing against the intended Supabase project.

begin;

create or replace function public.consume_kitkleen_order_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid rate-limit key';
  end if;

  insert into public.order_submission_rate_limits (
    ip_hash, window_started_at, request_count, updated_at
  ) values (p_ip_hash, pg_catalog.clock_timestamp(), 1, pg_catalog.clock_timestamp())
  on conflict (ip_hash) do update
  set
    request_count = case
      when public.order_submission_rate_limits.window_started_at <= pg_catalog.clock_timestamp() - interval '1 hour'
        then 1
      else public.order_submission_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.order_submission_rate_limits.window_started_at <= pg_catalog.clock_timestamp() - interval '1 hour'
        then pg_catalog.clock_timestamp()
      else public.order_submission_rate_limits.window_started_at
    end,
    updated_at = pg_catalog.clock_timestamp()
  returning request_count into v_count;

  return v_count <= 5;
end;
$function$;

revoke all on function public.consume_kitkleen_order_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_kitkleen_order_rate_limit(text) to service_role;
alter function public.consume_kitkleen_order_rate_limit(text) owner to postgres;

create or replace function public.submit_kitkleen_order(
  p_idempotency_key uuid,
  p_payload_hash text,
  p_order jsonb,
  p_items jsonb,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing_hash text;
  v_existing_order_id uuid;
  v_order_id uuid;
  v_order_reference text;
  v_item jsonb;
  v_item_count integer;
  v_item_qty numeric;
  v_item_unit numeric;
  v_item_line numeric;
  v_total_qty numeric := 0;
  v_items_subtotal numeric := 0;
  v_order_subtotal numeric;
  v_rate_allowed boolean;
  v_requested_at timestamp without time zone;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Idempotency key is required';
  end if;
  if p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid payload hash';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid client network hash';
  end if;
  if pg_catalog.jsonb_typeof(p_order) is distinct from 'object'
     or (select count(*) from pg_catalog.jsonb_object_keys(p_order)) <> 12
     or not (p_order ?& array[
       'customer_name','customer_mobile','customer_email','customer_location',
       'delivery_address','pickup_instructions','customer_notes','handover_method',
       'requested_handover_at','payment_preference','subtotal_paise',
       'customer_notification_opt_in'
     ]) then
    raise exception using errcode = '22023', message = 'Invalid order payload fields';
  end if;
  if pg_catalog.jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Order items must be a JSON array';
  end if;
  v_item_count := pg_catalog.jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 50 then
    raise exception using errcode = '22023', message = 'An order must contain between 1 and 50 items';
  end if;

  -- Serialize requests sharing an idempotency key. A legitimate replay exits before rate limiting.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key::text, 0)
  );
  select i.payload_hash, i.order_id
    into v_existing_hash, v_existing_order_id
    from public.order_submission_idempotency as i
    where i.idempotency_key = p_idempotency_key;
  if found then
    if v_existing_hash <> p_payload_hash then
      raise exception using errcode = '22023',
        message = 'Idempotency key was already used with a different request';
    end if;
    select o.order_reference into v_order_reference
      from public.orders as o where o.id = v_existing_order_id;
    if v_order_reference is null then
      raise exception using errcode = '22023', message = 'Existing order could not be resolved';
    end if;
    return pg_catalog.jsonb_build_object(
      'order_id', v_existing_order_id,
      'order_reference', v_order_reference,
      'created', false
    );
  end if;

  -- Validate order values before writing any rows.
  if pg_catalog.jsonb_typeof(p_order->'customer_name') <> 'string'
     or pg_catalog.length(pg_catalog.btrim(p_order->>'customer_name')) not between 1 and 120
     or pg_catalog.jsonb_typeof(p_order->'customer_mobile') <> 'string'
     or (p_order->>'customer_mobile') !~ '^\+[1-9][0-9]{7,14}$'
     or pg_catalog.jsonb_typeof(p_order->'customer_location') <> 'string'
     or pg_catalog.length(pg_catalog.btrim(p_order->>'customer_location')) not between 1 and 240
     or pg_catalog.jsonb_typeof(p_order->'handover_method') <> 'string'
     or p_order->>'handover_method' not in ('pickup','customer_dropoff')
     or pg_catalog.jsonb_typeof(p_order->'payment_preference') <> 'string'
     or p_order->>'payment_preference' not in ('razorpay','upi','cash')
     or pg_catalog.jsonb_typeof(p_order->'customer_notification_opt_in') <> 'boolean' then
    raise exception using errcode = '22023', message = 'Invalid order customer or preference fields';
  end if;
  if pg_catalog.jsonb_typeof(p_order->'customer_email') not in ('string','null')
     or pg_catalog.jsonb_typeof(p_order->'delivery_address') not in ('string','null')
     or pg_catalog.jsonb_typeof(p_order->'pickup_instructions') not in ('string','null')
     or pg_catalog.jsonb_typeof(p_order->'customer_notes') not in ('string','null') then
    raise exception using errcode = '22023', message = 'Invalid optional order fields';
  end if;
  if coalesce(p_order->>'customer_email','') <> ''
     and ((p_order->>'customer_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       or pg_catalog.length(p_order->>'customer_email') > 254) then
    raise exception using errcode = '22023', message = 'Invalid customer email';
  end if;
  if pg_catalog.length(coalesce(p_order->>'delivery_address','')) > 500
     or pg_catalog.length(coalesce(p_order->>'pickup_instructions','')) > 500
     or pg_catalog.length(coalesce(p_order->>'customer_notes','')) > 2000
     or (p_order->>'handover_method' = 'pickup' and pg_catalog.length(pg_catalog.btrim(coalesce(p_order->>'delivery_address',''))) = 0) then
    raise exception using errcode = '22023', message = 'Invalid handover or notes fields';
  end if;
  if pg_catalog.jsonb_typeof(p_order->'subtotal_paise') <> 'number'
     or (p_order->>'subtotal_paise') !~ '^[0-9]+$' then
    raise exception using errcode = '22023', message = 'Invalid order subtotal';
  end if;
  v_order_subtotal := (p_order->>'subtotal_paise')::numeric;
  if v_order_subtotal < 0 or v_order_subtotal > 2147483647 then
    raise exception using errcode = '22023', message = 'Order subtotal is outside the permitted range';
  end if;
  if pg_catalog.jsonb_typeof(p_order->'requested_handover_at') is distinct from 'string'
     or pg_catalog.btrim(coalesce(p_order->>'requested_handover_at', '')) = '' then
    raise exception using errcode = '22023', message = 'Requested handover date is required';
  end if;

  begin
    v_requested_at := (p_order->>'requested_handover_at')::timestamp without time zone;
  exception when others then
    raise exception using errcode = '22023', message = 'Invalid requested handover date';
  end;

  -- Independently verify every item and calculate the authoritative subtotal.
  for v_item in select value from pg_catalog.jsonb_array_elements(p_items)
  loop
    if pg_catalog.jsonb_typeof(v_item) is distinct from 'object'
       or (select count(*) from pg_catalog.jsonb_object_keys(v_item)) <> 7
       or not (v_item ?& array['item_type','item_id','item_name','care_level','quantity','unit_price_paise','line_total_paise'])
       or pg_catalog.jsonb_typeof(v_item->'item_type') <> 'string'
       or v_item->>'item_type' not in ('gear','package')
       or pg_catalog.jsonb_typeof(v_item->'item_id') <> 'string'
       or pg_catalog.length(pg_catalog.btrim(v_item->>'item_id')) not between 1 and 120
       or pg_catalog.jsonb_typeof(v_item->'item_name') <> 'string'
       or pg_catalog.length(pg_catalog.btrim(v_item->>'item_name')) not between 1 and 240
       or pg_catalog.jsonb_typeof(v_item->'care_level') <> 'string'
       or v_item->>'care_level' not in ('fresh','deep','elite')
       or pg_catalog.jsonb_typeof(v_item->'quantity') <> 'number'
       or (v_item->>'quantity') !~ '^[0-9]+$'
       or pg_catalog.jsonb_typeof(v_item->'unit_price_paise') <> 'number'
       or (v_item->>'unit_price_paise') !~ '^[0-9]+$'
       or pg_catalog.jsonb_typeof(v_item->'line_total_paise') <> 'number'
       or (v_item->>'line_total_paise') !~ '^[0-9]+$' then
      raise exception using errcode = '22023', message = 'Invalid order item fields';
    end if;
    v_item_qty := (v_item->>'quantity')::numeric;
    v_item_unit := (v_item->>'unit_price_paise')::numeric;
    v_item_line := (v_item->>'line_total_paise')::numeric;
    if v_item_qty not between 1 and 100
       or v_item_unit < 0 or v_item_unit > 2147483647
       or v_item_line <> v_item_qty * v_item_unit
       or v_item_line > 2147483647 then
      raise exception using errcode = '22023', message = 'Invalid order item amount or quantity';
    end if;
    v_total_qty := v_total_qty + v_item_qty;
    v_items_subtotal := v_items_subtotal + v_item_line;
    if v_total_qty > 200 or v_items_subtotal > 2147483647 then
      raise exception using errcode = '22023', message = 'Order quantity or subtotal exceeds the permitted limit';
    end if;
  end loop;
  if v_items_subtotal <> v_order_subtotal then
    raise exception using errcode = '22023', message = 'Order subtotal does not match item totals';
  end if;

  select public.consume_kitkleen_order_rate_limit(p_ip_hash) into v_rate_allowed;
  if v_rate_allowed is distinct from true then
    raise exception using errcode = 'P4290', message = 'Order submission rate limit exceeded';
  end if;

  v_order_reference :=
    'KK-' || pg_catalog.to_char(pg_catalog.now() at time zone 'Asia/Kolkata', 'YYYYMMDD')
    || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    order_reference, customer_name, customer_mobile, customer_email, customer_location,
    delivery_address, pickup_instructions, customer_notes, handover_method,
    requested_handover_at, payment_preference, payment_status, currency_code,
    subtotal_paise, extra_charges_paise, discount_paise, tax_amount_paise,
    total_paise, amount_paid_paise, balance_due_paise, customer_notification_opt_in
  ) values (
    v_order_reference,
    p_order->>'customer_name',
    p_order->>'customer_mobile',
    nullif(p_order->>'customer_email',''),
    p_order->>'customer_location',
    nullif(p_order->>'delivery_address',''),
    nullif(p_order->>'pickup_instructions',''),
    nullif(p_order->>'customer_notes',''),
    p_order->>'handover_method',
    v_requested_at,
    p_order->>'payment_preference',
    'pending', 'INR', v_order_subtotal::bigint, 0, 0, 0,
    v_order_subtotal::bigint, 0, v_order_subtotal::bigint, false
  ) returning id into v_order_id;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, item_type, item_id, item_name, care_level,
      quantity, unit_price_paise, line_total_paise
    ) values (
      v_order_id,
      v_item->>'item_type',
      v_item->>'item_id',
      v_item->>'item_name',
      v_item->>'care_level',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price_paise')::bigint,
      (v_item->>'line_total_paise')::bigint
    );
  end loop;

  insert into public.order_events (
    order_id, event_type, new_value, event_description, actor_type
  ) values (
    v_order_id,
    'order_submitted',
    pg_catalog.jsonb_build_object(
      'order_reference', v_order_reference,
      'item_count', v_item_count,
      'payment_preference', p_order->>'payment_preference'
    ),
    'Customer submitted an order',
    'customer'
  );

  insert into public.order_submission_idempotency (idempotency_key, payload_hash, order_id)
  values (p_idempotency_key, p_payload_hash, v_order_id);

  return pg_catalog.jsonb_build_object(
    'order_id', v_order_id,
    'order_reference', v_order_reference,
    'created', true
  );
end;
$function$;

revoke all on function public.submit_kitkleen_order(uuid, text, jsonb, jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_kitkleen_order(uuid, text, jsonb, jsonb, text)
  to service_role;
alter function public.submit_kitkleen_order(uuid, text, jsonb, jsonb, text) owner to postgres;

-- Retain the four-argument function temporarily for deployment compatibility.
commit;
