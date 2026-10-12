-- =============================================================================
-- BroTin Box · 0008 Scheduled jobs (pg_cron runs in UTC; IST = UTC+5:30)
-- Jobs that send messages (renewal reminders, Telegram kitchen summary) run
-- from Vercel Cron → /api/cron/* instead, reading domain_events.
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- 21:00 IST → 15:30 UTC: lock next operating day's deliveries (cook sheet final)
select cron.schedule('brotin-nightly-lock', '30 15 * * *', $$ select public.lock_deliveries(); $$);

-- 00:05 IST → 18:35 UTC: auto-resume pauses, complete finished subs, expire stale orders
select cron.schedule('brotin-daily-housekeeping', '35 18 * * *', $$ select public.daily_housekeeping(); $$);

-- Every 15 min: expire unpaid orders + publish scheduled blog posts
select cron.schedule('brotin-quarter-hourly', '*/15 * * * *', $$
  update public.orders set status = 'cancelled'
   where status in ('created', 'pending_payment') and expires_at < now();
  update public.blog_posts set status = 'published'
   where status = 'scheduled' and published_at <= now();
$$);
