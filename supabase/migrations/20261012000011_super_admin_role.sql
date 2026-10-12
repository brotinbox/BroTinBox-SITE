-- =============================================================================
-- BroTin Box · 0011 super_admin role
-- Enum values must be committed before they are used, so this is its own file.
-- =============================================================================

alter type public.app_role   add value if not exists 'super_admin';
alter type public.actor_role add value if not exists 'super_admin';
