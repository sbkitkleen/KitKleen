-- KitKleen Orders: atomic per-IP submission rate limit.
-- Apply to local PostgreSQL first. Do not apply to Production without approval.
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
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid rate-limit key';
  end if;

  insert into public.order_submission_rate_limits (
    ip_hash, window_started_at, request_count, updated_at
  )
  values (p_ip_hash, pg_catalog.now(), 1, pg_catalog.now())
  on conflict (ip_hash) do update
  set
    request_count = case
      when public.order_submission_rate_limits.window_started_at <= pg_catalog.now() - interval '1 hour'
        then 1
      else public.order_submission_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.order_submission_rate_limits.window_started_at <= pg_catalog.now() - interval '1 hour'
        then pg_catalog.now()
      else public.order_submission_rate_limits.window_started_at
    end,
    updated_at = pg_catalog.now()
  returning request_count into v_count;

  return v_count <= 5;
end;
$function$;

revoke all on function public.consume_kitkleen_order_rate_limit(text)
  from public, anon, authenticated;
grant execute on function public.consume_kitkleen_order_rate_limit(text)
  to service_role;

commit;
