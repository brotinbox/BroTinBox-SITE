-- =============================================================================
-- BroTin Box · 0007 Analytics RPCs, kitchen sheets, storage buckets, realtime
-- Every RPC checks permissions itself (security definer).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Kitchen cook sheet for a date
-- ---------------------------------------------------------------------------
create or replace function public.cook_sheet(p_date date, p_kitchen uuid default null)
returns table (
  slot public.meal_slot, diet public.diet_type, total int,
  egg_free int, skip_legume int, double_main int, make_up int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('cooksheet.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select d.slot, d.diet, count(*)::int,
         count(*) filter (where d.is_egg_free)::int,
         count(*) filter (where d.skip_legume)::int,
         count(*) filter (where d.double_main)::int,
         count(*) filter (where d.is_make_up)::int
    from public.deliveries d
   where d.delivery_date = p_date
     and d.kitchen_id = coalesce(p_kitchen, public.default_kitchen_id())
     and d.status in ('scheduled', 'locked', 'preparing', 'packed', 'out_for_delivery', 'delivered')
   group by d.slot, d.diet
   order by d.slot, d.diet;
end;
$$;

create or replace function public.cook_sheet_addons(p_date date, p_kitchen uuid default null)
returns table (addon_id uuid, name text, type public.addon_type, qty int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('cooksheet.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select a.id, a.name, a.type, sum(da.qty)::int
    from public.delivery_addons da
    join public.deliveries d on d.id = da.delivery_id
    join public.addons a on a.id = da.addon_id
   where d.delivery_date = p_date
     and d.kitchen_id = coalesce(p_kitchen, public.default_kitchen_id())
     and d.status in ('scheduled', 'locked', 'preparing', 'packed', 'out_for_delivery', 'delivered')
   group by a.id, a.name, a.type
   order by a.type, a.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin overview KPIs
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t date := public.today_ist();
  tomorrow date := public.next_operating_day(t);
  result jsonb;
begin
  if not public.has_permission('dashboard.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'revenue_today', coalesce((select sum(total) from public.orders
                                where status = 'paid' and (paid_at at time zone 'Asia/Kolkata')::date = t), 0),
    'revenue_mtd',   coalesce((select sum(total) from public.orders
                                where status = 'paid' and (paid_at at time zone 'Asia/Kolkata')::date >= date_trunc('month', t)::date), 0),
    'active_subscriptions', (select count(*) from public.subscriptions where status = 'active'),
    'paused_subscriptions', (select count(*) from public.subscriptions where status = 'paused'),
    'ending_this_week',     (select count(*) from public.subscriptions
                              where status = 'active' and end_date between t and t + 7),
    'meals_tomorrow',  (select count(*) from public.deliveries
                         where delivery_date = tomorrow and status in ('scheduled', 'locked')),
    'skips_tomorrow',  (select count(*) from public.deliveries
                         where delivery_date = tomorrow and status = 'skipped'),
    'tomorrow', tomorrow,
    'new_customers_7d', (select count(*) from public.profiles
                          where role = 'customer' and created_at >= now() - interval '7 days'),
    'pending_payments', (select count(*) from public.orders where status in ('created', 'pending_payment')),
    'new_enquiries',    (select count(*) from public.enquiries where status = 'new')
  ) into result;
  return result;
end;
$$;

-- Daily revenue / orders series for charts.
create or replace function public.metric_revenue_daily(p_days int default 30)
returns table (day date, revenue numeric, orders int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('analytics.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select g.day::date,
         coalesce(sum(o.total), 0),
         count(o.id)::int
    from generate_series((public.today_ist() - (least(p_days, 366) - 1))::timestamp, public.today_ist()::timestamp, interval '1 day') g(day)
    left join public.orders o
      on o.status = 'paid' and (o.paid_at at time zone 'Asia/Kolkata')::date = g.day::date
   group by g.day
   order by g.day;
end;
$$;

-- Meals scheduled per day for the next N days (production forecast).
create or replace function public.metric_meals_forecast(p_days int default 7)
returns table (day date, lunch int, dinner int, skipped int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('dashboard.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select d.delivery_date,
         count(*) filter (where d.slot = 'lunch'  and d.status not in ('skipped', 'paused', 'cancelled'))::int,
         count(*) filter (where d.slot = 'dinner' and d.status not in ('skipped', 'paused', 'cancelled'))::int,
         count(*) filter (where d.status in ('skipped', 'paused'))::int
    from public.deliveries d
   where d.delivery_date between public.today_ist() and public.today_ist() + least(p_days, 60)
   group by d.delivery_date
   order by d.delivery_date;
end;
$$;

-- One-call summary for the admin customer profile page.
create or replace function public.customer_summary(p_customer uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('customers.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'lifetime_value', coalesce((select sum(total) from public.orders where user_id = p_customer and status = 'paid'), 0),
    'orders_paid',    (select count(*) from public.orders where user_id = p_customer and status = 'paid'),
    'meals_delivered',(select count(*) from public.deliveries where user_id = p_customer and status = 'delivered'),
    'meals_skipped',  (select count(*) from public.deliveries where user_id = p_customer and status = 'skipped'),
    'meals_upcoming', (select count(*) from public.deliveries where user_id = p_customer
                         and status in ('scheduled', 'locked') and delivery_date >= public.today_ist()),
    'first_order_at', (select min(paid_at) from public.orders where user_id = p_customer and status = 'paid'),
    'last_order_at',  (select max(paid_at) from public.orders where user_id = p_customer and status = 'paid')
  );
end;
$$;

-- Belt and braces: make sure only the grants below apply.
revoke execute on function
  public.cook_sheet(date, uuid), public.cook_sheet_addons(date, uuid),
  public.admin_overview(), public.metric_revenue_daily(int), public.metric_meals_forecast(int),
  public.customer_summary(uuid)
from public, anon;

grant execute on function
  public.cook_sheet(date, uuid), public.cook_sheet_addons(date, uuid),
  public.admin_overview(), public.metric_revenue_daily(int), public.metric_meals_forecast(int),
  public.customer_summary(uuid)
to authenticated;

-- Staff permissions for the RPCs above
insert into public.role_permissions (role, permission) values
  ('kitchen', 'cooksheet.read'), ('support', 'analytics.read')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Storage buckets: public read, staff write, images only, 5 MB max
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('menu-images', 'menu-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('blog-images', 'blog-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "menu-images: menu writers upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'menu-images' and public.has_permission('menu.write'));
create policy "menu-images: menu writers update" on storage.objects
  for update to authenticated using (bucket_id = 'menu-images' and public.has_permission('menu.write'));
create policy "menu-images: menu writers delete" on storage.objects
  for delete to authenticated using (bucket_id = 'menu-images' and public.has_permission('menu.write'));

create policy "blog-images: editors upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'blog-images' and public.has_permission('blog.write'));
create policy "blog-images: editors update" on storage.objects
  for update to authenticated using (bucket_id = 'blog-images' and public.has_permission('blog.write'));
create policy "blog-images: editors delete" on storage.objects
  for delete to authenticated using (bucket_id = 'blog-images' and public.has_permission('blog.write'));

-- ---------------------------------------------------------------------------
-- Realtime (RLS still applies to subscribers)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.orders, public.deliveries, public.notifications;
