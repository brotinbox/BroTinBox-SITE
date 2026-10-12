export interface NutrientPillar {
  id: string;
  name: string;
  focus: string;
  clinicalAngle: string;
}

export interface PlacePillar {
  id: string;
  name: string;
  type: 'local' | 'regional';
  description: string;
  searchIntentNote: string;
}

export interface ConceptPillar {
  id: string;
  name: string;
  categorySlug: 'clinical-nutrition' | 'kitchen-secrets' | 'workout-nutrition' | 'recipes-macros' | 'metabolic-health';
  persona: string;
  painPoint: string;
}

export interface TimingPillar {
  id: string;
  name: string;
  timeSlot: string;
  physiologicalMechanism: string;
}

export interface FreeFromPillar {
  id: string;
  name: string;
  searchKeyword: string;
  clinicalGuarantee: string;
}

export const FREE_FROM_PILLARS: FreeFromPillar[] = [
  {
    id: 'gluten-free',
    name: '100% Gluten-Free Millets & Grains',
    searchKeyword: 'gluten-free meal delivery coimbatore',
    clinicalGuarantee: 'Zero wheat or maida. Clean foxtail (thinai), kodo (varagu), and barnyard (kuthiraivali) for zero gut inflammation'
  },
  {
    id: 'refined-sugar-free',
    name: 'Zero Refined Sugar & Low Glycemic Load',
    searchKeyword: 'sugar-free diet food coimbatore diabetic',
    clinicalGuarantee: 'Zero hidden white sugar, zero high-fructose syrups, and zero maltodextrin to stabilize fasting glucose'
  },
  {
    id: 'palm-oil-free',
    name: '100% Palm-Oil-Free & Zero Trans-Fat',
    searchKeyword: 'palm oil free healthy food coimbatore',
    clinicalGuarantee: 'Strictly 5–7ml measured cold-pressed gingelly and groundnut oils per box, preserving hepatic and arterial health'
  },
  {
    id: 'preservative-free',
    name: 'Zero Preservatives & Chemical-Free',
    searchKeyword: 'preservative-free fresh meal subscription',
    clinicalGuarantee: 'Cooked fresh twice daily, never pre-packed with sodium benzoate, zero MSG/Ajinomoto, and zero synthetic food coloring'
  },
  {
    id: 'maida-free',
    name: '100% Maida-Free Whole Nutrition',
    searchKeyword: 'maida-free diet delivery rs puram',
    clinicalGuarantee: 'Zero bleached refined wheat flours preventing postprandial insulin resistance and visceral adiposity'
  },
  {
    id: 'dairy-free-options',
    name: 'Dairy-Free & Clean Protein Alternatives',
    searchKeyword: 'dairy-free high protein food coimbatore',
    clinicalGuarantee: 'Plant-powered sprouted lentils, edamame, and country poultry options for lactose-intolerant athletes'
  }
];

export const NUTRIENT_PILLARS: NutrientPillar[] = [
  {
    id: 'protein-density',
    name: 'High Protein & Amino Acid Profiling',
    focus: '35g–45g bioavailable protein per meal from tender country chicken, paneer, and sprouted legumes',
    clinicalAngle: 'Preventing muscle catabolism and leucine trigger activation without synthetic powders'
  },
  {
    id: 'kcal-precision',
    name: 'Calorie Measurement & Oil Control',
    focus: 'Commercial digital scale portioning, eliminating the hidden 250 kcal excess restaurant oil problem',
    clinicalAngle: 'Thermodynamics of accurate energy balance and metabolic adaptation prevention'
  },
  {
    id: 'complex-carbs-millets',
    name: 'Low Glycemic Index Millets & Fibres',
    focus: 'Kuthiraivali (Barnyard), Varagu (Kodo), Thinai (Foxtail), and Ragi replacing polished white rice',
    clinicalAngle: 'Slowing glucose absorption, flattening postprandial insulin curves, and sustaining gut microbiota'
  },
  {
    id: 'healthy-fats-cold-pressed',
    name: 'Cold-Pressed Kongu Oils vs Commercial Palm Oil',
    focus: 'Cold-pressed gingelly (sesame) and groundnut oils measured strictly to 5–7ml per box',
    clinicalAngle: 'Zero trans-fats, low Omega-6 to Omega-3 inflammatory ratio, lipid profile protection'
  },
  {
    id: 'raw-vs-cooked-shrinkage',
    name: 'Raw vs Cooked Yield Truth',
    focus: 'Accounting for 25% cooking moisture loss in meats to guarantee true delivered macro totals',
    clinicalAngle: 'Why restaurant nutrition menus underdeliver by 30% protein when using raw weights'
  },
  {
    id: 'anti-inflammatory-spices',
    name: 'Kongu Functional Spices & Moringa',
    focus: 'Hand-pounded black pepper, shallots, turmeric curcumin, and Pollachi fresh moringa leaves',
    clinicalAngle: 'Piperine enhancement of micronutrient uptake and lowering systemic CRP markers'
  }
];

