-- =============================================================================
-- BroTin Box · 0051 Single box: new order type
--
-- Run this on its own, BEFORE 0052. Postgres can't use a new enum value in the
-- same transaction that adds it.
-- =============================================================================

alter type public.plan_type add value if not exists 'single';
