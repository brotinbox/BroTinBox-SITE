'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowRight,
  Calendar,
  Clock,
  Sparkles,
  Dumbbell,
  Zap,
  HeartHandshake,
  X,
  Check,
  Bell,
  Scale,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type TabType = 'plans' | 'people';

interface CardItem {
  id: string;
  number: string;
  verticalTitle: string;
  title: string;
  tag: string;
  description: string;
  priceNote: string;
  bgColor: string;
  accentColor: string;
  image: string;
  icon: React.ElementType;
  isComingSoon?: boolean;
  recommendedBoxes?: {
    name: string;
    day: string;
    protein: string;
    calories: string;
    description: string;
    slug: string;
    image: string;
    price: number;
  }[];
}

const PLANS_DATA: CardItem[] = [
  {
    id: 'per-day',
    number: '01',
    verticalTitle: 'PER DAY',
    title: 'Per Day Trial',
    tag: 'SINGLE BOX',
    description:
      'Try a single box today. Hot homestyle lunch cooked fresh this morning and delivered to your desk or home before 1 PM.',
    priceNote: 'Starting at ₹269 • No commitment',
    bgColor: 'bg-[#182338]', // Deep Navy
    accentColor: 'text-sky-300',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    icon: Clock,
    recommendedBoxes: [
      {
        name: 'Power Chicken Box',
        day: 'Mon',
        protein: '60g',
        calories: '695 kcal',
        description: 'Kongu black pepper spiced country chicken, soft whole wheat chapatis & brown channa sundal.',
        slug: 'power-chicken-box',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        price: 299,
      },
      {
        name: 'Paneer Balance Box',
        day: 'Tue',
        protein: '42g',
        calories: '685 kcal',
        description: 'Fresh farm paneer bhurji with turmeric and ginger, mineral-rich ragi dosas & channa.',
        slug: 'paneer-balance-box',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
        price: 269,
      },
    ],
  },
  {
    id: 'per-week',
    number: '02',
    verticalTitle: 'PER WEEK',
    title: 'Per Week Routine',
    tag: '6 DAYS • MON TO SAT',
    description:
      'Our most popular routine. 6 different protein meals from Monday to Saturday. Never repeat dishes, skip any day with one tap.',
    priceNote: '₹1,532 / week • Free Delivery',
    bgColor: 'bg-[#3A1A0D]', // Forest Green
    accentColor: 'text-emerald-300',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    icon: Calendar,
    recommendedBoxes: [
      {
        name: '6-Day Balanced Rotation',
        day: 'Mon–Sat',
        protein: '42g–60g / day',
        calories: '680–720 kcal',
        description: 'Chicken, Fish, Paneer & Soya rotation. Weighed portions with zero kitchen waste.',
        slug: 'power-chicken-box',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
        price: 1532,
      },
    ],
  },
  {
    id: 'per-month',
    number: '03',
    verticalTitle: 'PER MONTH',
    title: 'Per Month Lifestyle',
    tag: '26 DAYS • FULL COMMITMENT',
    description:
      '24 daily lunch deliveries for serious body transformations. Priority kitchen batch, free protein add-ons & nutritionist support.',
    priceNote: '₹5,899 / month • Best Value',
    bgColor: 'bg-[#2E1A33]', // Deep Plum
    accentColor: 'text-fuchsia-300',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    icon: Sparkles,
    recommendedBoxes: [
      {
        name: '26-Day Transformation Plan',
        day: '4 Weeks',
        protein: '50g+ Daily Avg',
        calories: 'Clean Macros',
        description: 'Complete month of weighed nutrition. Pause or reschedule anytime without losing money.',
        slug: 'lean-fish-box',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        price: 5899,
      },
    ],
  },
];

