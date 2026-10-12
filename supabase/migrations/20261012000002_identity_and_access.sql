-- =============================================================================
-- BroTin Box · 0002 Identity, roles, permissions, settings, kitchens
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Kitchens (single Coimbatore kitchen today; column exists so a 2nd kitchen
-- or city never requires reworking queries)
-- ---------------------------------------------------------------------------
create table public.kitchens (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  city        text not null,
  address     text,
  lat         numeric(9,6),
  lng         numeric(9,6),
  is_active   boolean not null default true,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger kitchens_updated_at before update on public.kitchens
  for each row execute function public.set_updated_at();

insert into public.kitchens (code, name, city, address, lat, lng)
values ('CBE-01', 'BroTin Box Central Kitchen', 'Coimbatore', 'Kuniyamuthur, Coimbatore 641008', 10.957500, 76.953000);

create or replace function public.default_kitchen_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select id from public.kitchens where code = 'CBE-01' $$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  full_name             text,
  email                 extensions.citext,
  phone                 text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  phone_verified        boolean not null default false,
  avatar_url            text,
  role                  public.app_role not null default 'customer',
  goal                  text check (goal in ('fat-loss', 'muscle-gain', 'stay-fit', 'elderly-care')),
  gender                text check (gender in ('male', 'female', 'other')),
  date_of_birth         date,
  height_cm             numeric(5,1) check (height_cm between 50 and 260),
  weight_kg             numeric(5,1) check (weight_kg between 20 and 350),
  target_weight_kg      numeric(5,1) check (target_weight_kg between 20 and 350),
  activity_level        text check (activity_level in ('sedentary', 'lightly-active', 'moderately-active', 'very-active')),
  diet_type             text check (diet_type in ('veg', 'non-veg', 'eggetarian')),
  allergies             text[] not null default '{}',
  disliked_ingredients  text[] not null default '{}',
  target_calories       int check (target_calories between 0 and 10000),
  target_protein        int check (target_protein between 0 and 1000),
  target_carbs          int check (target_carbs between 0 and 2000),
  target_fat            int check (target_fat between 0 and 1000),
  is_onboarded          boolean not null default false,
  referral_code         text unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  referred_by           uuid references public.profiles (id) on delete set null,
  marketing_opt_in      boolean not null default false,
  whatsapp_opt_in       boolean not null default true,
  is_blocked            boolean not null default false,
  last_seen_at          timestamptz,
  kitchen_id            uuid references public.kitchens (id) default public.default_kitchen_id(),
  metadata              jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index profiles_role_idx  on public.profiles (role);
create index profiles_phone_idx on public.profiles (phone);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role & permission helpers (security definer → no RLS recursion)
-- ---------------------------------------------------------------------------
create table public.role_permissions (
  role        public.app_role not null,
  permission  text not null,           -- e.g. 'orders.read', 'orders.*', 'menu.write'
  primary key (role, permission)
);

create or replace function public.user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and not is_blocked),
    'customer'::public.app_role)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select auth.uid() is not null and public.user_role() = 'admin' $$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select auth.uid() is not null and public.user_role() in ('admin', 'kitchen', 'rider', 'support') $$;

-- has_permission('orders.refund') — admin always true; '<resource>.*' wildcards honoured.
create or replace function public.has_permission(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    public.user_role() = 'admin'
    or exists (
      select 1 from public.role_permissions rp
      where rp.role = public.user_role()
        and (rp.permission = p or rp.permission = split_part(p, '.', 1) || '.*')
    )
  )
$$;

insert into public.role_permissions (role, permission) values
  ('kitchen', 'dashboard.read'), ('kitchen', 'cooksheet.*'), ('kitchen', 'deliveries.read'),
  ('kitchen', 'menu.read'), ('kitchen', 'deliveries.write'),
  ('rider', 'deliveries.read_assigned'), ('rider', 'deliveries.update_assigned'),
  ('support', 'dashboard.read'), ('support', 'customers.read'), ('support', 'customers.notes'),
  ('support', 'orders.read'), ('support', 'subscriptions.read'), ('support', 'subscriptions.write'),
  ('support', 'deliveries.read'), ('support', 'enquiries.*'), ('support', 'reviews.*');

