'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Sliders,
  Dumbbell,
  Scale,
  CheckCircle2,
  ArrowRight,
  Flame,
  Wheat,
  Clock,
  ShieldCheck,
  Phone,
  User,
  Mail,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomBoxComingSoonPage() {
  // Teaser UI state
  const [targetProtein, setTargetProtein] = useState<number>(55);
  const [targetCarbs, setTargetCarbs] = useState<number>(45);
  const [selectedProteinSource, setSelectedProteinSource] = useState<'chicken' | 'fish' | 'paneer' | 'tofu'>('chicken');

  // Waitlist form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState<'fat-loss' | 'muscle-gain' | 'maintenance'>('muscle-gain');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Dynamic calculated grams preview
  const estimatedMeatGrams = Math.round((targetProtein * 0.7) * 4.5);
  const estimatedCalories = Math.round((targetProtein * 4) + (targetCarbs * 4) + 135);

  const handleSubmitWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-paper text-ink pb-32">
      {/* 1. Header */}
      <section className="bg-gradient-to-b from-accent-soft via-sand to-paper pt-10 pb-12 border-b border-ink/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-ink text-white text-xs font-bold tracking-wide mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-accent-soft" />
            <span>Coming Soon • Beta Feature</span>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-ink tracking-tight leading-[1.1]">
            Build Your Own Box. <br />
            <span className="text-accent">Dial Your Exact Grams.</span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-ink/80 font-medium max-w-2xl mx-auto mt-4 leading-relaxed">
            In addition to our rotating kitchen menus, our digital kitchen will soon allow you to dial custom protein grams, select your favourite meats, and customize every single compartment.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-500">
            <span>• Exact Digital Scale Weighing</span>
            <span>• Custom Macros</span>
            <span>• 0 Compromise</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Teaser UI & Waitlist Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Mockup Builder */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-accent">Interactive Simulator</span>
                <h3 className="font-heading font-black text-xl text-ink mt-0.5">
                  Future Custom Box Dialer
                </h3>
              </div>
              <span className="text-xs font-bold bg-accent-soft text-ink px-3 py-1 rounded-full">
                Interactive Preview
              </span>
            </div>

            {/* Protein Target Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-accent" />
                  <span>Target Protein per Box:</span>
                </span>
                <span className="font-heading font-black text-lg text-ink font-mono">
                  {targetProtein}g
                </span>
              </div>
              <input
                type="range"
                min="35"
                max="85"
                step="5"
                value={targetProtein}
                onChange={(e) => setTargetProtein(Number(e.target.value))}
                className="w-full accent-ink cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>35g (Moderate)</span>
                <span>60g (Athlete)</span>
                <span>85g (Pro Bodybuilder)</span>
              </div>
            </div>

            {/* Carbohydrates Target Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Wheat className="w-4 h-4 text-accent" />
                  <span>Target Carbohydrates:</span>
                </span>
                <span className="font-heading font-black text-lg text-ink font-mono">
                  {targetCarbs}g
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                step="5"
                value={targetCarbs}
                onChange={(e) => setTargetCarbs(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>20g (Keto / Low-Carb)</span>
                <span>50g (Balanced)</span>
                <span>80g (High-Glycogen)</span>
              </div>
            </div>

            {/* Protein Source Selector */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-gray-700 block">
                Primary Protein Base (Kitchen Scales)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'chicken', label: 'Chicken Breast' },
                  { id: 'fish', label: 'Coastal Fish' },
                  { id: 'paneer', label: 'Fresh Paneer' },
                  { id: 'tofu', label: 'Organic Tofu' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedProteinSource(item.id as any)}
                    className={cn(
                      "p-2.5 rounded-xl border text-center font-bold transition-all tap-active text-xs",
                      selectedProteinSource === item.id
                        ? "bg-ink text-white border-ink shadow-xs"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Scale Readout */}
            <div className="p-4 rounded-2xl bg-sand border border-ink/15 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Simulated Kitchen Portion</span>
                <span className="font-heading font-black text-base text-ink mt-0.5 block">
                  ~{estimatedMeatGrams}g Cooked Base
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Estimated Calories</span>
                <span className="font-heading font-black text-base text-accent mt-0.5 block">
                  ~{estimatedCalories} kcal
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Phone Waitlist Form */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-xl shadow-ink/5 space-y-6">
            {!isSubmitted ? (
              <form onSubmit={handleSubmitWaitlist} className="space-y-4">
                <div className="pb-3 border-b border-gray-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Priority Coimbatore Beta</span>
                  <h3 className="font-heading font-black text-2xl text-ink mt-1">
                    Get Early Access
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Be the first to access custom gram scaling when we roll out in Coimbatore.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Your Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>WhatsApp / Mobile Number *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98421 23456"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-gray-400" />
                    <span>Current Primary Fitness Goal</span>
                  </label>
                  <select
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ink bg-white"
                  >
                    <option value="fat-loss">Fat Loss / Shredding (High Protein, Calorie Deficit)</option>
                    <option value="muscle-gain">Muscle Hypertrophy / Bulking (High Protein + Carbs)</option>
                    <option value="maintenance">Lean Athletic Maintenance / Clean Energy</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-ink hover:bg-ink-soft text-white py-3.5 px-6 rounded-2xl font-heading font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-ink/25 flex items-center justify-center gap-2 tap-active transition-all group mt-2"
                >
                  <span>Join Priority Waitlist</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <p className="text-[11px] text-gray-400 text-center">
                  Zero spam. We will notify you directly via WhatsApp when custom builder invites open.
                </p>
              </form>
            ) : (
              <div className="py-8 text-center space-y-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-heading font-black text-2xl text-ink">
                  You&apos;re on the VIP Waitlist!
                </h3>
                <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                  Thank you, <strong>{name || 'Athlete'}</strong>! You are #{Math.floor(Math.random() * 50) + 120} on our Coimbatore invite list. We will send you an exclusive invite code on {phone}.
                </p>
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <Link
                    href="/tomorrow"
                    className="w-full bg-ink text-white py-3 px-4 rounded-xl text-xs font-bold text-center tap-active"
                  >
                    Explore Tomorrow’s Rotating Box &rarr;
                  </Link>
                  <Link
                    href="/weekly"
                    className="w-full bg-sand text-ink py-2.5 px-4 rounded-xl text-xs font-bold text-center tap-active"
                  >
                    View Weekly 6-Day Routine
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