const PEOPLE_DATA: CardItem[] = [
  {
    id: 'fitness',
    number: '01',
    verticalTitle: 'FITNESS',
    title: 'Fitness & Fat Loss',
    tag: 'LEAN MUSCLE • 40G–45G PROTEIN',
    description:
      'For gym-goers, active professionals, and anyone aiming for sustainable fat loss. High fiber, controlled complex carbs & pure protein.',
    priceNote: '~650 kcal • Clean Fiber & Greens',
    bgColor: 'bg-[#182338]', // Deep Navy
    accentColor: 'text-sky-300',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    icon: Dumbbell,
    recommendedBoxes: [
      {
        name: 'Paneer Balance Box',
        day: 'Tuesday',
        protein: '42g',
        calories: '685 kcal',
        description: 'Fresh farm paneer bhurji with turmeric and ginger, mineral-rich ragi dosas & channa.',
        slug: 'paneer-balance-box',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
        price: 269,
      },
      {
        name: 'Lean Fish Box',
        day: 'Wednesday',
        protein: '56g',
        calories: '695 kcal',
        description: 'Pan-seared tawa masala sea fish fillet, steamed brown rice & live sprout salad.',
        slug: 'lean-fish-box',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        price: 279,
      },
      {
        name: 'Paneer Tikka Box',
        day: 'Saturday',
        protein: '43g',
        calories: '725 kcal',
        description: 'Char-grilled tandoori spiced paneer cubes with nutritious foxtail millet rice.',
        slug: 'paneer-tikka-box',
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80',
        price: 269,
      },
    ],
  },
  {
    id: 'athletes',
    number: '02',
    verticalTitle: 'ATHLETES',
    title: 'Athletes & Heavy Lifters',
    tag: 'MAX RECOVERY • 60G–75G+ PROTEIN',
    description:
      'Heavy strength training, crossfit, or sports conditioning. Double chicken cuts, boiled farm eggs, and clean carbs for intense muscle recovery.',
    priceNote: '~720 kcal • 60g+ High Protein',
    bgColor: 'bg-[#3A1A0D]', // Forest Green
    accentColor: 'text-emerald-300',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    icon: Zap,
    recommendedBoxes: [
      {
        name: 'Power Chicken Box',
        day: 'Monday',
        protein: '60g',
        calories: '695 kcal',
        description: 'Kongu black pepper spiced country chicken with 2 boiled farm eggs and chapatis.',
        slug: 'power-chicken-box',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        price: 299,
      },
      {
        name: 'Tikka Chicken Box',
        day: 'Thursday',
        protein: '63g',
        calories: '720 kcal',
        description: 'Smokey clay-baked chicken breast tikka, whole wheat phulkas & roasted peanut salad.',
        slug: 'tikka-chicken-box',
        image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80',
        price: 299,
      },
    ],
  },
  {
    id: 'elderly',
    number: '03',
    verticalTitle: 'ELDERLY',
    title: 'Elderly & Gentle Digestion',
    tag: 'COMING SOON',
    description:
      'Specially calibrated for parents and seniors. Low sodium, soft traditional millets, steamed greens, and easily digestible plant proteins.',
    priceNote: 'Coming Soon • Launching in Coimbatore',
    bgColor: 'bg-[#1C1F26]', // Warm Slate / Charcoal
    accentColor: 'text-amber-300',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    icon: HeartHandshake,
    isComingSoon: true,
  },
];