-- ---------------------------------------------------------------------------
-- New auth user → profile row (Google gives full_name / name / avatar_url)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    nullif(new.phone, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Customers may edit their profile but never their role, block flag or referral.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() or auth.uid() is null then   -- admin, or service_role / SQL
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_blocked is distinct from old.is_blocked
     or new.referral_code is distinct from old.referral_code
     or new.phone_verified is distinct from old.phone_verified
     or new.kitchen_id is distinct from old.kitchen_id then
    raise exception 'Not allowed to change privileged profile fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------
create table public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  label           text not null default 'Home' check (label in ('Home', 'Work', 'Other')),
  recipient_name  text not null,
  phone           text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  flat            text not null,
  street          text not null,
  landmark        text,
  area            text not null,
  pincode         text not null check (pincode ~ '^[0-9]{6}$'),
  city            text not null default 'Coimbatore',
  lat             numeric(9,6),
  lng             numeric(9,6),
  zone_id         uuid,                                -- FK added in 0003 (zones)
  instructions    text,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default on public.addresses (user_id) where is_default;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Progress logs
-- ---------------------------------------------------------------------------
create table public.progress_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  log_date    date not null,
  weight_kg   numeric(5,1),
  calories    int,
  protein     int,
  water_l     numeric(4,1),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, log_date)
);
create trigger progress_logs_updated_at before update on public.progress_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Staff-only customer notes & tags
-- ---------------------------------------------------------------------------
create table public.customer_notes (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.profiles (id) on delete cascade,
  author_id    uuid references public.profiles (id) on delete set null default auth.uid(),
  body         text not null check (length(body) between 1 and 5000),
  pinned       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index customer_notes_customer_idx on public.customer_notes (customer_id);
create trigger customer_notes_updated_at before update on public.customer_notes
  for each row execute function public.set_updated_at();

create table public.customer_tags (
  customer_id  uuid not null references public.profiles (id) on delete cascade,
  tag          text not null check (length(tag) between 1 and 40),
  created_at   timestamptz not null default now(),
  primary key (customer_id, tag)
);

-- ---------------------------------------------------------------------------
-- Site settings & feature flags (key/value)
-- ---------------------------------------------------------------------------
create table public.site_settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,   -- public ones readable by anon
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

insert into public.site_settings (key, value, is_public) values
  ('cutoff_time',      '"21:00"', true),
  ('ordering_open',    'true', true),
  ('announcement',     '{"enabled": false, "text": "", "href": null}', true),
  ('support_whatsapp', '"+917604909848"', true),
  ('max_pause_days',   '30', true),
  ('features', '{"google_login": true, "whatsapp_otp": false, "autopay": false, "coupons": true, "reviews": true, "rider_app": false, "referrals": false, "wallet": false}', true);

create or replace function public.get_setting(k text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select value from public.site_settings where key = k $$;

create or replace function public.is_feature_enabled(flag text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce((public.get_setting('features') ->> flag)::boolean, false) $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.kitchens         enable row level security;
alter table public.profiles         enable row level security;
alter table public.role_permissions enable row level security;
alter table public.addresses        enable row level security;
alter table public.progress_logs    enable row level security;
alter table public.customer_notes   enable row level security;
alter table public.customer_tags    enable row level security;
alter table public.site_settings    enable row level security;

create policy "kitchens: anyone reads active" on public.kitchens
  for select using (is_active or public.is_staff());
create policy "kitchens: admin writes" on public.kitchens
  for all using (public.is_admin()) with check (public.is_admin());

create policy "profiles: self or staff reads" on public.profiles
  for select using (id = (select auth.uid()) or public.has_permission('customers.read'));
create policy "profiles: self updates" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin updates" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

create policy "role_permissions: staff reads" on public.role_permissions
  for select using (public.is_staff());
create policy "role_permissions: admin writes" on public.role_permissions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "addresses: owner all" on public.addresses
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "addresses: staff reads" on public.addresses
  for select using (public.has_permission('customers.read'));
create policy "addresses: admin writes" on public.addresses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "progress: owner all" on public.progress_logs
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "progress: staff reads" on public.progress_logs
  for select using (public.has_permission('customers.read'));

create policy "notes: staff reads" on public.customer_notes
  for select using (public.has_permission('customers.read'));
create policy "notes: staff writes" on public.customer_notes
  for insert with check (public.has_permission('customers.notes') and author_id = (select auth.uid()));
create policy "notes: author or admin edits" on public.customer_notes
  for update using (author_id = (select auth.uid()) or public.is_admin());
create policy "notes: admin deletes" on public.customer_notes
  for delete using (public.is_admin());

create policy "tags: staff reads" on public.customer_tags
  for select using (public.has_permission('customers.read'));
create policy "tags: admin writes" on public.customer_tags
  for all using (public.has_permission('customers.notes')) with check (public.has_permission('customers.notes'));

create policy "settings: public keys readable" on public.site_settings
  for select using (is_public or public.is_staff());
create policy "settings: admin writes" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
