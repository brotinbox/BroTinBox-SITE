-- WhatsApp / SMS one-time codes for phone sign-in.
-- Lives in its own `otp` schema, reachable only by the service role.
-- After applying: Dashboard → Settings → API → Exposed schemas → add `otp`.
create schema if not exists otp;

create table otp.phone_otps (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null check (phone ~ '^\+[0-9]{10,15}$'),
  code_hash    text not null,
  channel      text not null default 'whatsapp' check (channel in ('whatsapp', 'sms')),
  attempts     smallint not null default 0,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index phone_otps_phone_created_idx on otp.phone_otps (phone, created_at desc);

alter table otp.phone_otps enable row level security;

revoke all on schema otp from public, anon, authenticated;
revoke all on all tables in schema otp from public, anon, authenticated;
grant usage on schema otp to service_role;
grant select, insert, update, delete on otp.phone_otps to service_role;
