'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { quickStart } from './actions';
import { safeNext } from '@/lib/auth/customer';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { toUserProfile } from '@/lib/auth/mapProfile';
import { GoalType } from '@/types';
import { Flame, Dumbbell, Target, ShieldCheck, ArrowRight, Leaf, Egg, Drumstick } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOALS = [
  { id: 'fat-loss', title: 'Lose fat', icon: Flame, color: 'text-orange-500 bg-orange-100' },
  { id: 'muscle-gain', title: 'Build muscle', icon: Dumbbell, color: 'text-emerald-600 bg-emerald-100' },
  { id: 'stay-fit', title: 'Stay fit', icon: Target, color: 'text-blue-600 bg-blue-100' },
  { id: 'elderly-care', title: 'For parents', icon: ShieldCheck, color: 'text-rose-500 bg-rose-100' },
] as const;

const DIETS = [
  { id: 'non-veg', title: 'Non-veg', icon: Drumstick },
  { id: 'eggetarian', title: 'Egg + veg', icon: Egg },
  { id: 'veg', title: 'Pure veg', icon: Leaf },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoggedIn, authReady } = useAppStore();

  const [goal, setGoal] = useState<GoalType | null>(null);
  const [dietType, setDietType] = useState<'veg' | 'non-veg' | 'eggetarian' | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prefill from the Google profile once auth has loaded.
  useEffect(() => {
    if (!authReady) return;
    if (!isLoggedIn) { router.replace('/login?next=/onboarding'); return; }
    setFullName((v) => v || user.fullName || '');
    setPhone((v) => v || (user.phone || '').replace(/^\+91/, ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, isLoggedIn]);

  const phoneOk = phone === '' || /^[6-9]\d{9}$/.test(phone);
  const firstName = fullName.trim().split(' ')[0];

  const finish = async (skip: boolean) => {
    setError('');
    setSaving(true);
    const result = await quickStart(skip ? {} : {
      fullName,
      phone: phone || undefined,
      goal: goal ?? undefined,
      dietType: dietType ?? undefined,
    });
    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }
    const { data: profile } = await getSupabaseBrowser().from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profile) useAppStore.getState().setAuthProfile(toUserProfile(profile));
    router.push(safeNext(new URLSearchParams(window.location.search).get('next'), '/dashboard'));
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6">
          <div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-gray-900">
              Welcome{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">Two quick taps and you&apos;re in. You can change these any time.</p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Your goal</p>
            <div className="grid grid-cols-2 gap-2.5">
              {GOALS.map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={cn(
                      'p-3 rounded-2xl border-2 flex items-center gap-2.5 text-left transition-all tap-active',
                      goal === g.id ? 'border-primary bg-primary-light/20 ring-2 ring-primary/20' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', g.color)}><Icon className="w-4 h-4" /></span>
                    <span className="font-heading font-bold text-sm text-gray-900">{g.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">You eat</p>
            <div className="grid grid-cols-3 gap-2.5">
              {DIETS.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDietType(d.id)}
                    className={cn(
                      'py-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all tap-active',
                      dietType === d.id ? 'border-primary bg-primary-light/20 ring-2 ring-primary/20' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="font-bold text-xs text-gray-900">{d.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} autoComplete="name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Mobile <span className="normal-case font-semibold text-gray-400">(optional)</span></span>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 focus-within:border-primary focus-within:bg-white">
                <span className="px-3 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 border-r border-gray-200">+91</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="tel-national"
                  placeholder="WhatsApp updates" className="w-full px-3 py-2.5 text-sm font-bold text-gray-900 bg-transparent focus:outline-none" />
              </div>
            </label>
          </div>

          {error && <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>}

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => finish(false)}
              disabled={saving || !phoneOk}
              className="w-full disabled:opacity-50 bg-cta hover:bg-cta-hover text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-cta/25 flex items-center justify-center gap-2 tap-active"
            >
              <span>{saving ? 'Saving…' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => finish(true)} disabled={saving} className="w-full text-xs font-bold text-gray-500 hover:text-gray-900 py-1">
              Skip for now
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center">
            We&apos;ll ask for your address at checkout. Add height, weight and age later in your profile for exact calorie and protein targets.
          </p>
        </div>
      </div>
    </div>
  );
}
