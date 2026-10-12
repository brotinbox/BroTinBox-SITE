// SEO launch set: 10 posts. Body copy lives in the matching .md file.
// Facts (prices, zones, slots, box macros) are checked against data/*.json and the
// live delivery_zones table. Re-check them here if pricing or zones change.

export type CategorySlug = 'clinical-nutrition' | 'kitchen-secrets' | 'workout-nutrition' | 'recipes-macros' | 'metabolic-health';

export interface SeoPost {
  file: string;
  slug: string;
  title: string;
  seo_title: string; // ≤ 60 chars
  seo_description: string; // ≤ 155 chars
  excerpt: string;
  category: CategorySlug;
  tags: string[];
  macros_highlight: string;
  is_featured?: boolean;
  image_prompt: string;
  scene?: boolean; // not a plated-food shot: skip the top-down food styling

}

export const AUTHOR = { name: 'BroTin Box Nutrition Team', role: 'Measured meals, Coimbatore' };

export const SEO_POSTS: SeoPost[] = [
  {
    file: '01-healthy-meal-delivery-coimbatore.md',
    slug: 'healthy-meal-delivery-coimbatore',
    title: 'Healthy Meal Delivery in Coimbatore: The 8-Point Checklist Before You Subscribe',
    seo_title: 'Healthy Meal Delivery in Coimbatore: 2026 Buyer’s Guide',
    seo_description: 'Choosing a healthy meal subscription in Coimbatore? Use this 8-point checklist on macros, freshness, oil, delivery times and pause rules before you pay.',
    excerpt: 'Not every "healthy" meal service is built for results. Here is the 8-point checklist to compare meal subscriptions in Coimbatore, from printed macros to pause rules.',
    category: 'kitchen-secrets',
    tags: ['meal delivery coimbatore', 'healthy food', 'meal subscription', 'high protein'],
    macros_highlight: 'Macros printed on every box',
    is_featured: true,
    image_prompt: 'A neatly packed high-protein meal box on a wooden table: grilled mint chicken pieces, two halved boiled eggs, black chana, corn salad and two chapatis in separate compartments, soft morning window light, Coimbatore home kitchen',
  },
  {
    file: '02-how-much-protein-per-day.md',
    slug: 'how-much-protein-per-day',
    title: 'How Much Protein Do You Need Per Day? A Simple Guide for Indians',
    seo_title: 'How Much Protein Per Day? Simple Guide for Indians',
    seo_description: 'Calculate your daily protein need in grams per kg, see protein in common Indian foods, and follow a sample 110 g protein day without protein powder.',
    excerpt: 'Most Indian diets fall short on protein. Work out your exact daily number in two minutes and learn how to hit it with everyday Indian food.',
    category: 'clinical-nutrition',
    tags: ['protein', 'indian diet', 'protein calculator', 'nutrition basics'],
    macros_highlight: '0.8–2.0 g protein per kg',
    image_prompt: 'An overhead spread of Indian protein foods in small steel bowls: grilled chicken, paneer cubes, boiled eggs, soya chunks, sprouted green gram, chana and a bowl of curd on a stone surface',
  },
  {
    file: '03-calories-in-south-indian-food.md',
    slug: 'calories-in-south-indian-food',
    title: 'Calories in South Indian Food: Idli, Dosa, Pongal, Parotta, Biryani and More',
    seo_title: 'Calories in South Indian Food: Idli, Dosa, Biryani Chart',
    seo_description: 'How many calories in idli, dosa, pongal, parotta and biryani? A clear calorie guide to South Indian food, plus smart swaps that keep the taste.',
    excerpt: 'Idli is light, parotta is not. A practical calorie guide to 40+ South Indian dishes, and why the same dish can vary by 300 calories.',
    category: 'recipes-macros',
    tags: ['calories', 'south indian food', 'idli dosa calories', 'weight loss'],
    macros_highlight: '1 tbsp oil ≈ 120 kcal',
    image_prompt: 'A South Indian breakfast spread on a banana leaf: idlis, a crisp dosa, ven pongal, medu vada, sambar and coconut chutney in small bowls, natural daylight',
  },
  {
    file: '04-high-protein-indian-breakfast-ideas.md',
    slug: 'high-protein-indian-breakfast-ideas',
    title: '15 High-Protein Indian Breakfast Ideas (With Protein Per Serving)',
    seo_title: '15 High-Protein Indian Breakfast Ideas (Veg & Egg)',
    seo_description: '15 easy high-protein Indian breakfasts with 15–25 g protein each: egg bhurji, paneer bhurji, pesarattu, soya upma, oats pongal and more.',
    excerpt: 'Two dosas give you barely 6 g of protein. These 15 Indian breakfasts deliver 15–25 g each, with vegetarian and egg options.',
    category: 'recipes-macros',
    tags: ['breakfast', 'high protein', 'vegetarian protein', 'indian recipes'],
    macros_highlight: '20–30 g protein breakfasts',
    image_prompt: 'A high-protein Indian breakfast plate: egg bhurji, two chapatis, a green gram pesarattu, a bowl of thick curd and sprouted green gram salad, served on a steel plate in morning light',
  },
  {
    file: '05-indian-gym-diet-muscle-gain.md',
    slug: 'indian-gym-diet-muscle-gain',
    title: 'Indian Gym Diet for Muscle Gain: Calories, Protein and a Sample Day',
    seo_title: 'Indian Gym Diet for Muscle Gain: Full Day Meal Plan',
    seo_description: 'Build muscle on Indian food: how to set calories and protein, a sample 2,500 kcal, 130 g protein day, vegetarian options and which supplements matter.',
    excerpt: 'How much to eat, how much protein, and what a muscle-gain day of Indian food actually looks like, without supplements you do not need.',
    category: 'workout-nutrition',
    tags: ['muscle gain', 'gym diet', 'bulking', 'high protein'],
    macros_highlight: '1.6–2.2 g protein per kg',
    image_prompt: 'A generous post-workout Indian meal: grilled chicken breast slices, rice, dal, sprouted green gram salad and curd on a steel plate, with a gym towel and water bottle softly blurred in the background',
  },
  {
    file: '06-indian-weight-loss-meal-plan-7-days.md',
    slug: 'indian-weight-loss-meal-plan-7-days',
    title: '7-Day Indian Weight Loss Meal Plan (Built on South Indian Food)',
    seo_title: '7-Day Indian Weight Loss Meal Plan (South Indian Food)',
    seo_description: 'A realistic 7-day Indian weight loss diet plan with idli, chapati, rice and dal in measured portions. Protein at every meal, no starvation, no fads.',
    excerpt: 'A week of real South Indian food designed for steady fat loss: measured rice and chapati, protein at every meal, and a normal family lunch on Sunday.',
    category: 'metabolic-health',
    tags: ['weight loss', 'diet plan', 'indian diet', 'fat loss'],
    macros_highlight: '300–500 kcal daily deficit',
    image_prompt: 'A balanced South Indian lunch plate for weight loss: a measured cup of rice, dal, vegetable poriyal, cucumber salad, a piece of grilled fish and a small bowl of curd on a steel plate',
  },
  {
    file: '07-how-to-lose-belly-fat-what-works.md',
    slug: 'how-to-lose-belly-fat-what-works',
    title: 'How to Lose Belly Fat: What Actually Works (and 5 Myths to Ignore)',
    seo_title: 'How to Lose Belly Fat: What Works & 5 Myths to Ignore',
    seo_description: 'Crunches do not burn belly fat. Learn what actually reduces belly and visceral fat, why it matters more for Indians, and the waist size to aim for.',
    excerpt: 'Crunches, jeera water and fat burners will not shift belly fat. Here is what the evidence says actually works, and why Indians should watch their waist closely.',
    category: 'metabolic-health',
    tags: ['belly fat', 'visceral fat', 'fat loss', 'waist size'],
    macros_highlight: 'Waist target: <90 cm men, <80 cm women',
    image_prompt: 'A light, high-protein dinner bowl: grilled chicken, broccoli salad, green peas and a small portion of oats, beside a measuring tape on a wooden table, calm evening light',
  },
  {
    file: '08-chicken-eggs-paneer-soya-protein-comparison.md',
    slug: 'chicken-eggs-paneer-soya-protein-comparison',
    title: 'Chicken vs Eggs vs Paneer vs Soya: Which Indian Protein Source Wins?',
    seo_title: 'Chicken vs Eggs vs Paneer vs Soya: Best Protein Source?',
    seo_description: 'Protein, calories and fat per 100 g for chicken, eggs, paneer and soya chunks. Find the best protein source for fat loss, muscle gain or a veg diet.',
    excerpt: 'Soya has the most protein per gram, chicken the most per calorie, paneer the most fat. A side-by-side comparison to choose the right one for your goal.',
    category: 'recipes-macros',
    tags: ['protein sources', 'paneer', 'soya chunks', 'chicken'],
    macros_highlight: 'Soya 52 g • Chicken 31 g per 100 g',
    image_prompt: 'Four protein sources arranged side by side on a slate board: sliced grilled chicken breast, whole brown eggs, a block of fresh paneer and a bowl of dry soya chunks, clean natural light',
  },
  {
    file: '09-meal-prep-vs-meal-subscription-cost.md',
    slug: 'meal-prep-vs-meal-subscription-cost',
    title: 'Meal Prep vs Meal Subscription: The Real Cost of Eating High-Protein',
    seo_title: 'Meal Prep vs Meal Subscription: The Real Cost Compared',
    seo_description: 'Is cooking at home really cheaper than a meal subscription? Compare ingredient cost, 5–7 hours of prep time, waste and skip-day takeout honestly.',
    excerpt: 'Cooking at home looks cheaper until you count the 5–7 hours a week, wasted groceries and the takeout on skipped days. An honest comparison.',
    category: 'kitchen-secrets',
    tags: ['meal prep', 'meal subscription', 'cost comparison', 'busy professionals'],
    macros_highlight: 'Save 5–7 hours a week',
    scene: true,
    image_prompt: 'A busy home kitchen counter with raw chicken, vegetables, chopping board and several empty meal prep containers on one side, and a single ready packed meal box on the other side, warm light',
  },
  {
    file: '10-healthy-food-delivery-near-me-coimbatore.md',
    slug: 'healthy-food-delivery-near-me-coimbatore',
    title: 'Healthy Food Delivery Near You in Coimbatore: Area-by-Area Guide',
    seo_title: 'Healthy Food Delivery Near Me in Coimbatore: Areas & Fees',
    seo_description: 'Where BroTin Box delivers in Coimbatore: free in Kuniyamuthur, Kovaipudhur, Sundarapuram, Ukkadam; ₹35 in RS Puram, Peelamedu, Gandhipuram and more.',
    excerpt: 'Every Coimbatore area we deliver to, with pincodes, delivery fees and timings. Free delivery in 4 areas, ₹35 in 9 more, Monday to Saturday.',
    category: 'kitchen-secrets',
    tags: ['coimbatore', 'delivery areas', 'healthy food near me', 'rs puram'],
    macros_highlight: '13 areas • 7–9 AM & 7–9 PM',
    scene: true,
    image_prompt: 'A delivery rider handing an insulated meal box at a residential gate in a South Indian city neighbourhood in early morning light, coconut trees and low houses in the background, no logos',
  },
];
