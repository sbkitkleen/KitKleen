DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND cmd = 'UPDATE'
      AND permissive = 'PERMISSIVE'
      AND roles @> ARRAY['authenticated']::name[]
      AND lower(regexp_replace(coalesce(qual, ''), '[[:space:]()]', '', 'g')) = 'true'
      AND lower(regexp_replace(coalesce(with_check, qual, ''), '[[:space:]()]', '', 'g')) = 'true'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'bookings'
        AND policyname = 'Allow authenticated booking updates'
    ) THEN
      RAISE EXCEPTION 'The booking update policy name already exists with different permissions.';
    END IF;

    CREATE POLICY "Allow authenticated booking updates"
      ON public.bookings
      AS PERMISSIVE
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;