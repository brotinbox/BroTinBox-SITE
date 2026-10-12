-- =============================================================================
-- BroTin Box · 0009 Covering indexes for foreign keys
-- From the Supabase performance advisor (unindexed_foreign_keys). Speeds up
-- joins and ON DELETE checks as tables grow.
-- =============================================================================

create index if not exists activity_log_actor_id_idx on public.activity_log (actor_id);
create index if not exists addresses_zone_id_idx on public.addresses (zone_id);
create index if not exists blog_posts_author_id_idx on public.blog_posts (author_id);
create index if not exists blog_posts_category_id_idx on public.blog_posts (category_id);
create index if not exists coupon_redemptions_user_id_idx on public.coupon_redemptions (user_id);
create index if not exists customer_notes_author_id_idx on public.customer_notes (author_id);
create index if not exists deliveries_address_id_idx on public.deliveries (address_id);
create index if not exists deliveries_order_id_idx on public.deliveries (order_id);
create index if not exists deliveries_zone_id_idx on public.deliveries (zone_id);
create index if not exists delivery_addons_addon_id_idx on public.delivery_addons (addon_id);
create index if not exists delivery_addons_order_id_idx on public.delivery_addons (order_id);
create index if not exists delivery_zones_kitchen_id_idx on public.delivery_zones (kitchen_id);
create index if not exists enquiries_assigned_to_idx on public.enquiries (assigned_to);
create index if not exists enquiries_converted_user_id_idx on public.enquiries (converted_user_id);
create index if not exists kitchen_closures_created_by_idx on public.kitchen_closures (created_by);
create index if not exists menu_overrides_carb_id_idx on public.menu_overrides (carb_id);
create index if not exists menu_overrides_created_by_idx on public.menu_overrides (created_by);
create index if not exists menu_overrides_legume_id_idx on public.menu_overrides (legume_id);
create index if not exists menu_overrides_main_id_idx on public.menu_overrides (main_id);
create index if not exists menu_overrides_protein_side_id_idx on public.menu_overrides (protein_side_id);
create index if not exists menu_overrides_salad_id_idx on public.menu_overrides (salad_id);
create index if not exists menu_rotation_carb_id_idx on public.menu_rotation (carb_id);
create index if not exists menu_rotation_legume_id_idx on public.menu_rotation (legume_id);
create index if not exists menu_rotation_main_id_idx on public.menu_rotation (main_id);
create index if not exists menu_rotation_protein_side_id_idx on public.menu_rotation (protein_side_id);
create index if not exists menu_rotation_salad_id_idx on public.menu_rotation (salad_id);
create index if not exists menu_rotation_updated_by_idx on public.menu_rotation (updated_by);
create index if not exists orders_coupon_id_idx on public.orders (coupon_id);
create index if not exists pricing_rules_created_by_idx on public.pricing_rules (created_by);
create index if not exists profiles_kitchen_id_idx on public.profiles (kitchen_id);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
create index if not exists refunds_initiated_by_idx on public.refunds (initiated_by);
create index if not exists refunds_payment_id_idx on public.refunds (payment_id);
create index if not exists reviews_moderated_by_idx on public.reviews (moderated_by);
create index if not exists reviews_user_id_idx on public.reviews (user_id);
create index if not exists site_settings_updated_by_idx on public.site_settings (updated_by);
create index if not exists subscriptions_address_id_idx on public.subscriptions (address_id);
create index if not exists subscriptions_kitchen_id_idx on public.subscriptions (kitchen_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);
