-- =============================================================================
-- BroTin Box · 0030 WhatsApp follow-ups after a trial box
--
-- Up to three messages per trial, sent by /api/cron/trial-followups:
--   1. day after the box   trial_feedback       (utility: about their order)
--   2. 3 days after        trial_plan_offer     (marketing: needs offers opt-in)
--   3. 7 days after        trial_last_reminder  (marketing: needs offers opt-in)
-- Stops as soon as they buy a weekly/monthly plan, tap "Stop offers", reply
-- STOP, or staff mark them "Not interested". Sending is also gated by the
-- TRIAL_FOLLOWUP_MODE env switch (off / test / on) in the app.
--
-- Before running: the Vault secret 'brotin_cron_secret' from 0027 must exist.
-- =============================================================================

-- Separate consent for promotional WhatsApp messages (privacy policy: promos only with opt-in).
-- whatsapp_opt_in stays "delivery and order updates".
alter table public.profiles
  add column if not exists whatsapp_offers_opt_in    boolean not null default false,
  add column if not exists whatsapp_offers_opt_in_at timestamptz;

-- One row per automated message: what was sent, to whom, and what WhatsApp reported back.
create table if not exists crm.whatsapp_messages (
  id             uuid primary key default gen_random_uuid(),
  claim_id       uuid references crm.trial_claims (id) on delete set null,
  user_id        uuid references public.profiles (id) on delete set null,
  phone          text not null,                         -- 10 digits
  template       text not null,
  stage          smallint,
  status         text not null default 'queued'
                 check (status in ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  wa_message_id  text unique,
  error_code     int,
  error_title    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- Never send the same follow-up stage twice for one trial (double cron runs, retries).
create unique index if not exists whatsapp_messages_claim_stage on crm.whatsapp_messages (claim_id, stage)
  where claim_id is not null and stage is not null;
create index if not exists whatsapp_messages_created_idx on crm.whatsapp_messages (created_at desc);

drop trigger if exists whatsapp_messages_updated_at on crm.whatsapp_messages;
create trigger whatsapp_messages_updated_at before update on crm.whatsapp_messages
  for each row execute function public.set_updated_at();

alter table crm.whatsapp_messages enable row level security;
revoke all on crm.whatsapp_messages from public, anon, authenticated;
grant select, insert, update, delete on crm.whatsapp_messages to service_role;

-- Every 30 minutes; the app only sends between 10:00 and 19:30 IST.
select cron.unschedule('brotin-trial-followups')
where exists (select 1 from cron.job where jobname = 'brotin-trial-followups');

select cron.schedule('brotin-trial-followups', '*/30 * * * *', $$
  select net.http_post(
    url     := 'https://www.brotinbox.com/api/cron/trial-followups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brotin_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$$);

notify pgrst, 'reload schema';
