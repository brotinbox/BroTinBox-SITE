-- Daily SEO refresh: scheduled blog posts go live at 09:00 IST (published_at).
-- At 09:10 IST pg_cron calls /api/cron/seo-sitemap, which expires the blog cache
-- and resubmits sitemap.xml to Google Search Console when a post went live.
--
-- Uses the same Vault secret as the other /api/cron/* jobs ('brotin_cron_secret').

create extension if not exists pg_net;

select cron.unschedule('brotin-seo-sitemap')
where exists (select 1 from cron.job where jobname = 'brotin-seo-sitemap');

-- pg_cron runs in UTC: 03:40 UTC = 09:10 IST.
select cron.schedule('brotin-seo-sitemap', '40 3 * * *', $$
  select net.http_post(
    url     := 'https://www.brotinbox.com/api/cron/seo-sitemap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brotin_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$$);
