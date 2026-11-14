-- =============================================================================
-- BroTin Box · 0042 Close abandoned checkout attempts when the customer pays.
-- Every checkout creates a fresh order, so a customer who gives up on UPI and
-- starts again leaves an unpaid order behind (e.g. BB-24010 → paid BB-24011).
-- When any order turns 'paid' (Cashfree or staff "mark paid"), the same
-- customer's other unpaid orders (not top-ups) are cancelled as superseded:
--   * orders.metadata.superseded_by = the paid order number
--   * unpaid_alerted_at is set, so no "unpaid" Telegram alert goes out
--   * their pending subscription becomes 'expired' (not 'cancelled'), so if a
--     stray payment still lands on the old order, mark_order_paid's existing
--     late-payment path activates it instead of taking money for nothing.
-- Also tidies orders that are already in this state (one-off, at the bottom).
-- =============================================================================
create or replace function public._supersede_unpaid_orders()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  old_o record;
begin
  if new.is_top_up then
    return new;
  end if;
  for old_o in
    select id, user_id, subscription_id, order_number
      from public.orders
     where user_id = new.user_id
       and id <> new.id
       and status in ('created', 'pending_payment')
       and not is_top_up
     for update
  loop
    update public.orders
       set status = 'cancelled',
           unpaid_alerted_at = coalesce(unpaid_alerted_at, now()),
           metadata = metadata || jsonb_build_object(
             'cancel_reason', 'Superseded: customer paid ' || new.order_number,
             'superseded_by', new.order_number)
     where id = old_o.id;
    update public.subscriptions set status = 'expired'
     where id = old_o.subscription_id and status = 'pending_payment';
    perform public.log_activity(old_o.user_id, 'order', old_o.id, 'superseded', null,
      jsonb_build_object('paid_order', new.order_number));
  end loop;
  return new;
end;
$function$;

drop trigger if exists orders_supersede_unpaid on public.orders;
create trigger orders_supersede_unpaid
  after update of status on public.orders
  for each row
  when (new.status = 'paid' and old.status is distinct from 'paid')
  execute function public._supersede_unpaid_orders();

-- One-off: close unpaid orders left over from customers who already paid a later order.
with stale as (
  select u.id, u.subscription_id, p.order_number as paid_number
    from public.orders u
    join lateral (
      select order_number from public.orders p
       where p.user_id = u.user_id and p.status = 'paid' and not p.is_top_up
         and p.created_at > u.created_at
       order by p.created_at limit 1
    ) p on true
   where u.status in ('created', 'pending_payment') and not u.is_top_up
), closed as (
  update public.orders o
     set status = 'cancelled',
         unpaid_alerted_at = coalesce(o.unpaid_alerted_at, now()),
         metadata = o.metadata || jsonb_build_object(
           'cancel_reason', 'Superseded: customer paid ' || s.paid_number,
           'superseded_by', s.paid_number)
    from stale s
   where o.id = s.id
  returning o.subscription_id
)
update public.subscriptions set status = 'expired'
 where id in (select subscription_id from closed) and status = 'pending_payment';
