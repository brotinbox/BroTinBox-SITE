-- "Signed in but didn't pay" alerts.
-- Every 10 minutes pg_cron calls the app's /api/cron/unpaid-orders, which
-- sends one Telegram alert per order left unpaid for 30+ minutes and stamps
-- orders.unpaid_alerted_at so it never alerts twice.
--
-- Before running: store the app's CRON_SECRET in Vault once (SQL editor):
--   select vault.create_secret('<CRON_SECRET value>', 'brotin_cron_secret', 'pg_cron → /api/cron/*');

alter table public.orders add column if not exists unpaid_alerted_at timestamptz;

create extension if not exists pg_net;

select cron.unschedule('brotin-unpaid-order-alerts')
where exists (select 1 from cron.job where jobname = 'brotin-unpaid-order-alerts');

select cron.schedule('brotin-unpaid-order-alerts', '*/10 * * * *', $$
  select net.http_post(
    url     := 'https://www.brotinbox.com/api/cron/unpaid-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brotin_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
$$);
