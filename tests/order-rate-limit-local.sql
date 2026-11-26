-- Local rate-limit test. All records are rolled back.
begin;

do $$
declare
  v_hash text := repeat('d', 64);
  v_allowed boolean;
  i integer;
begin
  for i in 1..5 loop
    v_allowed := public.consume_kitkleen_order_rate_limit(v_hash);
    if v_allowed is not true then
      raise exception 'FAIL: request % should be allowed', i;
    end if;
  end loop;
  raise notice 'PASS: first five requests allowed';

  v_allowed := public.consume_kitkleen_order_rate_limit(v_hash);
  if v_allowed is not false then
    raise exception 'FAIL: sixth request should be rate limited';
  end if;
  raise notice 'PASS: sixth request rate limited';
end $$;

rollback;

select count(*) as test_rate_limit_rows_remaining
from public.order_submission_rate_limits
where ip_hash = repeat('d', 64);
