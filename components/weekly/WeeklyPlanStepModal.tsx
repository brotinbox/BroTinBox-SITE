'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useMenuVersion, usePricing, useRegularTrialPrice } from '@/components/providers/CatalogProvider';
import { getMenuForDate, getNextWeekOperatingDays, type DietType } from '@/lib/menu-engine';
import { useAppStore } from '@/store/useAppStore';
import { toDbDiet } from '@/lib/checkout/submit';
import { loadDraft, saveDraft } from '@/lib/checkout/draft';
import { MIN_PLAN_DAYS, planTotal, savingsVsTrial } from '@/lib/pricing';
import { SLOT_TIME, g1 } from '@/lib/meal-display';
import { cn } from '@/lib/utils';
import { DietMark } from '@/components/trial/DietMark';
import { BoxContents, BoxSizeSection, DayChip, FlowBar, FlowShell, OptionCard, Section, Segmented } from '@/components/flow/FlowUI';
import { pricingFor } from '@/lib/pricing';
import { boxView, type BoxSize } from '@/lib/lite-box';

type Variation = 'non-veg' | 'veg' | 'mixed';
const MIN_DAYS = MIN_PLAN_DAYS.weekly; // same rule the server checks

/**
 * Weekly plan: 2 steps, then the one-page checkout (address, sides & juices, pay).
 *  1. Plan your week: diet, meals a day, time, days (tap to skip)
 *  2. Your week's menu: each day's box, weighed
 */
