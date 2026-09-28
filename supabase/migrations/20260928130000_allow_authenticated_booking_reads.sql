DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[]
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'bookings'
        AND policyname = 'Allow authenticated booking reads'
    ) THEN
      RAISE EXCEPTION 'The bookings read policy name already exists with different permissions.';
    END IF;

    CREATE POLICY "Allow authenticated booking reads"
      ON public.bookings
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_items'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[]
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'booking_items'
        AND policyname = 'Allow authenticated booking item reads'
    ) THEN
      RAISE EXCEPTION 'The booking_items read policy name already exists with different permissions.';
    END IF;

    CREATE POLICY "Allow authenticated booking item reads"
      ON public.booking_items
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;