-- =============================================================================
-- BroTin Box · 0014 Blog: categories + the six articles that were hardcoded in
-- app/(site)/blog/page.tsx, imported as DRAFTS. Review the author names and
-- credentials, then publish from the admin console › Blog.
-- =============================================================================

insert into public.blog_categories (slug, name, sort_order) values
  ('clinical-nutrition', 'Clinical Nutrition', 0),
  ('kitchen-secrets', 'Kitchen Secrets', 1),
  ('workout-nutrition', 'Workout Nutrition', 2),
  ('recipes-macros', 'Recipes & Macros', 3),
  ('metabolic-health', 'Metabolic Health', 4)
on conflict (slug) do nothing;

insert into public.blog_posts (slug, title, excerpt, content, cover_image_url, category_id, author_name, author_role, read_minutes, macros_highlight, status)
select v.slug, v.title, v.excerpt, v.content, v.cover, c.id, v.author, v.role, v.minutes, v.macros, 'draft' from (values
  ('why-crash-diets-fail', 'Why Crash Diets Fail After 6 Months in Coimbatore: A Pharmacist’s Perspective', 'Diet food fails when you can’t stick to it for 6 months. How boiled broccoli and bland diets trigger metabolic resistance, and why Coimbatore honest food works.', 'As a healthcare professional in Coimbatore, I have consulted hundreds of working professionals, gym-goers, and elders struggling with fatty liver, pre-diabetes, and fitness plateaus. In almost every single case, the root cause was not lack of discipline—it was the unsustainable nature of traditional diet advice.

When you force yourself to eat unseasoned boiled chicken or raw salads in Coimbatore, your brain treats it as an acute starvation signal. Cortisol rises, metabolic rate slows down, and by week four, social cravings overpower willpower.

At BroTin Box, our core clinical thesis is simple: South Indian food is inherently therapeutic when the cooking oil and macronutrients are measured on commercial scales. Hand-pounded shallots, black pepper, moringa leaves, and cold-pressed sesame oil stimulate gastric enzymes without hidden restaurant calories.

By delivering measured country chicken, rasam broth, and foxtail millets hot to your doorstep twice daily (7–9 AM and 7–9 PM), you get the exact grams of protein and calories required to drop visceral fat while eating food that feels like home.', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80', 'clinical-nutrition', 'Dr. Vigneshwaran K.', 'Pharm.D • Founder & Clinical Nutritionist', 4, '80g Protein • Zero Bland Boiled Food'),
  ('how-we-measure-every-gram', 'How We Measure Every Single Gram: Inside Our Kuniyamuthur Central Kitchen', 'We do not guess nutrition. Step inside our commercial prep line where raw ingredients are weighed on calibrated digital scales before cooking.', 'Most restaurant "healthy menus" guess their nutrition. A chef pours two tablespoons of oil instead of one, adding 240 hidden calories that completely erase a morning workout deficit.

In our Kuniyamuthur Central Kitchen, every recipe is programmed into a digital macro matrix. Raw proteins—whether tender country chicken breast, fresh paneer, or sprouted legumes—are weighed on commercial platform scales before cooking.

We also calculate cooking yield shrinkage. 200g of raw chicken yields approximately 150g cooked, but the protein density remains intact. Our nutrition labels show the verified cooked yield macronutrients, not theoretical textbook numbers.

Our team batches fresh meals twice a day: dispatching between 7:00 AM – 9:00 AM for breakfast/morning nutrition, and between 7:00 PM – 9:00 PM for dinner. Fresh, hot, and chemically pure.', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80', 'kitchen-secrets', 'BroTin Box Kitchen Ops', 'Quality & Nutrition Measurement Team', 3, 'Digital Commercial Scales • FSSAI Kitchen'),
  ('morning-vs-dinner-protein-timing', 'Morning (7–9 AM) vs Dinner (7–9 PM) Protein Timing: Science of Twice-Daily Fueling', 'Why skipping morning protein triggers nighttime sugar binging, and how structured morning and dinner delivery optimizes muscle protein synthesis.', 'Muscle Protein Synthesis (MPS) operates on a refractory cycle of 4 to 5 hours. Eating 100g of protein in a single afternoon sitting cannot be fully utilized for muscle hypertrophy—the body oxidizes the excess.

By distributing your high-protein intake into two primary anchors—Morning between 7:00 AM and 9:00 AM, and Dinner between 7:00 PM and 9:00 PM—you stimulate two distinct anabolic peaks throughout the day.

A morning high-protein meal stabilizes peptide YY and ghrelin, preventing the mid-day blood sugar spikes that make Coimbatore office workers sluggish after lunch.

In the evening, a dinner rich in clean protein and low glycemic index carbs supplies amino acids for overnight deep-phase tissue recovery without overloading visceral adipose stores.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', 'workout-nutrition', 'Dr. Vigneshwaran K.', 'Pharm.D • Clinical Nutrition Specialist', 5, '35g Morning • 45g Dinner MPS Curve'),
  ('kongu-flavours-high-protein', 'Kongu Home-Style Flavours Meets High-Protein: Rasam, Millets & Country Chicken', 'Zero bland food. Explore how local herbs, crushed black pepper, cold-pressed sesame oil, and moringa leaves elevate macro-counted meals.', 'Kongu Nadu cuisine has always been functional nutrition. Our ancestors ate ragi kali, kambu koozh, and country chicken rasam not as a diet trend, but as physical fuel for active days.

Black pepper contains piperine, an alkaloid that enhances the bioavailability of curcumin and trace minerals by up to 2000%. When paired with turmeric-marinated chicken, digestion is seamless.

Moringa leaves harvested fresh in Pollachi provide plant-based bioavailable iron, magnesium, and natural polyphenols that combat workout inflammation.

We never use artificial food colouring, palm oil, or MSG. You get pure South Indian comfort with clinical accuracy on every label.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', 'recipes-macros', 'Chef Senthil & Nutrition Team', 'Traditional Kongu Culinary Specialist', 4, 'Cold-Pressed Oils • Moringa & Millets'),
  ('managing-fatty-liver-diabetes', 'Managing Fatty Liver & Pre-Diabetes with Measured Glycemic Load in Coimbatore', 'How shifting from polished white rice to portion-calibrated millets and measured protein can reverse insulin resistance in 60 days.', 'In Tamil Nadu, non-alcoholic fatty liver disease (NAFLD) and insulin resistance often occur in lean individuals. This "thin-outside-fat-inside" phenotype is driven by ultra-refined carbohydrates and unregulated cooking fats.

Standard Coimbatore meals often deliver 70% carbohydrates from polished white rice and maida parottas, spiking postprandial insulin for hours.

By capping dinner carbohydrates to 40g of complex fiber-rich millets and elevating clean protein to 40g+, liver glycogen stores empty overnight, prompting the liver to burn intrahepatic triglycerides.

Dozens of our monthly subscribers report normal HbA1c levels and reduced SGOT/SGPT liver enzyme markers within 8 to 12 weeks of our calibrated meal subscription.', 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80', 'metabolic-health', 'Dr. Vigneshwaran K.', 'Pharm.D • Founder & Clinical Nutritionist', 6, 'Low Glycemic Index • Controlled Insulin Peaks'),
  ('vegetarian-protein-guide', 'Vegetarian High-Protein Guide: Hitting 45g+ Protein Daily Without Whey Overload', 'How pure vegetarians in Coimbatore can achieve genuine muscle tone using paneer, sprouted legumes, edamame, and Greek curd combinations.', 'Many vegetarians believe it is impossible to build muscle or drop fat on an Indian vegetarian diet without drinking multiple whey protein shakes. This is a myth.

The secret lies in combining complementary amino acid profiles: pairing dairy proteins (fresh malai paneer and hung curd) with legume proteins (sprouted green gram, horsegram, and edamame).

Our Pure Veg Daily Boxes deliver ~45g of complete protein per meal by incorporating marinated cottage cheese cubes, seasoned chickpea stir-fries, and high-protein millet bowls.

You get all 9 essential amino acids in every single box, measured gram-by-gram with zero artificial fillers.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', 'recipes-macros', 'Clinical Nutrition Desk', 'Plant & Dairy Nutrition Team', 4, 'Pure Veg (~45g Protein) • FSSAI Approved')
) v(slug, title, excerpt, content, cover, cat, author, role, minutes, macros)
join public.blog_categories c on c.slug = v.cat
on conflict (slug) do nothing;
