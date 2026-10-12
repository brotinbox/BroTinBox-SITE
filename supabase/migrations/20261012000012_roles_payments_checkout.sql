-- =============================================================================
-- BroTin Box · 0012 Roles, manual UPI payments, server checkout, staff tools
--
-- Roles
--   super_admin  everything (staff/roles, prices, refunds, site settings)
--   admin        everything except the super-admin-only permissions below
--   kitchen / support / rider  role_permissions rows
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select auth.uid() is not null and public.user_role() = 'super_admin' $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select auth.uid() is not null and public.user_role() in ('admin', 'super_admin') $$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select auth.uid() is not null and public.user_role() in ('super_admin', 'admin', 'kitchen', 'rider', 'support') $$;

-- Permissions only a super admin holds.
create or replace function public.is_super_admin_permission(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select split_part(p, '.', 1) = 'staff'
      or p in ('settings.write', 'pricing.write', 'orders.refund', 'roles.manage')
$$;

create or replace function public.has_permission(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    public.user_role() = 'super_admin'
    or (public.user_role() = 'admin' and not public.is_super_admin_permission(p))
    or exists (
      select 1 from public.role_permissions rp
      where rp.role = public.user_role()
        and (rp.permission = p or rp.permission = split_part(p, '.', 1) || '.*')
    )
  )
$$;

-- Only a super admin may change roles; admins may block/unblock customers but
-- never touch a super admin's row.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then          -- service_role / SQL editor
    return new;
  end if;

  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super admin can change roles' using errcode = '42501';
  end if;

  if old.role = 'super_admin' and not public.is_super_admin() and auth.uid() <> old.id then
    raise exception 'Not allowed to modify a super admin' using errcode = '42501';
  end if;

  if not public.is_admin() and (
       new.is_blocked is distinct from old.is_blocked
    or new.referral_code is distinct from old.referral_code
    or new.phone_verified is distinct from old.phone_verified
    or new.kitchen_id is distinct from old.kitchen_id) then
    raise exception 'Not allowed to change privileged profile fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Tighten policies that previously used is_admin() for super-admin areas.
alter policy "settings: admin writes" on public.site_settings
  using (public.has_permission('settings.write')) with check (public.has_permission('settings.write'));
alter policy "role_permissions: admin writes" on public.role_permissions
  using (public.has_permission('staff.manage')) with check (public.has_permission('staff.manage'));
alter policy "kitchens: admin writes" on public.kitchens
  using (public.has_permission('settings.write')) with check (public.has_permission('settings.write'));
alter policy "profiles: admin updates" on public.profiles
  using (public.has_permission('customers.write')) with check (public.has_permission('customers.write'));
alter policy "addresses: admin writes" on public.addresses
  using (public.has_permission('customers.write')) with check (public.has_permission('customers.write'));

-- support can act on subscriptions (pause/skip on behalf) but not edit profiles
insert into public.role_permissions (role, permission) values
  ('support', 'customers.write_notes'), ('kitchen', 'orders.read')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Payment settings (public: the UPI ID is shown to paying customers)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value, is_public) values
  ('payment', '{"mode": "manual_upi", "upi_id": "", "payee_name": "BroTin Box", "qr_image_url": null, "instructions": "Pay the exact amount and enter the UPI reference number. We confirm within a few hours."}', true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Server checkout: create subscription + order + items atomically.
-- service_role only; prices are computed by the server, never the browser.
-- ---------------------------------------------------------------------------
create or replace function public.create_checkout_order(
  p_user uuid, p_plan uuid, p_type public.plan_type, p_diet public.diet_type,
  p_slots public.meal_slot[], p_excluded smallint[], p_start date, p_address uuid,
  p_preferences jsonb, p_meals_total int,
  p_subtotal numeric, p_discount numeric, p_fee numeric, p_total numeric,
  p_coupon uuid, p_pricing jsonb, p_items jsonb, p_expires_in interval default interval '48 hours')
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub_id uuid;
  o public.orders;
begin
  if not exists (select 1 from public.addresses where id = p_address and user_id = p_user) then
    raise exception 'address does not belong to user';
  end if;
  if exists (select 1 from public.profiles where id = p_user and is_blocked) then
    raise exception 'account blocked';
  end if;

  insert into public.subscriptions (user_id, plan_id, type, diet, meals_per_day, slots, excluded_weekdays,
                                    start_date, meals_total, preferences, address_id)
  values (p_user, p_plan, p_type, p_diet, cardinality(p_slots), p_slots, coalesce(p_excluded, '{}'),
          p_start, p_meals_total, coalesce(p_preferences, '{}'), p_address)
  returning id into sub_id;

  insert into public.orders (user_id, subscription_id, type, status, subtotal, discount, delivery_fee, total,
                             coupon_id, pricing_snapshot, address_snapshot, expires_at)
  values (p_user, sub_id, p_type, 'pending_payment', p_subtotal, p_discount, p_fee, p_total,
          p_coupon, p_pricing, public._address_snapshot(p_address), now() + p_expires_in)
  returning * into o;

  insert into public.order_items (order_id, item_type, ref_id, name, qty, unit_price, total)
  select o.id, x.item_type::public.order_item_type, x.ref_id, x.name, x.qty, x.unit_price, x.total
  from jsonb_to_recordset(coalesce(p_items, '[]')) as x(item_type text, ref_id uuid, name text, qty int, unit_price numeric, total numeric);

  perform public.log_activity(p_user, 'order', o.id, 'created', null,
    jsonb_build_object('order_number', o.order_number, 'total', o.total, 'type', p_type));
  return o;
end;
$$;

-- Customer submits their UPI reference for a pending order (manual mode).
create or replace function public.submit_payment_reference(p_order uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if o.id is null or o.user_id <> auth.uid() then
    raise exception 'order not found' using errcode = '42501';
  end if;
  if o.status not in ('created', 'pending_payment') then
    raise exception 'order is %', o.status;
  end if;
  if p_reference !~ '^[A-Za-z0-9]{6,30}$' then
    raise exception 'invalid UPI reference';
  end if;
  update public.orders
     set metadata = metadata || jsonb_build_object('upi_reference', p_reference, 'reference_submitted_at', now())
   where id = p_order;
  perform public.log_activity(o.user_id, 'order', o.id, 'payment_reference_submitted', null,
    jsonb_build_object('reference', p_reference));
end;
$$;

-- Staff confirms a manual UPI payment → order paid, subscription active, meals scheduled.
create or replace function public.admin_mark_order_paid(p_order uuid, p_reference text, p_method text default 'upi')
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  if not public.has_permission('orders.mark_paid') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into o from public.orders where id = p_order;
  if o.id is null then raise exception 'order not found'; end if;
  if o.status not in ('created', 'pending_payment', 'cancelled') then
    raise exception 'order is %', o.status;
  end if;
  if o.status = 'cancelled' then   -- late payment for an expired order
    update public.orders set status = 'pending_payment' where id = p_order;
  end if;

  o := public.mark_order_paid(p_order, 'manual:' || p_order::text, o.total, p_method,
         jsonb_build_object('reference', left(coalesce(p_reference, ''), 60), 'confirmed_by', auth.uid()));
  return o;
end;
$$;

create or replace function public.admin_cancel_order(p_order uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare o public.orders;
begin
  if not public.has_permission('orders.write') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into o from public.orders where id = p_order for update;
  if o.status not in ('created', 'pending_payment') then
    raise exception 'only unpaid orders can be cancelled here (order is %)', o.status;
  end if;
  update public.orders set status = 'cancelled', metadata = metadata || jsonb_build_object('cancel_reason', left(p_reason, 300))
   where id = p_order;
  update public.subscriptions set status = 'cancelled', cancelled_at = now(), cancel_reason = left(p_reason, 300)
   where id = o.subscription_id and status = 'pending_payment';
  perform public.log_activity(o.user_id, 'order', o.id, 'cancelled', null, jsonb_build_object('reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff management (super admin). Accounts are created in Supabase Auth;
-- this assigns the role. A super admin cannot demote themselves (no lockout).
-- ---------------------------------------------------------------------------
create or replace function public.set_staff_role(p_user uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare old_role public.app_role;
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_user = auth.uid() and p_role <> 'super_admin' then
    raise exception 'you cannot remove your own super admin role';
  end if;
  select role into old_role from public.profiles where id = p_user;
  if old_role is null then raise exception 'user not found'; end if;
  update public.profiles set role = p_role where id = p_user;
  perform public.log_activity(p_user, 'profile', p_user, 'role_changed',
    jsonb_build_object('role', old_role), jsonb_build_object('role', p_role));
end;
$$;

grant execute on function public.is_super_admin(), public.is_super_admin_permission(text) to anon, authenticated;
grant execute on function
  public.submit_payment_reference(uuid, text),
  public.admin_mark_order_paid(uuid, text, text),
  public.admin_cancel_order(uuid, text),
  public.set_staff_role(uuid, public.app_role)
to authenticated;
