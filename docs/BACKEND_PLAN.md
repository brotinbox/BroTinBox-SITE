# BroTin Box Backend Migration & Architecture Plan

This document outlines the database schema, API contracts, kitchen batch aggregation logic, and third-party integrations required to transition BroTin Box from mock JSON files to a production relational database (e.g. Supabase, PostgreSQL) and API backend.

---

## 1. Database Schema (PostgreSQL)

### `boxes` (Replaces `dishes`)
One set box per day (Mon–Sat, Sunday off).

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) (PK) | e.g. `box-mon` |
| `slug` | VARCHAR(100) (UNIQUE) | e.g. `power-chicken-box` |
| `name` | VARCHAR(150) | e.g. `Power Chicken Box` |
| `day` | VARCHAR(10) | `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat` |
| `is_veg` | BOOLEAN | Veg classification |
| `contains_egg` | BOOLEAN | True (default: all include 2 boiled eggs) |
| `tags` | TEXT[] | `['High Protein', 'Chef Curated', 'Batch Cooked']` |
| `allergens` | TEXT[] | `['Eggs', 'Mustard', 'Gluten']` |
| `free_from` | TEXT[] | `['Gelatin-free', 'Dairy-free']` |
| `price` | NUMERIC(10,2) | ₹269 (veg/paneer/soya), ₹279 (fish), ₹299 (chicken) |
| `total_calories` | INT | ~685 to 725 kcal |
| `total_protein` | INT | ~42 to 63 g |
| `total_carbs` | INT | Portion carbs (g) |
| `total_fat` | INT | Portion fat (g) |
| `total_weight_g` | INT | Net box weight in grams |
| `egg_free_replaces_with` | VARCHAR(150) | e.g. `Extra 50g Brown Channa Sundal` |
| `egg_free_protein_diff` | INT | e.g. `-4` g |
| `egg_free_calories_diff`| INT | e.g. `+15` kcal |

### `box_items`
5-item weighed breakdown for each box.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Item identifier |
| `box_id` | VARCHAR(50) (FK) | Reference to `boxes.id` |
| `item_type` | VARCHAR(20) | `main`, `salad`, `carb`, `legume`, `egg` |
| `name` | VARCHAR(150) | e.g. `Kongu Pepper Chicken` |
| `grams` | INT | Calibrated portion weight (g) |
| `calories` | INT | Calibrated calories |
| `protein` | INT | Calibrated protein (g) |
| `carbs` | INT | Carbohydrates (g) |
| `fat` | INT | Fat (g) |
| `image_url` | TEXT | High-resolution item photo |

### `schedule`
Weekly fixed rotation mapping.

| Column | Type | Description |
|---|---|---|
| `day` | VARCHAR(3) (PK) | `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat` |
| `box_id` | VARCHAR(50) (FK) | Reference to `boxes.id` |
| `is_active` | BOOLEAN | Operational toggle |

### `sides`
6 high-protein sides & post-workout bowls.

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) (PK) | e.g. `side-grilled-chicken` |
| `name` | VARCHAR(150) | e.g. `Grilled Chicken with Salad` |
| `category` | VARCHAR(50) | `Protein Booster`, `Fresh Bowl`, `Post-Workout` |
| `price` | NUMERIC(10,2) | ₹159 to ₹229 |
| `calories` | INT | Portion calories |
| `protein` | INT | Portion protein (g) |
| `carbs` | INT | Portion carbs (g) |
| `fat` | INT | Portion fat (g) |
| `weight_g` | INT | Cooked weight |
| `is_veg` | BOOLEAN | Veg classification |
| `description` | TEXT | Custom nutritional description |

### `addons` (Drinks)
250 ml cold-pressed juices with natural sugar transparency.

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) (PK) | e.g. `addon-orange` |
| `name` | VARCHAR(150) | e.g. `Nagpur Cold-Pressed Orange Juice` |
| `volume_ml` | INT | 250 |
| `price` | NUMERIC(10,2) | ₹49 to ₹79 |
| `calories` | INT | Calorie count |
| `sugar_g` | NUMERIC(5,1) | Disclosed natural sugar per glass (e.g. 21g for orange, 16g for carrot) |
| `benefits` | TEXT[] | Antioxidant & hydration claims |

### `plans` & `subscriptions`
Weekly (6 boxes) and monthly (24 days) recurring plans with add-on bundles.

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(50) (PK) | e.g. `plan-weekly-6` |
| `name` | VARCHAR(100) | `6-Day Weekly Rotation` |
| `billing_cycle` | VARCHAR(20) | `weekly`, `monthly` |
| `base_discount_percent`| INT | 8 to 10% |
| `price_per_cycle` | NUMERIC(10,2) | e.g. ₹1,532 |
| `single_day_surcharge` | NUMERIC(10,2) | ₹30 |
| `juice_bundle_price` | NUMERIC(10,2) | ₹299/week |
| `side_bundle_price` | NUMERIC(10,2) | ₹999/week |

---

## 2. Kitchen Batch Aggregation (Cook-Sheet Query)

Because the kitchen operates a single-box-per-day rotation, the morning cook-sheet is calculated by counting order items placed before the 9:00 PM cutoff:

```sql
-- Morning Batch Production Count for Today (e.g., 'Mon')
SELECT 
  b.name AS box_name,
  COUNT(*) FILTER (WHERE oi.is_egg_free = false) AS standard_box_count,
  COUNT(*) FILTER (WHERE oi.is_egg_free = true) AS egg_free_box_count,
  COUNT(*) AS total_boxes_to_cook
FROM order_items oi
JOIN boxes b ON oi.box_id = b.id
WHERE oi.delivery_date = CURRENT_DATE
GROUP BY b.name;

-- Sides Batch Requirements
SELECT 
  s.name AS side_name,
  COUNT(*) AS portions_needed
FROM order_items oi
JOIN sides s ON oi.side_id = s.id
WHERE oi.delivery_date = CURRENT_DATE
GROUP BY s.name;

-- Juices Bottling Requirements
SELECT 
  a.name AS juice_name,
  COUNT(*) AS bottles_250ml
FROM order_items oi
JOIN addons a ON oi.addon_id = a.id
WHERE oi.delivery_date = CURRENT_DATE
GROUP BY a.name;
```

---

## 3. API Endpoints Contract

### Menu & Rotation
- `GET /api/v1/boxes` -> List 6 weekly boxes with items and macro totals.
- `GET /api/v1/boxes/:slug` -> Single box with 5-item breakdown, allergens, and recommended sides.
- `GET /api/v1/sides` -> 6 high-protein sides.
- `GET /api/v1/addons` -> 4 cold-pressed drinks with natural sugar disclosure.
- `GET /api/v1/schedule/today` -> Returns today's active box and remaining cutoff time (9:00 PM previous night).

### Planner & Recommender
- `POST /api/v1/planner/recommend-sides`
  - Input: `{ dayBoxProtein, targetProtein, dayBoxCalories, targetCalories, isVeg }`
  - Output: Recommended sides to bridge the macro gap without overshooting calorie targets.

### Orders & Kitchen Admin
- `GET /api/v1/admin/cook-sheet?date=YYYY-MM-DD`
  - Returns: `{ boxCounts: { standard, eggFree, total }, sidesCounts, drinksCounts, areaDeliveries }`
