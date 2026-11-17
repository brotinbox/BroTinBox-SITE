-- =============================================================================
-- BroTin Box · 0047 Reviews from calls/WhatsApp + "how did you find us"
--
-- 1. Staff can add a review they collected on a call, on WhatsApp or in person
--    (admin › Reviews › New). Each review records where it came from and
--    whether the customer agreed to it being shown. A review can only be
--    approved (shown on the website) when consent_given is true.
-- 2. crm.heard_from: the optional "How did you find us?" answer from checkout,
--    one per customer (the first answer is kept).
-- =============================================================================

alter table public.reviews
  add column if not exists source text not null default 'website'
    check (source in ('website', 'call', 'whatsapp', 'in_person', 'google', 'instagram')),
  add column if not exists consent_given boolean not null default false;

-- Reviews were only ever updated by staff; now they can be created too.
drop policy if exists "reviews: moderators insert" on public.reviews;
create policy "reviews: moderators insert" on public.reviews
  for insert with check (public.has_permission('reviews.write'));

-- Never show a review the customer didn't agree to. NOT VALID: older rows are
-- left alone until they are next edited.
alter table public.reviews drop constraint if exists reviews_approved_needs_consent;
alter table public.reviews add constraint reviews_approved_needs_consent
  check (status <> 'approved' or consent_given) not valid;

create table if not exists crm.heard_from (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  source      text not null check (source in ('chatgpt', 'google', 'instagram', 'friend', 'poster', 'trainer', 'nearby', 'other')),
  detail      text check (length(detail) <= 200),
  order_id    uuid references public.orders (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists heard_from_source on crm.heard_from (source);

alter table crm.heard_from enable row level security;
revoke all on crm.heard_from from public, anon, authenticated;
grant select, insert, update, delete on crm.heard_from to service_role;

notify pgrst, 'reload schema';
