alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;

-- Remove policies that affect reads, updates, or deletes; preserve INSERT-only
-- policies already used by the customer submission flow.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('bookings', 'booking_items')
      and cmd <> 'INSERT'
  loop
    execute format(
      'drop policy %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end
$$;

revoke all privileges on table public.bookings, public.booking_items
  from public, anon, authenticated;

do $$
declare
  target_table record;
  column_list text;
  privilege_name text;
begin
  for target_table in
    select table_name
    from (values ('bookings'), ('booking_items')) as target_tables(table_name)
  loop
    select string_agg(format('%I', attname), ', ' order by attnum)
      into column_list
      from pg_attribute
      where attrelid = to_regclass(format('public.%I', target_table.table_name))
        and attnum > 0
        and not attisdropped;

    if column_list is not null then
      foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']
      loop
        execute format(
          'revoke %s (%s) on table public.%I from public, anon, authenticated',
          privilege_name,
          column_list,
          target_table.table_name
        );
      end loop;
    end if;
  end loop;
end
$$;

grant insert (
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
) on table public.bookings to anon;

grant insert (
  booking_id,
  item_name,
  quantity,
  unit_price,
  total_price
) on table public.booking_items to anon;

grant select on table public.bookings to authenticated;
grant update (status) on table public.bookings to authenticated;
grant select (booking_id, item_name, quantity, unit_price, total_price)
  on table public.booking_items to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and cmd = 'INSERT'
      and permissive = 'PERMISSIVE'
      and roles && array['anon', 'public']::name[]
  ) then
    create policy "KitKleen customers can submit bookings"
      on public.bookings
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_items'
      and cmd = 'INSERT'
      and permissive = 'PERMISSIVE'
      and roles && array['anon', 'public']::name[]
  ) then
    create policy "KitKleen customers can submit booking items"
      on public.booking_items
      for insert
      to anon
      with check (true);
  end if;
end
$$;

create policy "Admins can read bookings"
  on public.bookings
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update booking status"
  on public.bookings
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can read booking items"
  on public.booking_items
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