export function InteractivePillarsSection() {
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);

  const currentCards = activeTab === 'plans' ? PLANS_DATA : PEOPLE_DATA;

  const handleCardClick = (card: CardItem) => {
    setSelectedCard(card);
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    setWaitlistDone(true);
  };

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-paper text-gray-900 border-b border-gray-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header & One-Word Switcher at Top */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-[11px] font-black uppercase tracking-widest text-primary/80 mb-3 bg-primary/10 px-3.5 py-1 rounded-full">
            Choose Your Fit
          </span>

          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-gray-950 tracking-tight">
            How would you like your food?
          </h2>

          <p className="text-sm sm:text-base text-gray-600 mt-2.5 leading-relaxed">
            Choose by time duration or pick by who you are. Simple meals with zero confusing jargon.
          </p>

          {/* 1-Word Switcher Pill at Top */}
          <div className="mt-7 inline-flex items-center p-1.5 bg-gray-200/80 rounded-full border border-gray-300/80 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`px-7 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'plans'
                  ? 'bg-gray-950 text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              PLANS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('people')}
              className={`px-7 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'people'
                  ? 'bg-gray-950 text-white shadow-md scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              PEOPLE
            </button>
          </div>
        </div>

        {/* 3 Tall Cards with Rising Scroll Transition matching Reference */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7"
        >
          {currentCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                onClick={() => handleCardClick(card)}
                className={`group relative rounded-[32px] overflow-hidden ${card.bgColor} text-white flex flex-col justify-between p-7 sm:p-8 min-h-[540px] lg:h-[600px] shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border border-white/10`}
              >
                {/* Top Row: Icon + Number Tag */}
                <div className="flex items-center justify-between z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-white/50 uppercase">
                    {card.number}
                  </span>
                </div>

                {/* Giant Vertical Typography running along the edge */}
                <div className="my-auto py-8 flex items-center justify-end overflow-hidden pointer-events-none">
                  <span
                    className="font-heading font-black text-3xl sm:text-4xl lg:text-[42px] tracking-tight text-white/75 group-hover:text-white uppercase select-none transition-colors"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    {card.verticalTitle}
                  </span>
                </div>

                {/* Bottom Content Area */}
                <div className="z-10 mt-auto space-y-3.5">
                  {/* Tag Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/10 border border-white/15 ${card.accentColor}`}
                    >
                      {card.tag}
                    </span>
                    {card.isComingSoon && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-400 text-gray-950 shadow-xs animate-pulse">
                        SOON
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-heading font-black text-xl text-white tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/80 mt-1 leading-relaxed line-clamp-3">
                      {card.description}
                    </p>
                  </div>

                  {/* Price / Note */}
                  <div className="text-[11px] font-bold text-white/60">
                    {card.priceNote}
                  </div>

                  {/* Bottom Image Slice with smooth zoom on hover */}
                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden mt-3 shadow-md border border-white/15">
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Bottom Action Icon button */}
                    <div className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-md group-hover:bg-primary group-hover:text-white transition-colors">
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Recommended Foods Modal / Drawer when clicking any Card */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-paper">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${selectedCard.bgColor} text-white flex items-center justify-center`}>
                    <selectedCard.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                      {selectedCard.tag}
                    </span>
                    <h3 className="font-heading font-black text-xl text-gray-950">
                      {selectedCard.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="w-9 h-9 rounded-full bg-gray-200/70 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedCard.description}
                </p>

                {/* If Elderly (Coming Soon) */}
                {selectedCard.isComingSoon ? (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-heading font-black text-lg text-amber-950">
                        Senior & Elderly Meals are Launching Soon!
                      </h4>
                      <p className="text-xs text-amber-800 max-w-md mx-auto mt-1">
                        We are working with nutritionists in Coimbatore to calibrate low-sodium, easily digestible soft millet meals. Leave your phone/email to get notified first.
                      </p>
                    </div>

                    {!waitlistDone ? (
                      <form onSubmit={handleWaitlistSubmit} className="max-w-md mx-auto flex gap-2">
                        <input
                          type="text"
                          required
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          placeholder="Enter your phone or email"
                          className="flex-1 text-xs px-4 py-2.5 rounded-xl border border-amber-300 bg-white focus:outline-none text-gray-900"
                        />
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all"
                        >
                          Notify Me
                        </button>
                      </form>
                    ) : (
                      <div className="p-3 bg-white rounded-xl text-xs font-bold text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>Thank you! We will notify you when senior meals go live.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-primary" />
                      <span>Recommended Food Boxes</span>
                    </h4>

                    <div className="space-y-3">
                      {selectedCard.recommendedBoxes?.map((box, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-gray-200 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                              <Image
                                src={box.image}
                                alt={box.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary text-[10px] font-black uppercase px-2 py-0.5 rounded">
                                  {box.day}
                                </span>
                                <h5 className="font-heading font-black text-sm text-gray-950">
                                  {box.name}
                                </h5>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {box.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold">
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  {box.protein} protein
                                </span>
                                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                  {box.calories}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                            <span className="font-heading font-black text-base text-gray-950">
                              {formatCurrency(box.price)}
                            </span>
                            <Link
                              href={`/box/${box.slug}`}
                              onClick={() => setSelectedCard(null)}
                              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1"
                            >
                              <span>View Box</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-paper flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  {selectedCard.priceNote}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCard(null)}
                    className="py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Close
                  </button>
                  {!selectedCard.isComingSoon && (
                    <Link
                      href="/build-plan"
                      onClick={() => setSelectedCard(null)}
                      className="bg-cta hover:bg-cta-hover text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>Build My Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
