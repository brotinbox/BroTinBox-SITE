-- =============================================================================
-- BroTin Box · 0001 Foundation
-- Extensions, enums, shared helpers (updated_at trigger, IST time helpers).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext   with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums (extend later with: alter type ... add value '...')
-- ---------------------------------------------------------------------------
create type public.app_role            as enum ('customer', 'admin', 'kitchen', 'rider', 'support');
create type public.diet_type           as enum ('veg', 'non_veg');
create type public.meal_slot           as enum ('lunch', 'dinner');
create type public.menu_category       as enum ('main', 'protein_side', 'salad', 'legume', 'carb');
create type public.addon_type          as enum ('side', 'drink');
create type public.plan_type           as enum ('trial', 'weekly', 'monthly', 'custom');
create type public.zone_tier           as enum ('core', 'phase2');
create type public.discount_type       as enum ('flat', 'percentage');
create type public.order_status        as enum ('created', 'pending_payment', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded');
create type public.order_item_type     as enum ('meal', 'addon', 'bundle', 'fee', 'discount', 'top_up');
create type public.payment_status      as enum ('pending', 'success', 'failed', 'user_dropped', 'cancelled');
create type public.refund_status       as enum ('pending', 'success', 'failed', 'cancelled');
create type public.subscription_status as enum ('pending_payment', 'active', 'paused', 'cancelled', 'completed', 'expired');
create type public.payment_mode        as enum ('prepaid', 'autopay');
create type public.delivery_status     as enum ('scheduled', 'skipped', 'paused', 'locked', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'failed', 'cancelled');
create type public.content_status      as enum ('draft', 'scheduled', 'published', 'archived');
create type public.review_status       as enum ('pending', 'approved', 'rejected');
create type public.lead_status         as enum ('new', 'contacted', 'converted', 'lost');
create type public.actor_role          as enum ('customer', 'admin', 'kitchen', 'rider', 'support', 'system');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Time helpers. The business runs on IST; never trust the server's timezone.
-- ---------------------------------------------------------------------------
create or replace function public.now_ist()
returns timestamp
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Kolkata') $$;

create or replace function public.today_ist()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Kolkata')::date $$;
