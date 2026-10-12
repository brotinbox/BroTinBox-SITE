-- =============================================================================
-- BroTin Box · 0005 Content, leads, activity log, domain events, notifications
--
-- Public form submissions (enquiries, waitlist, reviews) are inserted by the
-- server AFTER rate limiting + Turnstile, using service_role. There are no
-- anon insert policies, so the rate limiter cannot be bypassed via the REST API.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------------
create table public.blog_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.blog_posts (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title             text not null,
  excerpt           text,
  content           text not null default '',          -- Markdown, sanitised on render
  cover_image_url   text,
  category_id       uuid references public.blog_categories (id) on delete set null,
  tags              text[] not null default '{}',
  author_id         uuid references public.profiles (id) on delete set null,
  author_name       text,
  author_role       text,
  read_minutes      int,
  macros_highlight  text,
  status            public.content_status not null default 'draft',
  published_at      timestamptz,
  seo_title         text,
  seo_description   text,
  og_image_url      text,
  is_featured       boolean not null default false,
  views             bigint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (status not in ('published', 'scheduled') or published_at is not null)
);
create index blog_posts_public_idx on public.blog_posts (status, published_at desc);
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- View counter without giving anon update rights.
create or replace function public.increment_blog_view(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.blog_posts set views = views + 1
  where slug = p_slug and status = 'published' and published_at <= now()
$$;

-- ---------------------------------------------------------------------------
-- FAQs, reviews
-- ---------------------------------------------------------------------------
create table public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  category    text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles (id) on delete set null,
  name              text not null,
  area              text,
  avatar_url        text,
  rating            smallint not null check (rating between 1 and 5),
  comment           text not null check (length(comment) between 5 and 2000),
  goal              text,
  meals_delivered   int,
  status            public.review_status not null default 'pending',
  is_featured       boolean not null default false,
  moderated_by      uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create table public.enquiries (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(name) between 1 and 120),
  phone              text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  area               text,
  goal               text,
  diet               text,
  plan_interest      text,
  preferred_slot     text,
  note               text check (note is null or length(note) <= 2000),
  source             text not null default 'website',
  status             public.lead_status not null default 'new',
  assigned_to        uuid references public.profiles (id) on delete set null,
  converted_user_id  uuid references public.profiles (id) on delete set null,
  ip_hash            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index enquiries_status_idx on public.enquiries (status, created_at desc);
create trigger enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

create table public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  pincode     text not null check (pincode ~ '^[0-9]{6}$'),
  area        text,
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (phone, pincode)
);

-- ---------------------------------------------------------------------------
-- Activity log: every customer/admin/system action, shown as the timeline on
-- the admin customer page.
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles (id) on delete set null,   -- the customer affected
  actor_id    uuid references public.profiles (id) on delete set null,   -- who did it (null = system)
  actor_role  public.actor_role not null,
  entity      text not null,           -- subscription | delivery | order | profile | menu | …
  entity_id   uuid,
  action      text not null,           -- skip | unskip | pause | resume | cancel | customise | refund | …
  before      jsonb,
  after       jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);
create index activity_user_idx   on public.activity_log (user_id, created_at desc);
create index activity_entity_idx on public.activity_log (entity, entity_id);

-- Internal helper used by every business function.
create or replace function public.log_activity(
  p_user uuid, p_entity text, p_entity_id uuid, p_action text,
  p_before jsonb default null, p_after jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.actor_role;
begin
  if auth.uid() is null then
    r := 'system';
  elsif auth.uid() = p_user and public.user_role() = 'customer' then
    r := 'customer';
  else
    r := public.user_role()::text::public.actor_role;
  end if;

  insert into public.activity_log (user_id, actor_id, actor_role, entity, entity_id, action, before, after)
  values (p_user, auth.uid(), r, p_entity, p_entity_id, p_action, p_before, p_after);

  insert into public.domain_events (type, user_id, entity, entity_id, payload)
  values (p_entity || '.' || p_action, p_user, p_entity, p_entity_id,
          jsonb_build_object('before', p_before, 'after', p_after));
end;
$$;

-- ---------------------------------------------------------------------------
-- Domain events (outbox): notifications/analytics/webhooks consume these.
-- ---------------------------------------------------------------------------
create table public.domain_events (
  id            bigint generated always as identity primary key,
  type          text not null,          -- order.paid, delivery.skip, subscription.pause …
  user_id       uuid,
  entity        text,
  entity_id     uuid,
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  processed_at  timestamptz,
  attempts      int not null default 0,
  last_error    text
);
create index domain_events_pending_idx on public.domain_events (created_at) where processed_at is null;

-- ---------------------------------------------------------------------------
-- Notifications (in-app inbox + record of WhatsApp/email/Telegram sends)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,   -- null = staff broadcast
  channel     text not null check (channel in ('in_app', 'whatsapp', 'email', 'telegram')),
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  sent_at     timestamptz,
  read_at     timestamptz,
  error       text,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.blog_categories enable row level security;
alter table public.blog_posts      enable row level security;
alter table public.faqs            enable row level security;
alter table public.reviews         enable row level security;
alter table public.enquiries       enable row level security;
alter table public.waitlist        enable row level security;
alter table public.activity_log    enable row level security;
alter table public.domain_events   enable row level security;   -- no policies: service_role only
alter table public.notifications   enable row level security;

create policy "blog_categories: public reads" on public.blog_categories for select using (true);
create policy "blog_categories: editors write" on public.blog_categories
  for all using (public.has_permission('blog.write')) with check (public.has_permission('blog.write'));

create policy "blog: public reads published" on public.blog_posts
  for select using ((status = 'published' and published_at <= now()) or public.has_permission('blog.read'));
create policy "blog: editors write" on public.blog_posts
  for all using (public.has_permission('blog.write')) with check (public.has_permission('blog.write'));

create policy "faqs: public reads active" on public.faqs
  for select using (is_active or public.is_staff());
create policy "faqs: admin writes" on public.faqs
  for all using (public.has_permission('content.write')) with check (public.has_permission('content.write'));

create policy "reviews: public reads approved" on public.reviews
  for select using (status = 'approved' or user_id = (select auth.uid()) or public.has_permission('reviews.read'));
create policy "reviews: moderators write" on public.reviews
  for update using (public.has_permission('reviews.write')) with check (public.has_permission('reviews.write'));
create policy "reviews: admin deletes" on public.reviews
  for delete using (public.is_admin());

create policy "enquiries: staff reads" on public.enquiries
  for select using (public.has_permission('enquiries.read'));
create policy "enquiries: staff updates" on public.enquiries
  for update using (public.has_permission('enquiries.write')) with check (public.has_permission('enquiries.write'));

create policy "waitlist: staff reads" on public.waitlist
  for select using (public.has_permission('zones.read'));

create policy "activity: own timeline" on public.activity_log
  for select using (user_id = (select auth.uid()) and actor_role in ('customer', 'system'));
create policy "activity: staff reads" on public.activity_log
  for select using (public.has_permission('customers.read'));

create policy "notifications: owner reads" on public.notifications
  for select using (user_id = (select auth.uid()));
create policy "notifications: owner marks read" on public.notifications
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: staff reads" on public.notifications
  for select using (public.is_staff());