export const PLACE_PILLARS: PlacePillar[] = [
  // Local Coimbatore Delivery Zones
  {
    id: 'kuniyamuthur',
    name: 'Kuniyamuthur',
    type: 'local',
    description: 'Our central commercial kitchen base and hub for fresh, calibrated dispatches',
    searchIntentNote: 'Highlights fastest delivery freshness, direct kitchen pickup options, and South Coimbatore'
  },
  {
    id: 'rs-puram',
    name: 'RS Puram',
    type: 'local',
    description: 'Bustling commercial and residential heart with active fitness clubs and clinics',
    searchIntentNote: 'Affluent families, gym enthusiasts, and business owners needing hassle-free clean food'
  },
  {
    id: 'saravanampatti',
    name: 'Saravanampatti',
    type: 'local',
    description: 'Major IT and engineering corridor with high-stress desk workers and tech parks',
    searchIntentNote: 'Tech workers fighting afternoon lethargy and late-night junk cravings'
  },
  {
    id: 'kovaipudhur',
    name: 'Kovaipudhur',
    type: 'local',
    description: 'Peaceful township nestled near the Western Ghats with active elders and fitness walkers',
    searchIntentNote: 'Health-conscious seniors, retirees, and families managing BP and blood sugar'
  },
  {
    id: 'race-course',
    name: 'Race Course',
    type: 'local',
    description: 'Iconic morning jogging hub and premium lifestyle zone',
    searchIntentNote: 'Marathon runners, high-profile corporate leaders, and morning walkers'
  },
  {
    id: 'peelamedu',
    name: 'Peelamedu',
    type: 'local',
    description: 'Educational and medical hub with hospitals, colleges, and busy doctors',
    searchIntentNote: 'Medical residents, doctors, and students needing brain fuel without cooking'
  },
  {
    id: 'gandhipuram',
    name: 'Gandhipuram',
    type: 'local',
    description: 'Central transit and commercial retail hub with fast-paced working professionals',
    searchIntentNote: 'Entrepreneurs and retail store owners who skip breakfast due to morning commute'
  },
  {
    id: 'saibaba-colony',
    name: 'Saibaba Colony',
    type: 'local',
    description: 'Quiet residential neighborhood with active yoga practitioners and vegetarian households',
    searchIntentNote: 'Pure vegetarians seeking clean paneer, legume, and millet meal solutions'
  },
  // Outer Regional District Hubs (Broad Search Intent & Enquiry Conversions)
  {
    id: 'tirupur',
    name: 'Tirupur',
    type: 'regional',
    description: 'Textile export capital 45 mins from Coimbatore with high-pressure industrialists',
    searchIntentNote: 'Factory owners and exporters inquiring about daily meal boxes and lifestyle shifts'
  },
  {
    id: 'erode',
    name: 'Erode',
    type: 'regional',
    description: 'Turmeric city and industrial hub with strong agricultural and textile business families',
    searchIntentNote: 'Entrepreneurs looking for structured metabolic diet subscriptions and consulting'
  },
  {
    id: 'salem',
    name: 'Salem',
    type: 'regional',
    description: 'Steel and mango city with growing fitness culture and specialty hospitals',
    searchIntentNote: 'Healthcare professionals and fitness lifters seeking macro-counted South Indian meal plans'
  },
  {
    id: 'pollachi',
    name: 'Pollachi',
    type: 'regional',
    description: 'Agricultural heartland near the foothills, source of fresh coconut and moringa',
    searchIntentNote: 'Active farmers, estate managers, and eco-conscious residents wanting natural nutrition'
  },
  {
    id: 'palakkad',
    name: 'Palakkad',
    type: 'regional',
    description: 'Border gateway across the Palakkad Gap connecting Kerala and Coimbatore',
    searchIntentNote: 'Commuters and fitness enthusiasts seeking high-protein South Indian options'
  }
];

