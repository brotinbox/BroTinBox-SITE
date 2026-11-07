-- =============================================================================
-- BroTin Box · 0028 `crm` schema + one trial box per customer
--
-- Schemas after this migration:
--   public  main app tables (row-level security)
--   otp     login codes only (phone_otps)
--   crm     customer follow-up and anti-misuse: phone_leads (moved from otp),
--           trial_claims, trial_attempts; later the WhatsApp reminder log
-- crm is service-role only, like otp. After running this:
--   Dashboard → Settings → API → Exposed schemas → add `crm`.
--
-- A trial is "used" when any of these already has a pending or paid trial:
--   * the account (user_id)
--   * the account's phone (profiles.phone)
--   * the delivery address phone
-- Matching is on the last 10 digits, so +91 / 91 / bare numbers are the same.
-- The same flat + pincode under a different phone is only flagged for staff.
--
-- Claims are written inside create_checkout_order (same transaction as the
-- order) and kept in sync with the order's status by a trigger:
--   paid                       → used
--   failed / cancelled         → released (a failed payment never locks anyone out)
--   refunded                   → stays used (staff can reset it)
--   cancelled → pending / paid → re-claimed (late payment)
-- Partial unique indexes on phone and user_id are the final guard against
-- double clicks and parallel tabs.
--
-- =============================================================================

-- ---------------------------------------------------------------------------
-- crm schema: only the server (service role) can reach it
-- ---------------------------------------------------------------------------
create schema if not exists crm;
revoke all on schema crm from public, anon, authenticated;
grant usage on schema crm to service_role;

-- New tables and functions created here later get the same lock-down by default.
alter default privileges in schema crm revoke all on tables from public, anon, authenticated;
alter default privileges in schema crm revoke execute on functions from public, anon, authenticated;

-- Move phone leads out of otp (data, indexes and grants move with the table).
alter table otp.phone_leads set schema crm;

drop function if exists otp.track_phone_lead(text, text, jsonb);
create or replace function crm.track_phone_lead(p_phone text, p_source text, p_context jsonb)
returns void
language sql
set search_path = crm
as $$
  insert into crm.phone_leads (phone, source, context)
  values (p_phone, p_source, p_context)
  on conflict (phone) do update set
    last_seen_at  = now(),
    code_requests = crm.phone_leads.code_requests + 1,
    source        = coalesce(excluded.source, crm.phone_leads.source),
    context       = coalesce(excluded.context, crm.phone_leads.context);
