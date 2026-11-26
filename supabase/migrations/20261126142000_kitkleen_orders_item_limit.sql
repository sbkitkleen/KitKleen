BEGIN;

CREATE OR REPLACE FUNCTION public.submit_kitkleen_order(
  p_idempotency_key uuid,
  p_payload_hash text,
  p_order jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing_hash text;
  v_existing_order_id uuid;
  v_order_id uuid;
  v_order_reference text;
  v_item jsonb;
  v_item_count integer;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Idempotency key is required';
  END IF;

  IF p_payload_hash IS NULL OR p_payload_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid payload hash';
  END IF;

  IF jsonb_typeof(p_order) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid order payload';
  END IF;

  v_item_count := jsonb_array_length(p_items);

  IF v_item_count < 1 OR v_item_count > 50 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'An order must contain between 1 and 50 items';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key::text, 0)
  );

  SELECT i.payload_hash, i.order_id
  INTO v_existing_hash, v_existing_order_id
  FROM public.order_submission_idempotency AS i
  WHERE i.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_hash <> p_payload_hash THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Idempotency key was already used with a different request';
    END IF;

    SELECT o.order_reference
    INTO v_order_reference
    FROM public.orders AS o
    WHERE o.id = v_existing_order_id;

    RETURN pg_catalog.jsonb_build_object(
      'order_id', v_existing_order_id,
      'order_reference', v_order_reference,
      'created', false
    );
  END IF;

  v_order_reference :=
    'KK-' ||
    pg_catalog.to_char(
      pg_catalog.now() AT TIME ZONE 'Asia/Kolkata',
      'YYYYMMDD'
    ) ||
    '-' ||
    pg_catalog.upper(
      pg_catalog.substr(
        pg_catalog.replace(gen_random_uuid()::text, '-', ''),
        1,
        8
      )
    );

  INSERT INTO public.orders (
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
  VALUES (
    v_order_reference,
    p_order->>'customer_name',
    p_order->>'customer_mobile',
    NULLIF(p_order->>'customer_email', ''),
    p_order->>'customer_location',
    NULLIF(p_order->>'delivery_address', ''),
    NULLIF(p_order->>'pickup_instructions', ''),
    NULLIF(p_order->>'customer_notes', ''),
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
    false
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT value FROM pg_catalog.jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      item_type,
      item_id,
      item_name,
      care_level,
      quantity,
      unit_price_paise,
      line_total_paise
    )
    VALUES (
      v_order_id,
      v_item->>'item_type',
      v_item->>'item_id',
      v_item->>'item_name',
      v_item->>'care_level',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price_paise')::bigint,
      (v_item->>'line_total_paise')::bigint
    );
  END LOOP;

  INSERT INTO public.order_events (
    order_id,
    event_type,
    new_value,
    event_description,
    actor_type
  )
  VALUES (
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

  INSERT INTO public.order_submission_idempotency (
    idempotency_key,
    payload_hash,
    order_id
  )
  VALUES (
    p_idempotency_key,
    p_payload_hash,
    v_order_id
  );

  RETURN pg_catalog.jsonb_build_object(
    'order_id', v_order_id,
    'order_reference', v_order_reference,
    'created', true
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_kitkleen_order(uuid, text, jsonb, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_kitkleen_order(uuid, text, jsonb, jsonb)
TO service_role;

COMMIT;