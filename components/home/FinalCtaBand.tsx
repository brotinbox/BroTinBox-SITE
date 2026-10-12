'use client';

import React, { useState } from 'react';
import { BRAND } from '@/config/brand';
import {
  Sparkles,
  Send,
  CheckCircle2,
  MessageCircle,
  Clock,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Loader2,
  UtensilsCrossed,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COIMBATORE_AREAS = [
  'Kuniyamuthur (Central Kitchen Hub)',
  'RS Puram',
  'Peelamedu',
  'Gandhipuram',
  'Kovaipudhur',
  'Ukkadam',
  'Saibaba Colony',
  'Race Course',
  'Ramanathapuram',
  'Singanallur',
  'Saravanampatti',
  'Vadavalli',
  'Ganapathy',
  'Other Coimbatore Area',
];

const PLANS = [
  { id: 'Daily Trial', short: '1-Day Trial', label: '1-Day Trial Box' },
  { id: '6-Day Weekly', short: '6-Day Weekly', label: '6-Day Routine' },
  { id: '24-Day Monthly', short: '24-Day Month', label: '24-Day Monthly' },
];

const DELIVERY_WINDOWS = [
  { id: 'Morning (7–9 AM)', short: 'Morning', time: '7:00 – 9:00 AM', icon: '🌅' },
  { id: 'Dinner (7–9 PM)', short: 'Dinner', time: '7:00 – 9:00 PM', icon: '🌙' },
  { id: 'Both Morning & Dinner', short: 'Both Slots', time: '7–9 AM & PM', icon: '🍽️' },
];

export function FinalCtaBand() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState(COIMBATORE_AREAS[0]);
  const [diet, setDiet] = useState<'non-veg' | 'veg' | 'mixed'>('non-veg');
  const [mealPlan, setMealPlan] = useState('24-Day Monthly');
  const [preferredSlot, setPreferredSlot] = useState('Both Morning & Dinner');
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          area,
          diet: diet === 'non-veg' ? 'Non-Veg (~80g Protein)' : diet === 'veg' ? 'Pure Veg (~45g Protein)' : 'Mixed Menu',
          mealPlan,
          preferredSlot,
          note: note.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit enquiry.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const directWhatsAppUrl = `https://wa.me/${BRAND.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `Hi BroTin Box! I submitted an enquiry for a ${diet.toUpperCase()} plan in ${area}. Looking forward to discussing details!`
  )}`;

  return (
    <section id="enquiry" className="py-10 sm:py-16 md:py-20 bg-gradient-to-b from-[#124233] via-[#0E3529] to-[#0A261D] text-white relative overflow-hidden">
      {/* Subtle Glow backgrounds */}
      <div className="absolute top-0 left-1/4 w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-[#899545]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-[#E8F1D4] text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-2.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#E8F1D4]" />
            <span>Coimbatore Meal Subscription</span>
          </div>

          <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-tight">
            Ready to stop guessing & start measuring?
          </h2>

          <p className="text-gray-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Choose your meal plan and timing. Our clinical nutritionist will customize your calorie & protein targets and ping you on WhatsApp.
          </p>
        </div>

        {/* The Enquiry Form Container */}
        <div className="bg-white text-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 shadow-2xl border border-white/20">
          {submitted ? (
            <div className="text-center py-6 sm:py-10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#E8F1D4] text-[#124233] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-heading font-black text-xl sm:text-2xl text-[#124233]">
                  Enquiry Received!
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong className="text-gray-900">{name}</strong>! Our clinical team has received your enquiry. We will reach out to <strong className="text-gray-900">{phone}</strong> within 15 minutes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F5F8EC] border border-[#124233]/15 max-w-sm mx-auto text-left text-xs space-y-1.5 text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Diet Preference:</span>
                  <span className="font-bold text-[#124233] uppercase">{diet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan:</span>
                  <span className="font-bold text-[#124233]">{mealPlan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Window:</span>
                  <span className="font-bold text-[#124233]">{preferredSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Area:</span>
                  <span className="font-bold text-[#124233] truncate max-w-[180px]">{area}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href={directWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-md transition-all tap-active"
                >
                  <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
                  <span>Chat on WhatsApp Directly</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setPhone('');
                    setNote('');
                  }}
                  className="w-full sm:w-auto text-xs font-bold text-gray-500 hover:text-gray-900 py-2.5 px-4 rounded-xl border border-gray-200"
                >
                  Submit Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Contact Info: Name & WhatsApp (Side by side on tablet+, stacked tightly on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-gray-600 mb-1">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Karthik Raja"
                      className="w-full pl-9 pr-3 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:border-[#124233] focus:ring-2 focus:ring-[#124233]/15 text-xs sm:text-sm font-medium outline-hidden transition-all bg-gray-50/50 hover:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-gray-600 mb-1">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 text-gray-600 text-xs font-bold select-none">
                      +91
                    </span>
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="98765 43210"
                        className="w-full pl-9 pr-3 py-2.5 sm:py-3 rounded-r-xl border border-gray-200 focus:border-[#124233] focus:ring-2 focus:ring-[#124233]/15 text-xs sm:text-sm font-medium outline-hidden transition-all bg-gray-50/50 hover:bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Coimbatore Delivery Area Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-gray-600">
                    Delivery Area (Coimbatore) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-medium">Free Doorstep Delivery</span>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:border-[#124233] focus:ring-2 focus:ring-[#124233]/15 text-xs sm:text-sm font-semibold outline-hidden transition-all bg-gray-50/50 hover:bg-white appearance-none cursor-pointer"
                  >
                    {COIMBATORE_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 3. Diet Preference & Plan - Mobile Optimized 3-Column Pill Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Diet Selection */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-gray-600 mb-1 flex items-center gap-1">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#899545]" />
                    <span>Diet Preference</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Non-Veg */}
                    <button
                      type="button"
                      onClick={() => setDiet('non-veg')}
                      className={cn(
                        'py-2 px-1 rounded-xl border text-center transition-all tap-active flex flex-col items-center justify-center gap-1 text-[11px] font-bold active:scale-95',
                        diet === 'non-veg'
                          ? 'border-[#124233] bg-[#124233] text-white shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      )}
                    >
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" aria-hidden="true">
                        <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3.5" fill="#FFFFFF" stroke="#7B3F00" strokeWidth="1.5" />
                        <polygon points="8,3.2 12.8,11.8 3.2,11.8" fill="#7B3F00" />
                      </svg>
                      <span className="leading-none">Non-Veg</span>
                    </button>

                    {/* Veg */}
                    <button
                      type="button"
                      onClick={() => setDiet('veg')}
                      className={cn(
                        'py-2 px-1 rounded-xl border text-center transition-all tap-active flex flex-col items-center justify-center gap-1 text-[11px] font-bold active:scale-95',
                        diet === 'veg'
                          ? 'border-[#124233] bg-[#124233] text-white shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      )}
                    >
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" aria-hidden="true">
                        <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="1.5" />
                        <circle cx="8" cy="8" r="3.75" fill="#16A34A" />
                      </svg>
                      <span className="leading-none">Pure Veg</span>
                    </button>

                    {/* Mixed */}
                    <button
                      type="button"
                      onClick={() => setDiet('mixed')}
                      className={cn(
                        'py-2 px-1 rounded-xl border text-center transition-all tap-active flex flex-col items-center justify-center gap-1 text-[11px] font-bold active:scale-95',
                        diet === 'mixed'
                          ? 'border-[#124233] bg-[#899545] text-white shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      )}
                    >
                      <span className="text-xs leading-none">🍱</span>
                      <span className="leading-none">Mixed</span>
                    </button>
                  </div>
                </div>

                {/* Plan Selection */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-gray-600 mb-1 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-[#899545]" />
                    <span>Interested Plan</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PLANS.map((p) => {
                      const isSelected = mealPlan === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setMealPlan(p.id)}
                          className={cn(
                            'py-2.5 px-1 rounded-xl border text-center transition-all tap-active flex flex-col items-center justify-center text-[11px] font-bold active:scale-95 leading-tight',
                            isSelected
                              ? 'border-[#124233] bg-[#124233] text-white shadow-xs'
                              : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          )}
                        >
                          <span className="line-clamp-1">{p.short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Preferred Delivery Window - Mobile Optimized 3-Column Touch Buttons */}
              <div>
                <label className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-gray-600 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#899545]" />
                  <span>Delivery Window (Coimbatore Fresh Dispatch)</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DELIVERY_WINDOWS.map((w) => {
                    const isSelected = preferredSlot === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setPreferredSlot(w.id)}
                        className={cn(
                          'py-2 px-1.5 rounded-xl border text-center transition-all tap-active flex flex-col items-center justify-center gap-0.5 active:scale-95',
                          isSelected
                            ? 'border-[#124233] bg-[#F5F8EC] text-[#124233] shadow-xs ring-1 ring-[#124233]/20 font-bold'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700 font-semibold'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{w.icon}</span>
                          <span className="text-[11px] leading-tight">{w.short}</span>
                        </div>
                        <span className="text-[9.5px] text-gray-500 font-normal leading-none">{w.time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Optional Note / Dietary Restrictions */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-gray-600">
                    Special Request (Optional)
                  </label>
                  <span className="text-[10px] text-gray-400 font-normal">Allergies, Calorie Goals</span>
                </div>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Need high calorie for bulking, allergic to peanuts..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#124233] focus:ring-2 focus:ring-[#124233]/15 text-xs sm:text-sm font-medium outline-hidden transition-all bg-gray-50/50 hover:bg-white resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl font-heading font-black text-sm sm:text-base bg-[#124233] hover:bg-[#0E3529] disabled:bg-gray-400 text-white flex items-center justify-center gap-2 transition-all tap-active shadow-lg shadow-[#124233]/20 active:scale-[0.99] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Enquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Request Free Nutrition Callback</span>
                    </>
                  )}
                </button>
              </div>

              {/* Trust Badges - Tight and legible */}
              <div className="pt-2.5 border-t border-gray-100 flex items-center justify-center gap-3 sm:gap-6 text-[10.5px] text-gray-500 font-semibold flex-wrap">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% Privacy</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Clinical Review</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>15-Min Callback</span>
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