$$;
revoke all on function crm.track_phone_lead(text, text, jsonb) from public, anon, authenticated;
grant execute on function crm.track_phone_lead(text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function crm.norm_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when length(d) >= 10 then right(d, 10) end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

-- "641001:12bvillaapts" — same flat at the same pincode, spacing/case ignored.
create or replace function crm.address_key(p_pincode text, p_flat text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_pincode, '') <> '' and coalesce(p_flat, '') <> ''
    then p_pincode || ':' || lower(regexp_replace(p_flat, '[^a-zA-Z0-9]', '', 'g')) end
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table crm.trial_claims (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null unique references public.orders (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  phone            text check (phone ~ '^\d{10}$'),          -- account phone, else address phone
  address_phone    text check (address_phone ~ '^\d{10}$'),
  address_key      text,
  status           text not null default 'pending' check (status in ('pending', 'used', 'released')),
  is_override      boolean not null default false,          -- staff-approved repeat / late duplicate: not counted
  override_reason  text,
  override_by      uuid references public.profiles (id) on delete set null,
  address_flag     boolean not null default false,          -- same flat+pincode as another trial, different phone
  claimed_at       timestamptz not null default now(),
  used_at          timestamptz,
  released_at      timestamptz,
  release_reason   text,
  released_by      uuid references public.profiles (id) on delete set null,
  delivered_at     timestamptz,
  followup_stage   smallint not null default 0,             -- WhatsApp nudges sent (later)
  followup_sent_at timestamptz,
  followup_opt_out boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index trial_claims_one_per_phone on crm.trial_claims (phone)
  where status in ('pending', 'used') and not is_override and phone is not null;
create unique index trial_claims_one_per_user on crm.trial_claims (user_id)
  where status in ('pending', 'used') and not is_override;
create index trial_claims_address_phone_idx on crm.trial_claims (address_phone) where status in ('pending', 'used');
create index trial_claims_address_key_idx   on crm.trial_claims (address_key)   where status in ('pending', 'used');
create index trial_claims_followup_idx      on crm.trial_claims (status, delivered_at) where not followup_opt_out;

create trigger trial_claims_updated_at before update on crm.trial_claims
  for each row execute function public.set_updated_at();

-- Blocked repeat attempts (written by the app, read by staff).
create table crm.trial_attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles (id) on delete set null,
  phone             text,
  address_phone     text,
  matched_claim_id  uuid references crm.trial_claims (id) on delete set null,
  matched_on        text,                                    -- account / phone / address_phone
  source            text not null default 'web',             -- web / admin
  created_at        timestamptz not null default now()
);
create index trial_attempts_created_idx on crm.trial_attempts (created_at desc);

alter table crm.trial_claims   enable row level security;
alter table crm.trial_attempts enable row level security;
revoke all on crm.trial_claims, crm.trial_attempts from public, anon, authenticated;
grant select, insert, update, delete on crm.trial_claims, crm.trial_attempts to service_role;
grant execute on function crm.norm_phone(text), crm.address_key(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Eligibility (used by checkout before pricing, and by create_checkout_order)
-- Returns {eligible, matched_on, claim_id, status, order_id, order_number,
--          claimed_at, delivered_at, own_pending, address_flag}
-- ---------------------------------------------------------------------------
create or replace function public.trial_eligibility(p_user uuid, p_address uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_phone      text;
  v_addr_phone text;
  v_addr_key   text;
  phones       text[];
  c            crm.trial_claims;
  v_match      text;
  v_flag       boolean := false;
begin
  select crm.norm_phone(phone) into v_phone from public.profiles where id = p_user;
  if p_address is not null then
    select crm.norm_phone(a.phone), crm.address_key(a.pincode, a.flat)
      into v_addr_phone, v_addr_key
      from public.addresses a where a.id = p_address and a.user_id = p_user;
  end if;
  phones := array_remove(array[v_phone, v_addr_phone], null);

  -- Strongest match first: the account itself, then its phone, then the delivery phone.
  select * into c from crm.trial_claims t
   where t.status in ('pending', 'used') and not t.is_override
     and (t.user_id = p_user
          or (cardinality(phones) > 0 and (t.phone = any (phones) or t.address_phone = any (phones))))
   order by (t.user_id = p_user) desc, (t.phone = v_phone) desc, t.claimed_at
   limit 1;

  if v_addr_key is not null then
    select exists (
      select 1 from crm.trial_claims t
       where t.address_key = v_addr_key and t.status in ('pending', 'used') and t.user_id <> p_user
    ) into v_flag;
  end if;

  if c.id is null then
    return jsonb_build_object('eligible', true, 'address_flag', v_flag);
  end if;

  v_match := case
    when c.user_id = p_user then 'account'
    when c.phone = any (phones) then 'phone'
    else 'address_phone' end;

  return jsonb_build_object(
    -- The customer's own unpaid trial gets replaced by a new booking; anything else blocks.
    'eligible',     (c.status = 'pending' and c.user_id = p_user),
    'own_pending',  (c.status = 'pending' and c.user_id = p_user),
    'matched_on',   v_match,
    'claim_id',     c.id,
    'status',       c.status,
    'order_id',     c.order_id,
    'order_number', (select order_number from public.orders where id = c.order_id),
    'claimed_at',   c.claimed_at,
    'delivered_at', c.delivered_at,
    'address_flag', v_flag
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create_checkout_order: same as 0012 plus the trial claim.
-- p_trial_override = reason text when staff deliberately allow a repeat trial
-- (the app checks the staff permission before passing it).
-- ---------------------------------------------------------------------------
drop function if exists public.create_checkout_order(
  uuid, uuid, public.plan_type, public.diet_type, public.meal_slot[], smallint[], date, uuid,
  jsonb, int, numeric, numeric, numeric, numeric, uuid, jsonb, jsonb, interval);

create function public.create_checkout_order(
  p_user uuid, p_plan uuid, p_type public.plan_type, p_diet public.diet_type,
  p_slots public.meal_slot[], p_excluded smallint[], p_start date, p_address uuid,
  p_preferences jsonb, p_meals_total int,
  p_subtotal numeric, p_discount numeric, p_fee numeric, p_total numeric,
  p_coupon uuid, p_pricing jsonb, p_items jsonb, p_expires_in interval default interval '48 hours',
  p_trial_override text default null, p_override_by uuid default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub_id       uuid;
  o            public.orders;
  v_phone      text;
  v_addr_phone text;
  v_addr_key   text;
  k            text;
  elig         jsonb;
  v_override   boolean := nullif(btrim(coalesce(p_trial_override, '')), '') is not null;
begin
  if not exists (select 1 from public.addresses where id = p_address and user_id = p_user) then
    raise exception 'address does not belong to user';
  end if;
  if exists (select 1 from public.profiles where id = p_user and is_blocked) then
    raise exception 'account blocked';
  end if;

  if p_type = 'trial' then
    select crm.norm_phone(phone) into v_phone from public.profiles where id = p_user;
    select crm.norm_phone(phone), crm.address_key(pincode, flat)
      into v_addr_phone, v_addr_key from public.addresses where id = p_address;

    -- Serialise trial bookings per account and per phone (sorted, so no deadlocks).
    for k in
      select distinct x from unnest(array['u:' || p_user::text, 'p:' || v_phone, 'p:' || v_addr_phone]) x
       where x is not null order by x
    loop
      perform pg_advisory_xact_lock(hashtextextended('trial:' || k, 0));
    end loop;

    -- Re-booking replaces the customer's own unpaid trial (the trigger releases its claim).
    update public.orders set status = 'cancelled'
     where status in ('created', 'pending_payment')
       and id in (select order_id from crm.trial_claims
                   where user_id = p_user and status = 'pending' and not is_override);

    if not v_override then
      elig := public.trial_eligibility(p_user, p_address);
      if not (elig->>'eligible')::boolean then
        raise exception 'TRIAL_USED' using errcode = 'P0001', detail = elig::text;
      end if;
    end if;
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

  if p_type = 'trial' then
    begin
      insert into crm.trial_claims (order_id, user_id, phone, address_phone, address_key, status,
                                    is_override, override_reason, override_by, address_flag)
      values (o.id, p_user, coalesce(v_phone, v_addr_phone), v_addr_phone, v_addr_key, 'pending',
              v_override, case when v_override then left(btrim(p_trial_override), 200) end,
              case when v_override then p_override_by end,
              coalesce((elig->>'address_flag')::boolean, false));
    exception when unique_violation then
      raise exception 'TRIAL_USED' using errcode = 'P0001';
    end;
    if v_override then
      perform public.log_activity(p_user, 'order', o.id, 'trial_override', null,
        jsonb_build_object('reason', left(btrim(p_trial_override), 200), 'by', p_override_by));
    end if;
  end if;

  perform public.log_activity(p_user, 'order', o.id, 'created', null,
    jsonb_build_object('order_number', o.order_number, 'total', o.total, 'type', p_type));
  return o;
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep claims in step with the trial order's status
-- ---------------------------------------------------------------------------
create or replace function public.sync_trial_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type <> 'trial' or new.status = old.status then
    return new;
  end if;

  if new.status = 'paid' then
    begin
      update crm.trial_claims
         set status = 'used', used_at = coalesce(used_at, now()), released_at = null, release_reason = null
       where order_id = new.id and status <> 'used';
    exception when unique_violation then
      -- Late payment on a released claim after the same person booked another trial:
      -- keep both on record, count only the first.
      update crm.trial_claims
         set status = 'used', used_at = now(), is_override = true,
             override_reason = 'late payment: another trial already exists', released_at = null
       where order_id = new.id;
    end;

  elsif new.status in ('failed', 'cancelled') then
    update crm.trial_claims
       set status = 'released', released_at = now(), release_reason = 'order ' || new.status::text
     where order_id = new.id and status = 'pending';

  elsif new.status in ('created', 'pending_payment') and old.status in ('failed', 'cancelled') then
    begin
      update crm.trial_claims
         set status = 'pending', released_at = null, release_reason = null
       where order_id = new.id and status = 'released' and released_by is null;
    exception when unique_violation then
      null;   -- someone else holds the trial now; a payment will be handled above
    end;
  end if;
  -- refunded / partially_refunded: claim stays as it is.
  return new;
end;
$$;

create trigger orders_sync_trial_claim
  after update of status on public.orders
  for each row execute function public.sync_trial_claim();

-- Trial box delivered → start the follow-up clock.
create or replace function public.mark_trial_delivered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    update crm.trial_claims c
       set delivered_at = coalesce(c.delivered_at, new.delivered_at, now())
      from public.orders o
     where o.subscription_id = new.subscription_id and o.type = 'trial' and c.order_id = o.id;
  end if;
  return new;
end;
$$;

create trigger deliveries_mark_trial_delivered
  after update of status on public.deliveries
  for each row execute function public.mark_trial_delivered();

-- ---------------------------------------------------------------------------
-- Staff: reset a trial (refund for our mistake, wrong number, etc.)
-- ---------------------------------------------------------------------------
create or replace function public.admin_reset_trial(p_claim uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare c crm.trial_claims;
begin
  if not public.has_permission('orders.refund') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 4 then
    raise exception 'give a reason';
  end if;
  select * into c from crm.trial_claims where id = p_claim for update;
  if c.id is null then raise exception 'trial not found'; end if;
  if c.status = 'released' then return; end if;

  update crm.trial_claims
     set status = 'released', released_at = now(), released_by = auth.uid(),
         release_reason = 'reset by staff: ' || left(btrim(p_reason), 200)
   where id = p_claim;

  perform public.log_activity(c.user_id, 'order', c.order_id, 'trial_reset',
    jsonb_build_object('status', c.status), jsonb_build_object('reason', left(btrim(p_reason), 200)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: checkout runs as service role; customers never call these directly.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.trial_eligibility(uuid, uuid),
  public.create_checkout_order(uuid, uuid, public.plan_type, public.diet_type, public.meal_slot[], smallint[],
    date, uuid, jsonb, int, numeric, numeric, numeric, numeric, uuid, jsonb, jsonb, interval, text, uuid),
  public.sync_trial_claim(), public.mark_trial_delivered(),
  public.admin_reset_trial(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.trial_eligibility(uuid, uuid),
  public.create_checkout_order(uuid, uuid, public.plan_type, public.diet_type, public.meal_slot[], smallint[],
    date, uuid, jsonb, int, numeric, numeric, numeric, numeric, uuid, jsonb, jsonb, interval, text, uuid)
to service_role;
grant execute on function public.admin_reset_trial(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill existing trial orders, oldest first. The first trial per person
-- counts; any later ones are kept as overrides so nobody is double-counted.
-- ---------------------------------------------------------------------------
do $$
declare
  r     record;
  v_st  text;
begin
  for r in
    select o.id, o.user_id, o.status, o.created_at, o.paid_at,
           crm.norm_phone(p.phone)                      as phone,
           crm.norm_phone(o.address_snapshot->>'phone') as addr_phone,
           crm.address_key(o.address_snapshot->>'pincode', o.address_snapshot->>'flat') as addr_key,
           (select max(coalesce(d.delivered_at, d.updated_at)) from public.deliveries d
             where d.subscription_id = o.subscription_id and d.status = 'delivered') as delivered_at
      from public.orders o
      join public.profiles p on p.id = o.user_id
     where o.type = 'trial'
       and (o.status in ('paid', 'refunded', 'partially_refunded')
            or (o.status in ('created', 'pending_payment') and o.expires_at > now()))
       and not exists (select 1 from crm.trial_claims t where t.order_id = o.id)
     order by coalesce(o.paid_at, o.created_at)
  loop
    v_st := case when r.status in ('created', 'pending_payment') then 'pending' else 'used' end;
    begin
      insert into crm.trial_claims (order_id, user_id, phone, address_phone, address_key, status,
                                    claimed_at, used_at, delivered_at)
      values (r.id, r.user_id, coalesce(r.phone, r.addr_phone), r.addr_phone, r.addr_key, v_st,
              r.created_at, case when v_st = 'used' then coalesce(r.paid_at, r.created_at) end, r.delivered_at);
    exception when unique_violation then
      insert into crm.trial_claims (order_id, user_id, phone, address_phone, address_key, status,
                                    claimed_at, used_at, delivered_at, is_override, override_reason)
      values (r.id, r.user_id, coalesce(r.phone, r.addr_phone), r.addr_phone, r.addr_key, v_st,
              r.created_at, case when v_st = 'used' then coalesce(r.paid_at, r.created_at) end, r.delivered_at,
              true, 'backfill: repeat trial before the one-per-customer rule');
    end;
  end loop;
end;
$$;

-- Let the API see the new function signature immediately.
notify pgrst, 'reload schema';
