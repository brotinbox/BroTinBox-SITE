-- =============================================================================
-- BroTin Box · 0016 Cashfree PG (one-time prepaid orders)
--
--  * mark_order_paid: a payment first seen as failed / dropped can still
--    succeed later (slow UPI), so the success upgrades that payments row.
--  * record_payment_attempt: logs a failed or abandoned attempt WITHOUT failing
--    the order, so the customer can retry until the order expires.
--  * Payment mode defaults to Cashfree. Manual UPI stays as a fallback that
--    staff can switch back to in Settings (and the site falls back to it by
--    itself while the Cashfree keys are not set).
-- Both functions are service_role only (webhook + server code).
-- =============================================================================

create or replace function public.mark_order_paid(
  p_order uuid, p_cf_payment_id text, p_amount numeric, p_method text, p_raw jsonb default '{}')
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  s public.subscriptions;
begin
  select * into o from public.orders where id = p_order for update;
  if o.id is null then
    raise exception 'order not found';
  end if;

  insert into public.payments (order_id, cf_payment_id, amount, method, status, raw)
  values (p_order, p_cf_payment_id, p_amount, p_method, 'success', p_raw)
  on conflict (cf_payment_id) do update
    set status = 'success', amount = excluded.amount, method = excluded.method,
        failure_reason = null, raw = excluded.raw
    where public.payments.status <> 'success';

  if o.status = 'paid' then
    return o;   -- already processed
  end if;
  if p_amount < o.total then
    raise exception 'amount mismatch: paid %, expected %', p_amount, o.total;
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = p_order returning * into o;

  if o.coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id, amount)
    values (o.coupon_id, o.user_id, o.id, o.discount)
    on conflict (order_id) do nothing;
  end if;

  if o.subscription_id is not null and not o.is_top_up then
    select * into s from public.subscriptions where id = o.subscription_id for update;
    -- 'expired' covers a late payment arriving after housekeeping gave up on it.
    if s.status in ('pending_payment', 'expired') then
      update public.subscriptions set status = 'active' where id = s.id;
      perform public.generate_deliveries(s.id, o.id);
    end if;
  end if;

  perform public.log_activity(o.user_id, 'order', o.id, 'paid', null,
    jsonb_build_object('order_number', o.order_number, 'total', o.total, 'method', p_method));
  return o;
end;
$$;

create or replace function public.record_payment_attempt(
  p_order uuid, p_cf_payment_id text, p_amount numeric, p_method text,
  p_status public.payment_status, p_reason text, p_raw jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare o public.orders;
begin
  if p_status = 'success' then
    raise exception 'use mark_order_paid for successful payments';
  end if;
  select * into o from public.orders where id = p_order;
  if o.id is null then raise exception 'order not found'; end if;

  if exists (select 1 from public.payments where cf_payment_id = p_cf_payment_id) then
    update public.payments
       set status = p_status, failure_reason = left(p_reason, 300), raw = p_raw
     where cf_payment_id = p_cf_payment_id and status <> 'success';
    return;
  end if;

  insert into public.payments (order_id, cf_payment_id, amount, method, status, failure_reason, raw)
  values (p_order, p_cf_payment_id, p_amount, p_method, p_status, left(p_reason, 300), p_raw)
  on conflict (cf_payment_id) do nothing;

  perform public.log_activity(o.user_id, 'order', o.id, 'payment_' || p_status::text, null,
    jsonb_build_object('cf_payment_id', p_cf_payment_id, 'reason', left(p_reason, 300)));
end;
$$;

grant execute on function
  public.mark_order_paid(uuid, text, numeric, text, jsonb),
  public.record_payment_attempt(uuid, text, numeric, text, public.payment_status, text, jsonb)
to service_role;

update public.site_settings
   set value = value || '{"mode": "cashfree"}'::jsonb
 where key = 'payment';
