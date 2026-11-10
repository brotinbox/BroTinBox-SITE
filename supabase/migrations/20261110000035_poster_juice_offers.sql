-- =============================================================================
-- BroTin Box · 0035 Poster offers: free juices
--
-- The printed posters promise (first weekly/monthly order of each customer):
--   * Monthly plan, first order ............ 2 free juices in the first month
--   * Weekly plan, renewed for week 2 ...... 1 free juice in week 2
--   * Refer a friend ....................... when the friend subscribes, both
--                                            get a free juice
-- ABC juice is not part of any free-juice offer (checked by the website).
--
-- How it works
--   Checkout prices the order and stores the free juices on the subscription:
--     subscriptions.preferences.free_juices =
--       [{ "addon_id": uuid, "day": 2, "offer": "first_monthly" }, …]
--     subscriptions.preferences.referral = { "referrer_id": uuid }
--   "day" is the Nth delivery day of the plan (dates can still move when the
--   order is paid, so a fixed date would be wrong).
--   When the order is paid, _apply_free_juices() records each claim in
--   crm.offer_claims (one per customer per offer: the real guard) and adds the
--   juice to that day's box at ₹0. The referrer's juice goes on their next
--   editable delivery, or waits (status 'pending') for their next order.
--   Free juices move with skip / pause like paid add-ons.
-- =============================================================================

create table if not exists crm.offer_claims (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  offer            text not null check (offer in ('first_monthly', 'weekly_renewal', 'referral_friend', 'referral_referrer')),
  order_id         uuid references public.orders (id) on delete set null,      -- order that earned it
  addon_id         uuid references public.addons (id) on delete set null,
  qty              int  not null default 1,
  friend_id        uuid references public.profiles (id) on delete set null,    -- referrer rows: who joined
  status           text not null default 'applied' check (status in ('applied', 'pending')),
  delivery_id      uuid references public.deliveries (id) on delete set null,  -- where the juice went
  applied_order_id uuid references public.orders (id) on delete set null,      -- pending reward used on this order
  created_at       timestamptz not null default now(),
  applied_at       timestamptz
);

-- One of each offer per customer; a referrer earns once per friend.
create unique index if not exists offer_claims_once
  on crm.offer_claims (user_id, offer) where offer in ('first_monthly', 'weekly_renewal', 'referral_friend');
create unique index if not exists offer_claims_referrer_once
  on crm.offer_claims (user_id, friend_id) where offer = 'referral_referrer';
create index if not exists offer_claims_pending on crm.offer_claims (user_id) where status = 'pending';
create index if not exists offer_claims_order on crm.offer_claims (order_id);

alter table crm.offer_claims enable row level security;
revoke all on crm.offer_claims from public, anon, authenticated;
grant select, insert, update, delete on crm.offer_claims to service_role;

