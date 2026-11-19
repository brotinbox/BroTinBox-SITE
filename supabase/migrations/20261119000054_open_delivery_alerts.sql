-- BroTin Box · 0054 Morning alert for past meals never closed
-- A delivery left in locked / packed / out_for_delivery after its day keeps
-- its plan "active" forever (daily_housekeeping only completes a plan once no
-- delivery is open). Every morning at 9:00 AM IST pg_cron calls
-- /api/cron/open-deliveries, which sends one Telegram list until they are
-- marked delivered or failed. Same Vault secret as the other /api/cron/* jobs.

create extension if not exists pg_net;

select cron.unschedule('brotin-open-deliveries')
where exists (select 1 from cron.job where jobname = 'brotin-open-deliveries');

-- pg_cron runs in UTC: 03:30 UTC = 09:00 IST.
select cron.schedule('brotin-open-deliveries', '30 3 * * *', $$
  select net.http_post(
    url     := 'https://www.brotinbox.com/api/cron/open-deliveries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brotin_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
$$);
