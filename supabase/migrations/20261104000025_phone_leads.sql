-- Phone leads: every number that asks for a WhatsApp login code, what they were
-- looking at, and how far they got (code requested → signed in → order placed).
-- Lives in the private otp schema: only the server (service role) reads or
-- writes it. Admin pages check staff permissions in code before using it.

create table if not exists otp.phone_leads (
  phone          text primary key check (phone ~ '^\+[0-9]{10,15}$'),
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  code_requests  integer not null default 1,
  source         text,                 -- page path where sign-in started
  context        jsonb,                -- what they picked, e.g. {"flow":"trial","summary":"…","area":"…"}
  user_id        uuid references auth.users(id) on delete set null,
  verified_at    timestamptz,
  ordered_at     timestamptz,
  order_id       uuid,
  contacted_at   timestamptz,
  note           text check (note is null or length(note) <= 500)
);

create index if not exists phone_leads_last_seen_idx on otp.phone_leads (last_seen_at desc);
create index if not exists phone_leads_user_idx on otp.phone_leads (user_id);

alter table otp.phone_leads enable row level security;

revoke all on otp.phone_leads from public, anon, authenticated;
grant select, insert, update, delete on otp.phone_leads to service_role;

-- Upsert from the OTP send route: counts repeat requests, keeps the latest context.
create or replace function otp.track_phone_lead(p_phone text, p_source text, p_context jsonb)
returns void
language sql
set search_path = otp
as $$
  insert into otp.phone_leads (phone, source, context)
  values (p_phone, p_source, p_context)
  on conflict (phone) do update set
    last_seen_at  = now(),
    code_requests = otp.phone_leads.code_requests + 1,
    source        = coalesce(excluded.source, otp.phone_leads.source),
    context       = coalesce(excluded.context, otp.phone_leads.context);
$$;

revoke all on function otp.track_phone_lead(text, text, jsonb) from public, anon, authenticated;
grant execute on function otp.track_phone_lead(text, text, jsonb) to service_role;
