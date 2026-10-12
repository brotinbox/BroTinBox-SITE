# BroTin Box - Fixed-Rotation Protein Boxes & Measured Subscription (Coimbatore)

> **"Every gram counted. One set cook per day. Delivered fresh in Coimbatore."**

BroTin Box operates an optimized, zero-waste meal subscription model: **one batch-cooked protein box per day** (Mon to Sat, Sunday kitchen off). This ensures consistent quality, lean kitchen preparation, exact batch counts, and affordable delivery routes across Coimbatore.

---

## 🍱 Operational 6-Box Model

| Day | Box Name | Main | Salad | Carb | Legume | ~kcal | ~Protein | Price |
|---|---|---|---|---|---|---|---|---|
| **Mon** | **Power Chicken Box** | Kongu pepper chicken | Kachumber | Chapati | Brown channa | 695 | 60 g | ₹299 |
| **Tue** | **Paneer Balance Box** | Paneer bhurji | Beet-carrot slaw | Ragi dosa | White channa | 685 | 42 g | ₹269 |
| **Wed** | **Lean Fish Box** | Tawa masala fish | Sprout salad | Brown rice | Brown channa | 695 | 56 g | ₹279 |
| **Thu** | **Tikka Chicken Box** | Chicken tikka | Corn-capsicum | Chapati | Peanut sundal | 720 | 63 g | ₹299 |
| **Fri** | **Soya Strong Box** | Soya pepper fry | Mint-cucumber curd | Veg masala oats | White channa | 715 | 51 g | ₹269 |
| **Sat** | **Paneer Tikka Box** | Paneer tikka | Tomato-pepper-cabbage | Millet rice | Brown channa | 725 | 43 g | ₹269 |

- **Eggs & Veg Option:** Every box includes 2 boiled eggs. Veg subscribers can toggle the **"Egg-free version"** where eggs are swapped for an extra portion of legumes at no extra charge.
- **Side Box Extras:** Grilled Chicken Salad (38g P / 260 kcal), Chicken Salad (28g P / 230 kcal), Chicken Post Workout Meal (42g P / 450 kcal), Grilled Paneer Salad (22g P / 300 kcal), Paneer Salad (17g P / 250 kcal), Paneer Post Workout Meal (28g P / 480 kcal).
- **Cold-Pressed Drinks (250 ml, fresh daily, no added sugar):** Beetroot (₹69), Cucumber-Mint (₹49), Fresh Carrot (₹59, 16g natural sugars), Nagpur Orange (₹79, 21g natural sugars).
- **Subscription Discounts:** 6-day weekly and 24-day monthly plans save 8% to 10%. Single-day one-off orders carry a ₹30 kitchen dispatch surcharge.
- **Ordering Cutoff:** 9:00 PM the previous night.

---

## 🌟 Key Application Features

- **"This Week" Menu (`/menu`):** Mon–Sat day tabs, highlight of today's box, allergen badges, and an Extras tab for high-protein sides & cold-pressed juices.
- **Box Breakdown (`/box/[slug]`):** 5-item weighed breakdown, macro donut, health benefits, allergens, suggested side combos, and sticky CTA.
- **"Choose Your Week" Planner (`/build-plan`):** Pick days, 1 or 2 boxes per day, egg-free toggle, add daily sides & drinks, compare against Mifflin-St Jeor daily macro targets, with automated gap-closing side recommendations.
- **Subscription Plans (`/plans`):** 6-Day Starter, 12-Meal Active, 24-Day Muscle Builder, plus weekly Juice and High-Protein Side bundles.
- **Central Kitchen Admin Cook-Sheet (`/admin/cook-sheet`):** Batch production counts for today's box, egg-free count, sides count, juices count, and area delivery sheets (RS Puram, Gandhipuram, Peelamedu, Saibaba Colony, Saravanampatti).
- **Transparent Lab Disclaimers:** Clearly marked placeholder indicators for nutritional lab testing and user reviews.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node v20/v22)
- npm or pnpm

### Installation & Run

```bash
# 1. Clone or navigate to the repository
cd "FITNESS-BUISSNESS"

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Production build test
npm run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Data & Architecture Map

```
├── /data
│   ├── boxes.json             # 6 daily protein boxes with 5-item breakdowns & egg-free versions
│   ├── sides.json             # 6 high-protein sides & post-workout bowls
│   ├── addons.json            # 4 fresh 250ml juices with sugar disclosures
│   ├── schedule.json          # Mon-Sat rotation mapping
│   ├── plans.json             # Weekly & monthly plans with add-on bundles
│   ├── zones.json             # Coimbatore delivery coverage
│   └── reviews.json           # Beta cohort feedback placeholders
├── /app
│   ├── /menu                  # "This week" Mon-Sat tabs + Extras tab
│   ├── /box/[slug]            # 5-item breakdown, donut chart & add-on upsells
│   ├── /build-plan            # "Choose your week" macro validator & planner
│   ├── /plans                 # Subscription tiers & add-on bundles
│   ├── /checkout              # Line items, ₹30 single-day surcharge, 9 PM cutoff
│   ├── /admin/cook-sheet      # Single-batch counts & area delivery sheets
│   └── /admin/dishes          # Live boxes, sides, and drinks inventory
├── /lib/api
│   ├── boxes.ts               # getBoxes(), getBoxBySlug(), getSchedule(), getSides(), getAddons()
│   ├── planner.ts             # Mifflin-St Jeor target comparison & side recommender
│   └── orders.ts              # Orders service with box, side, and drink items
└── /store
    └── useAppStore.ts         # Zustand store with dayConfigs, egg-free swaps, sides & drinks
```
