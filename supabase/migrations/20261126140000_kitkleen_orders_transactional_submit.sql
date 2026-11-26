-- KitKleen Orders: atomic order + item submission with idempotency.
-- Local validation first. Do not apply to Production without explicit approval.

begin;

create or replace function public.submit_kitkleen_order(
  p_idempotency_key uuid,
  p_payload_hash text,
  p_order jsonb,
  p_items jsonb
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
begin
  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Idempotency key is required';
  end if;

  if p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid payload hash';
  end if;

  if jsonb_typeof(p_order) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Order payload must be a JSON object';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Order items must be a JSON array';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 30 then
    raise exception using errcode = '22023', message = 'An order must contain between 1 and 30 items';
  end if;

  -- Serialize retries sharing the same key before checking/inserting the record.
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

    select o.order_reference
      into v_order_reference
    from public.orders as o
    where o.id = v_existing_order_id;

    return pg_catalog.jsonb_build_object(
      'order_id', v_existing_order_id,
      'order_reference', v_order_reference,
      'created', false
    );
  end if;

  -- Prices and item descriptions must already have been resolved by trusted
  -- server-side code against lib/data.ts. This function persists those values;
  -- it does not trust or calculate browser-supplied catalogue prices.
  v_order_reference :=
    'KK-' || pg_catalog.to_char(pg_catalog.now() at time zone 'Asia/Kolkata', 'YYYYMMDD')
    || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    order_reference,
    customer_name,
    customer_mobile,
    customer_email,
    customer_location,
    delivery_address,
    pickup_instructions,
    customer_notes,
    handover_method,
    requested_handover_at,
    payment_preference,
    payment_status,
    currency_code,
    subtotal_paise,
    extra_charges_paise,
    discount_paise,
    tax_amount_paise,
    total_paise,
    amount_paid_paise,
    balance_due_paise,
    customer_notification_opt_in
  )
  values (
    v_order_reference,
    p_order->>'customer_name',
    p_order->>'customer_mobile',
    nullif(p_order->>'customer_email', ''),
    p_order->>'customer_location',
    nullif(p_order->>'delivery_address', ''),
    nullif(p_order->>'pickup_instructions', ''),
    nullif(p_order->>'customer_notes', ''),
    p_order->>'handover_method',
    (p_order->>'requested_handover_at')::timestamp,
    p_order->>'payment_preference',
    'pending',
    'INR',
    (p_order->>'subtotal_paise')::bigint,
    0,
    0,
    0,
    (p_order->>'subtotal_paise')::bigint,
    0,
    (p_order->>'subtotal_paise')::bigint,
    coalesce((p_order->>'customer_notification_opt_in')::boolean, false)
  )
  returning id into v_order_id;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      item_type,
      item_id,
      item_name,
      care_level,
      quantity,
      unit_price_paise,
      line_total_paise
    )
    values (
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
  )
  values (
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

  insert into public.order_submission_idempotency (
    idempotency_key, payload_hash, order_id
  )
  values (
    p_idempotency_key, p_payload_hash, v_order_id
  );

  return pg_catalog.jsonb_build_object(
    'order_id', v_order_id,
    'order_reference', v_order_reference,
    'created', true
  );
end;
$function$;

revoke all on function public.submit_kitkleen_order(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_kitkleen_order(uuid, text, jsonb, jsonb)
  to service_role;

commit;
