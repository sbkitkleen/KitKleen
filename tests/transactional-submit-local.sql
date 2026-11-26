-- Run after applying the Orders hardening migration to an isolated test database.
-- All test records and rate-limit rows are rolled back.
begin;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_ip text := repeat('d', 64);
  v_key uuid := gen_random_uuid();
  v_hash text := repeat('a', 64);
  v_order jsonb := jsonb_build_object(
    'customer_name', 'Local RPC Test',
    'customer_mobile', '+919876543210',
    'customer_email', 'local-test@example.com',
    'customer_location', 'Hyderabad',
    'delivery_address', 'Test Address, Hyderabad',
    'pickup_instructions', null,
    'customer_notes', null,
    'handover_method', 'pickup',
    'requested_handover_at', (now() + interval '2 days')::timestamp::text,
    'payment_preference', 'upi',
    'subtotal_paise', 15000,
    'customer_notification_opt_in', false
  );
  v_items jsonb := jsonb_build_array(jsonb_build_object(
    'item_type', 'gear', 'item_id', 'local-test-gear',
    'item_name', 'Local Test Gear', 'care_level', 'deep',
    'quantity', 1, 'unit_price_paise', 15000, 'line_total_paise', 15000
  ));
  v_first jsonb;
  v_second jsonb;
  v_id uuid;
  v_count integer;
  i integer;
  v_extra_order jsonb;
begin
  v_first := public.submit_kitkleen_order(v_key, v_hash, v_order, v_items, v_ip);
  if (v_first->>'created')::boolean is not true then
    raise exception 'FAIL: first submission was not created';
  end if;
  raise notice 'PASS: first submission created';

  v_second := public.submit_kitkleen_order(v_key, v_hash, v_order, v_items, v_ip);
  if (v_second->>'created')::boolean is not false
     or v_second->>'order_id' <> v_first->>'order_id' then
    raise exception 'FAIL: retry did not return original order';
  end if;
  raise notice 'PASS: same-key retry returned original order';

  begin
    perform public.submit_kitkleen_order(v_key, repeat('b', 64), v_order, v_items, v_ip);
    raise exception 'FAIL: changed payload with same key was accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: same key with different payload rejected';
  end;

  select count(*) into v_count from public.order_items
    where order_id = (v_first->>'order_id')::uuid;
  if v_count <> 1 then raise exception 'FAIL: expected one order item, got %', v_count; end if;
  raise notice 'PASS: exactly one order item persisted';

  -- Four further new submissions reach the five-per-hour allowance.
  for i in 1..4 loop
    v_extra_order := v_order || jsonb_build_object('customer_name', 'Local RPC Test ' || i);
    perform public.submit_kitkleen_order(gen_random_uuid(), repeat('e', 64), v_extra_order, v_items, v_ip);
  end loop;
  raise notice 'PASS: five distinct new submissions allowed';

  begin
    perform public.submit_kitkleen_order(gen_random_uuid(), repeat('f', 64), v_order, v_items, v_ip);
    raise exception 'FAIL: sixth new submission was accepted';
  exception when sqlstate 'P4290' then
    raise notice 'PASS: sixth new submission rate limited';
  end;

  -- A replay after the limit is reached must still return the original order.
  v_second := public.submit_kitkleen_order(v_key, v_hash, v_order, v_items, v_ip);
  if (v_second->>'created')::boolean is not false then
    raise exception 'FAIL: idempotent retry failed after rate limit';
  end if;
  raise notice 'PASS: retry bypasses new-submission rate limit';

  -- Subtotal mismatch rejected.
  begin
    perform public.submit_kitkleen_order(
      gen_random_uuid(), repeat('1', 64),
      v_order || jsonb_build_object('subtotal_paise', 14999), v_items, repeat('1', 64)
    );
    raise exception 'FAIL: incorrect subtotal was accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: incorrect subtotal rejected';
  end;

  -- Invalid line arithmetic rejected.
  begin
    perform public.submit_kitkleen_order(
      gen_random_uuid(), repeat('2', 64), v_order,
      jsonb_build_array(jsonb_set(v_items->0, '{line_total_paise}', '14999'::jsonb)), repeat('2', 64)
    );
    raise exception 'FAIL: invalid item arithmetic was accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: invalid item arithmetic rejected';
  end;

  -- 51 items rejected before any write.
  begin
    perform public.submit_kitkleen_order(
      gen_random_uuid(), repeat('3', 64), v_order,
      (select jsonb_agg(v_items->0) from generate_series(1,51)), repeat('3', 64)
    );
    raise exception 'FAIL: 51 item lines were accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: 51 item lines rejected';
  end;
end $$;

rollback;

select count(*) as test_orders_remaining
from public.orders
where customer_name like 'Local RPC Test%';
