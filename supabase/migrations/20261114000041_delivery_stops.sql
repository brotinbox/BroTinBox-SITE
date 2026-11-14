-- =============================================================================
-- BroTin Box · 0041 Delivery stop order + status fix.
-- 1. deliveries.stop_no: the rider's stop order within a date + slot run, set
--    from the admin Deliveries page (↑/↓ or "Auto-sort"). New days reuse the
--    customer's last stop number for that slot until re-ordered.
-- 2. update_delivery_status: moving a delivery OFF 'delivered' (a mis-tap undo)
--    now takes it back out of subscriptions.meals_delivered, so the count
--    stays right when staff correct a status.
-- Customer pins live in the existing addresses.lat / addresses.lng columns.
-- =============================================================================
alter table public.deliveries add column if not exists stop_no smallint;

create or replace function public.update_delivery_status(p_delivery uuid, p_status public.delivery_status, p_reason text default null)
returns public.deliveries
language plpgsql
security definer
set search_path to ''
as $function$
declare
  dl public.deliveries;
  old_status public.delivery_status;
begin
  select * into dl from public.deliveries where id = p_delivery for update;
  if dl.id is null then raise exception 'delivery not found'; end if;

  if not (public.has_permission('deliveries.write')
          or (dl.rider_id = auth.uid() and public.has_permission('deliveries.update_assigned')
              and p_status in ('out_for_delivery', 'delivered', 'failed'))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status in ('skipped', 'paused', 'scheduled', 'cancelled') then
    raise exception 'use the customer/subscription functions for %', p_status;
  end if;

  old_status := dl.status;
  update public.deliveries
     set status = p_status,
         delivered_at = case when p_status = 'delivered' then now()
                             when old_status = 'delivered' then null
                             else delivered_at end,
         failure_reason = case when p_status = 'failed' then p_reason else failure_reason end
   where id = p_delivery
  returning * into dl;

  if p_status = 'delivered' and old_status <> 'delivered' then
    update public.subscriptions set meals_delivered = meals_delivered + 1 where id = dl.subscription_id;
  elsif old_status = 'delivered' and p_status <> 'delivered' then
    update public.subscriptions set meals_delivered = greatest(meals_delivered - 1, 0) where id = dl.subscription_id;
  end if;

  perform public.log_activity(dl.user_id, 'delivery', dl.id, 'status_' || p_status::text,
    jsonb_build_object('status', old_status), jsonb_build_object('status', p_status, 'reason', p_reason));
  return dl;
end;
$function$;