export const CONCEPT_PILLARS: ConceptPillar[] = [
  {
    id: 'fat-loss-recomp',
    name: 'Sustainable Fat Loss & Body Recomposition',
    categorySlug: 'metabolic-health',
    persona: 'Adults with visceral belly fat who failed on extreme salads and boiled food',
    painPoint: 'Rebound weight gain and metabolic slowdown from extreme crash dieting'
  },
  {
    id: 'gym-hypertrophy',
    name: 'Gym Strength & Hypertrophy Fueling',
    categorySlug: 'workout-nutrition',
    persona: 'Serious strength trainees, weightlifters, and bodybuilders',
    painPoint: 'Struggling to hit 140g+ daily protein solely on whey shakes and dry chicken breast'
  },
  {
    id: 'desk-worker-fatigue',
    name: 'Corporate Desk Worker Lethargy & Shift Exhaustion',
    categorySlug: 'metabolic-health',
    persona: 'IT analysts, developers, and corporate executives sitting 9+ hours daily',
    painPoint: '3 PM brain fog, 4 PM tea-biscuit blood sugar spikes, and late night dinners'
  },
  {
    id: 'running-endurance',
    name: 'Marathon Runners, Sprinters & Track Athletes',
    categorySlug: 'workout-nutrition',
    persona: 'Runners training at Nehru Stadium or Race Course loops',
    painPoint: 'Depleted glycogen stores, chronic shin splints, and poor post-run recovery'
  },
  {
    id: 'racquet-sports',
    name: 'Badminton & Tennis Agility Nutrition',
    categorySlug: 'workout-nutrition',
    persona: 'Competitive club players and weekend badminton league participants',
    painPoint: 'Cramping in the 3rd set, joint inflammation, and delayed reaction time'
  },
  {
    id: 'yoga-mindful',
    name: 'Yoga, Mobility & Sattvic High-Protein',
    categorySlug: 'recipes-macros',
    persona: 'Ashtanga, Hatha, and Vinyasa yoga practitioners',
    painPoint: 'Heavy digestive load from greasy foods ruining morning breathwork and flexibility'
  },
  {
    id: 'fatty-liver-nafld',
    name: 'Reversing NAFLD & Elevated Liver Enzymes',
    categorySlug: 'clinical-nutrition',
    persona: 'Individuals diagnosed with Grade 1 or 2 Fatty Liver during health checkups',
    painPoint: 'Doctor advised diet change but gave vague advice; need exact measured portions'
  },
  {
    id: 'prediabetes-hba1c',
    name: 'Managing Pre-Diabetes & High HbA1c',
    categorySlug: 'clinical-nutrition',
    persona: 'People with HbA1c between 5.7% and 6.4% wanting to avoid prescription medicines',
    painPoint: 'White rice and refined tiffin spiking fasting blood sugar above 110 mg/dL'
  },
  {
    id: 'pcos-hormonal',
    name: 'PCOS Insulin Resistance & Weight Management',
    categorySlug: 'clinical-nutrition',
    persona: 'Women facing irregular cycles, water retention, and persistent abdominal weight',
    painPoint: 'Severe sugar cravings, androgen surges, and difficulty losing weight'
  },
  {
    id: 'veg-protein-mastery',
    name: 'Pure Vegetarian 45g+ Protein Protocol',
    categorySlug: 'recipes-macros',
    persona: 'Strict vegetarians who refuse eggs/meat and want lean muscular physique',
    painPoint: 'Relying exclusively on dals which are 70% carbs and only 20% protein'
  }
];

export const TIMING_PILLARS: TimingPillar[] = [
  {
    id: 'morning-breakfast',
    name: 'Morning Power Fuel (7:00 AM – 9:00 AM Dispatch)',
    timeSlot: '7:00 AM – 9:00 AM',
    physiologicalMechanism: 'Stimulating morning peptide YY to shut down ghrelin and fuel early physical demands'
  },
  {
    id: 'evening-dinner',
    name: 'Evening Tissue Recovery (7:00 PM – 9:00 PM Dispatch)',
    timeSlot: '7:00 PM – 9:00 PM',
    physiologicalMechanism: 'Low-glycemic slow-digesting amino acids preventing night-time liver glycogen dumping'
  },
  {
    id: 'twice-daily-rhythm',
    name: 'The 2-Meal Anchor System (Morning + Dinner)',
    timeSlot: 'Morning (7–9 AM) & Dinner (7–9 PM)',
    physiologicalMechanism: 'Two distinct Muscle Protein Synthesis peaks (MPS) 10 hours apart for optimal nitrogen retention'
  }
];