export function WeeklyPlanStepModal() {
  const router = useRouter();
  const menuVersion = useMenuVersion();
  const PRICING = usePricing();
  const TRIAL_REGULAR = useRegularTrialPrice();
  const setCartPlan = useAppStore((s) => s.setCartPlan);
  const profileDiet = useAppStore((s) => s.user.dietType);

  const [step, setStep] = useState<1 | 2>(1);
  const [variation, setVariation] = useState<Variation>('non-veg');
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2>(1);
  const [boxSizeChoice, setBoxSize] = useState<BoxSize>('regular');
  const boxSize: BoxSize = PRICING.lite ? boxSizeChoice : 'regular'; // Lite only while on sale
  const [slot, setSlot] = useState<'lunch' | 'dinner'>('lunch');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [skipWarn, setSkipWarn] = useState(false);
  const [viewDate, setViewDate] = useState('');
  const [viewSlot, setViewSlot] = useState<'lunch' | 'dinner'>('lunch');

  const week = useMemo(() => getNextWeekOperatingDays(), []);
  // Mixed: Wed and Fri are veg (4 non-veg + 2 veg).
  const dietOf = (dow: string, v: Variation = variation): DietType =>
    v === 'mixed' ? (dow === 'Wed' || dow === 'Fri' ? 'veg' : 'non-veg') : v;

  // Draft: survives refreshes and sign-in redirects. Saving waits for the restore.
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const d = loadDraft<{ step: number; dietVariation: Variation; skippedDays: string[]; mealsPerDay: 1 | 2; slot?: 'lunch' | 'dinner'; boxSize?: BoxSize }>('weekly');
    if (d) {
      setVariation(d.dietVariation);
      setSkipped(d.skippedDays.filter((x) => week.some((w) => w.dateStr === x)));
      setMealsPerDay(d.mealsPerDay);
      if (d.boxSize) setBoxSize(d.boxSize);
      setSlot(d.slot === 'dinner' ? 'dinner' : 'lunch');
      setStep(d.step >= 2 ? 2 : 1);
    } else if (profileDiet === 'veg') {
      setVariation('veg');
    }
    // A link from a home/menu card (?diet=…) wins: they just picked that box.
    const qDiet = new URLSearchParams(window.location.search).get('diet');
    if (qDiet === 'veg' || qDiet === 'non-veg' || qDiet === 'mixed') {
      setVariation(qDiet);
      setStep(1);
      window.history.replaceState(null, '', window.location.pathname); // a refresh keeps the draft, not the link
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (draftReady) saveDraft('weekly', { step, dietVariation: variation, skippedDays: skipped, mealsPerDay, slot, boxSize });
  }, [draftReady, step, variation, skipped, mealsPerDay, slot, boxSize]);

  const days = useMemo(() => week.map((d) => ({ ...d, diet: dietOf(d.dayOfWeek), isSkipped: skipped.includes(d.dateStr) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [week, variation, skipped]);
  const active = days.filter((d) => !d.isSkipped);
  // Prices for the chosen size; Lite savings are measured against the Lite trial price.
  const P = pricingFor(PRICING, boxSize);
  const total = planTotal(P, 'weekly', active, mealsPerDay);
  const savings = savingsVsTrial(P, boxSize === 'lite' ? P.trial : TRIAL_REGULAR, 'weekly', active, mealsPerDay);
  const perMealFor = (v: Variation, sz: BoxSize = boxSize) =>
    planTotal(pricingFor(PRICING, sz), 'weekly', week.map((d) => ({ diet: dietOf(d.dayOfWeek, v) })), 1) / week.length;
  // Average box over the week (protein / kcal shown on the size cards).
  const avgMacros = (sz: BoxSize) => {
    const boxes = week.map((d) => boxView(getMenuForDate(d.dateStr, dietOf(d.dayOfWeek))[mealsPerDay === 2 ? 'lunch' : slot], sz).totals);
    return { protein: boxes.reduce((a, b) => a + b.protein, 0) / boxes.length, calories: boxes.reduce((a, b) => a + b.calories, 0) / boxes.length };
  };
  const deliverySlot: 'lunch' | 'dinner' = mealsPerDay === 2 ? 'lunch' : slot;
  const enough = active.length >= MIN_DAYS;

  const toggleDay = (dateStr: string) => {
    setSkipWarn(false);
    setSkipped((prev) => {
      if (prev.includes(dateStr)) return prev.filter((x) => x !== dateStr);
      if (week.length - prev.length <= MIN_DAYS) { setSkipWarn(true); return prev; }
      return [...prev, dateStr];
    });
  };

  const barNote = `${active.length} day${active.length === 1 ? '' : 's'} · ${mealsPerDay === 2 ? 'lunch & dinner' : deliverySlot}${savings > 0 ? ` · saves ₹${savings.toLocaleString('en-IN')}` : ''}`;

  const goToCheckout = () => {
    setCartPlan({
      type: 'weekly',
      title: `Weekly ${boxSize === 'lite' ? 'Lite ' : ''}plan · ${variation === 'veg' ? 'Veg' : variation === 'mixed' ? 'Mixed' : 'Non-veg'}`,
      mealsPerDay,
      boxSize,
      slot: deliverySlot,
      days: active.map((d) => ({ date: d.dateStr, diet: toDbDiet(d.diet) })),
      preferences: { isEggFree: false, skipLegume: false, dietVariation: variation },
      estimate: total,
    });
    router.push('/checkout');
  };

  if (step === 1) {
    return (
      <FlowShell
        flow="Weekly plan" step={1} steps={2}
        title="Plan your week"
        subtitle="A different box every day, Monday to Saturday. Delivery is free."
        bar={<FlowBar price={inr(total)} note={barNote} cta="See your week's menu" onClick={() => setStep(2)}
          disabled={!enough} hint={`Keep at least ${MIN_DAYS} days.`} />}
      >
        <BoxSizeSection value={boxSize} onChange={setBoxSize} priceNote="per meal"
          full={{ price: Math.round(perMealFor(variation, 'regular')), ...avgMacros('regular') }}
          lite={PRICING.lite ? { price: Math.round(perMealFor(variation, 'lite')), ...avgMacros('lite') } : null} />

        <Section title="Your diet">
          <div className="grid gap-2" role="radiogroup" aria-label="Diet">
            {([
              { k: 'non-veg', title: 'Non-veg', note: 'A non-veg box all 6 days' },
              { k: 'veg', title: 'Veg', note: 'A veg box all 6 days' },
              { k: 'mixed', title: 'Mixed', note: '4 non-veg days + 2 veg days (Wed, Fri)' },
            ] as const).map((o) => (
              <OptionCard key={o.k} selected={variation === o.k} onClick={() => setVariation(o.k)}
                lead={<span className="flex gap-0.5">
                  {o.k !== 'veg' && <DietMark kind="non-veg" />}
                  {o.k !== 'non-veg' && <DietMark kind="veg" />}
                </span>}
                title={o.title} note={o.note}
              />
            ))}
          </div>
        </Section>

        <Section title="Meals a day">
          <div className="grid gap-2" role="radiogroup" aria-label="Meals a day">
            <OptionCard selected={mealsPerDay === 1} onClick={() => setMealsPerDay(1)} title="1 meal" note="Lunch or dinner" />
            <OptionCard selected={mealsPerDay === 2} onClick={() => setMealsPerDay(2)} title="2 meals"
              note={`Lunch and dinner · ₹${P.secondMealDiscount} off each second meal`} />
          </div>
        </Section>

        <Section title="Delivery time" note={mealsPerDay === 2 ? `Lunch ${SLOT_TIME.lunch} and dinner ${SLOT_TIME.dinner}.` : undefined}>
          {mealsPerDay === 1 && (
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Delivery time">
              <OptionCard selected={slot === 'lunch'} onClick={() => setSlot('lunch')} title="Lunch" note={SLOT_TIME.lunch} />
              <OptionCard selected={slot === 'dinner'} onClick={() => setSlot('dinner')} title="Dinner" note={SLOT_TIME.dinner} />
            </div>
          )}
        </Section>

        <Section title="Your days" note={`Tap a day to skip it. You only pay for the days you keep (at least ${MIN_DAYS}).`}>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {days.map((d) => (
              <DayChip key={d.dateStr} selected={!d.isSkipped} crossed={d.isSkipped} onClick={() => toggleDay(d.dateStr)}
                main={d.dayOfWeek} sub={d.isSkipped ? 'Skipped' : variation === 'mixed' && d.diet === 'veg' ? `${d.formatted} · Veg` : d.formatted} />
            ))}
          </div>
          {skipWarn && <p role="alert" className="text-xs font-semibold text-rose-700">A weekly plan needs at least {MIN_DAYS} days.</p>}
        </Section>
      </FlowShell>
    );
  }

  const shown = active.find((d) => d.dateStr === viewDate) ?? active[0];
  const menu = shown ? getMenuForDate(shown.dateStr, shown.diet) : null;
  const shownSlot = mealsPerDay === 2 ? viewSlot : deliverySlot;
  void menuVersion; // re-render when the live menu loads
  return (
    <FlowShell
      flow="Weekly plan" step={2} steps={2} onBack={() => setStep(1)}
      title="Your week's menu"
      subtitle={`${boxSize === 'lite' ? 'Lite box · ' : ''}${active.length} days · ${mealsPerDay === 2 ? 'lunch & dinner' : `${deliverySlot} ${SLOT_TIME[deliverySlot]}`}`}
      bar={<FlowBar price={inr(total)} note={barNote} cta="Continue to checkout"
        icon={<ShoppingBag className="w-4 h-4 text-accent-bright" />} onClick={goToCheckout} disabled={!enough} />}
    >
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Day">
        {active.map((d) => (
          <button key={d.dateStr} type="button" role="tab" aria-selected={shown?.dateStr === d.dateStr} onClick={() => setViewDate(d.dateStr)}
            className={cn('shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold flex items-center gap-1.5',
              shown?.dateStr === d.dateStr ? 'border-ink bg-ink text-white' : 'border-gray-200 bg-white text-gray-700')}>
            <DietMark kind={d.diet} size="sm" />
            {d.dayOfWeek} {d.formatted.split(' ')[0]}
          </button>
        ))}
      </div>

      {menu && shown && (
        <Section
          title={boxView(menu[shownSlot], boxSize).main.name}
          note={`${shown.dayName} · ${shown.diet === 'veg' ? 'Veg' : 'Non-veg'} · weighed on a kitchen scale`}
          right={mealsPerDay === 2 ? (
            <Segmented value={viewSlot} onChange={setViewSlot} options={[{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }]} />
          ) : undefined}
        >
          <BoxContents box={menu[shownSlot]} size={boxSize} />
        </Section>
      )}

      {menu && mealsPerDay === 2 && (
        <p className="text-xs text-gray-500 px-1">
          That day in total: {Math.round(boxView(menu.lunch, boxSize).totals.calories + boxView(menu.dinner, boxSize).totals.calories)} kcal · {g1(boxView(menu.lunch, boxSize).totals.protein + boxView(menu.dinner, boxSize).totals.protein)} g protein.
        </p>
      )}
    </FlowShell>
  );
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