-- Put one free juice on a delivery (adds to a paid one of the same juice).
create or replace function public._add_free_juice(p_delivery uuid, p_addon uuid, p_order uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.delivery_addons (delivery_id, addon_id, qty, unit_price, order_id)
  values (p_delivery, p_addon, 1, 0, p_order)
  on conflict (delivery_id, addon_id) do update set qty = least(public.delivery_addons.qty + 1, 10);
$$;

create or replace function public._apply_free_juices(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  s public.subscriptions;
  e jsonb;
  v_offer text;
  v_addon uuid;
  v_day int;
  v_del uuid;
  v_claim uuid;
  v_ref uuid;
  v_friend_addon uuid;
  v_ref_del uuid;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null or o.subscription_id is null then return; end if;
  select * into s from public.subscriptions where id = o.subscription_id;

  for e in select value from jsonb_array_elements(coalesce(s.preferences -> 'free_juices', '[]'::jsonb))
  loop
    v_offer := e ->> 'offer';
    v_addon := (e ->> 'addon_id')::uuid;
    v_day   := greatest(coalesce((e ->> 'day')::int, 1), 1);
    v_claim := null;

    if v_offer = 'referral_referrer' then
      -- A reward this customer earned earlier, used on this order.
      update crm.offer_claims
         set status = 'applied', applied_order_id = o.id, applied_at = now(), addon_id = v_addon
       where id = (e ->> 'claim_id')::uuid and user_id = o.user_id and status = 'pending'
      returning id into v_claim;
    elsif v_offer in ('first_monthly', 'weekly_renewal', 'referral_friend') then
      -- First entry claims the offer; more entries of the same offer on the
      -- same order (2 monthly juices) add to it. Another order: already used.
      insert into crm.offer_claims (user_id, offer, order_id, addon_id, qty, applied_at)
      values (o.user_id, v_offer, o.id, v_addon, 1, now())
      on conflict (user_id, offer) where offer in ('first_monthly', 'weekly_renewal', 'referral_friend')
      do update set qty = crm.offer_claims.qty + 1
         where crm.offer_claims.order_id = excluded.order_id
      returning id into v_claim;
      if v_offer = 'referral_friend' and v_claim is not null then
        v_friend_addon := v_addon;
      end if;
    end if;
    if v_claim is null or v_addon is null then continue; end if;

    -- The Nth delivery day of this plan (or its last day), first slot.
    select x.id into v_del from (
      select id, dense_rank() over (order by delivery_date) rn
        from public.deliveries
       where subscription_id = s.id and not is_make_up and slot = s.slots[1]
    ) x where x.rn <= v_day order by x.rn desc limit 1;
    if v_del is null then continue; end if;

    perform public._add_free_juice(v_del, v_addon, o.id);
    update crm.offer_claims set delivery_id = coalesce(delivery_id, v_del) where id = v_claim;
  end loop;

  -- Refer a friend: only when the friend's own referral juice was claimed now.
  v_ref := nullif(s.preferences -> 'referral' ->> 'referrer_id', '')::uuid;
  if v_ref is not null and v_ref <> o.user_id and v_friend_addon is not null then
    update public.profiles set referred_by = v_ref where id = o.user_id and referred_by is null;

    select id into v_ref_del from public.deliveries
     where user_id = v_ref and status = 'scheduled' and public.is_before_cutoff(delivery_date)
     order by delivery_date, slot limit 1;

    v_claim := null;
    insert into crm.offer_claims (user_id, offer, order_id, addon_id, friend_id, status, delivery_id, applied_at)
    values (v_ref, 'referral_referrer', o.id, v_friend_addon, o.user_id,
            case when v_ref_del is null then 'pending' else 'applied' end, v_ref_del,
            case when v_ref_del is null then null else now() end)
    on conflict (user_id, friend_id) where offer = 'referral_referrer' do nothing
    returning id into v_claim;

    if v_claim is not null and v_ref_del is not null then
      perform public._add_free_juice(v_ref_del, v_friend_addon, o.id);
    end if;
  end if;
end;
$$;

-- mark_order_paid: unchanged, plus the free juices after the deliveries exist.
-- A problem with an offer never blocks a payment (it is logged instead).
create or replace function public.mark_order_paid(p_order uuid, p_cf_payment_id text, p_amount numeric, p_method text, p_raw jsonb default '{}'::jsonb)
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
      begin
        perform public._apply_free_juices(o.id);
      exception when others then
        perform public.log_activity(o.user_id, 'order', o.id, 'free_juice_failed', null,
          jsonb_build_object('error', sqlerrm));
      end;
    end if;
  end if;

  perform public.log_activity(o.user_id, 'order', o.id, 'paid', null,
    jsonb_build_object('order_number', o.order_number, 'total', o.total, 'method', p_method));
  return o;
end;
$$;

revoke all on function public._add_free_juice(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public._apply_free_juices(uuid) from public, anon, authenticated;

-- Referral rewards are live (admin › Settings can switch them off again).
update public.site_settings
   set value = jsonb_set(value, '{referrals}', 'true'::jsonb)
 where key = 'features';
