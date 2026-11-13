'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useMenuVersion, usePricing, useRegularTrialPrice } from '@/components/providers/CatalogProvider';
import { MONTHLY_MIN_DAYS, MONTHLY_PLAN_DAYS, getMenuForDate, getMonthlyOperatingDays, type DietType } from '@/lib/menu-engine';
import { planTotal, savingsVsTrial } from '@/lib/pricing';
import { useAppStore } from '@/store/useAppStore';
import { toDbDiet } from '@/lib/checkout/submit';
import { loadDraft, saveDraft } from '@/lib/checkout/draft';
import { SLOT_TIME, g1 } from '@/lib/meal-display';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';
import { DietMark } from '@/components/trial/DietMark';
import { BoxContents, BoxSizeSection, FlowBar, FlowShell, OptionCard, Section } from '@/components/flow/FlowUI';
import { pricingFor } from '@/lib/pricing';
import { boxView, type BoxSize } from '@/lib/lite-box';

type Variation = 'non-veg' | 'veg' | 'mixed';
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Monthly plan: 2 steps, then the one-page checkout (address, sides & juices, pay).
 *  1. Plan your month: diet, meals a day, time, days (calendar, tap to skip)
 *  2. Your month's menu: week by week, tap a day to see its box
 */
export default function MonthlyPlanPage() {
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
  const [week, setWeek] = useState(0);
  const [openDate, setOpenDate] = useState<string | null>(null);

  const month = useMemo(() => getMonthlyOperatingDays(), []);
  const dietOf = (dow: string, v: Variation = variation): DietType =>
    v === 'mixed' ? (dow === 'Wed' || dow === 'Fri' ? 'veg' : 'non-veg') : v;
  const deliverySlot: 'lunch' | 'dinner' = mealsPerDay === 2 ? 'lunch' : slot;

  // Draft: survives refreshes and sign-in redirects. Saving waits for the restore.
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const d = loadDraft<{ step: number; variation: Variation; skipped: string[]; mealsPerDay: 1 | 2; slot: 'lunch' | 'dinner'; boxSize?: BoxSize }>('monthly');
    if (d) {
      setVariation(d.variation);
      setSkipped(d.skipped.filter((x) => month.some((m) => m.dateStr === x)));
      setMealsPerDay(d.mealsPerDay);
      if (d.boxSize) setBoxSize(d.boxSize);
      setSlot(d.slot === 'dinner' ? 'dinner' : 'lunch');
      setStep(d.step >= 2 ? 2 : 1);
    } else if (profileDiet === 'veg') {
      setVariation('veg');
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (draftReady) saveDraft('monthly', { step, variation, skipped, mealsPerDay, slot, boxSize });
  }, [draftReady, step, variation, skipped, mealsPerDay, slot, boxSize]);

  const days = useMemo(() => month.map((d) => {
    const diet = dietOf(d.dayOfWeek);
    const menu = getMenuForDate(d.dateStr, diet);
    return { ...d, diet, menu, box: menu[deliverySlot], view: boxView(menu[deliverySlot], boxSize), isSkipped: skipped.includes(d.dateStr) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [month, variation, skipped, deliverySlot, boxSize, menuVersion]);
  const active = days.filter((d) => !d.isSkipped);
  // Prices for the chosen size; Lite savings are measured against the Lite trial price.
  const P = pricingFor(PRICING, boxSize);
  const total = planTotal(P, 'monthly', active, mealsPerDay);
  const savings = savingsVsTrial(P, boxSize === 'lite' ? P.trial : TRIAL_REGULAR, 'monthly', active, mealsPerDay);
  const perMeal = (v: Variation, sz: BoxSize = boxSize) =>
    planTotal(pricingFor(PRICING, sz), 'monthly', month.map((d) => ({ diet: dietOf(d.dayOfWeek, v) })), 1) / month.length;
  const avgMacros = (sz: BoxSize) => {
    const t = days.map((d) => boxView(d.box, sz).totals);
    return { protein: t.reduce((a, b) => a + b.protein, 0) / t.length, calories: t.reduce((a, b) => a + b.calories, 0) / t.length };
  };
  const enough = active.length >= MONTHLY_MIN_DAYS;
  const maxSkips = MONTHLY_PLAN_DAYS - MONTHLY_MIN_DAYS;
  // Peanut days still in the plan; skipping them only works if the plan keeps its minimum days.
  const peanutLeft = days.filter((d) => d.view.hasPeanut && !d.isSkipped).map((d) => d.dateStr);
  const peanutFits = active.length - peanutLeft.length >= MONTHLY_MIN_DAYS;

  const toggleDay = (dateStr: string) =>
    setSkipped((prev) => (prev.includes(dateStr) ? prev.filter((x) => x !== dateStr) : [...prev, dateStr]));

  const barNote = `${active.length} days · ${mealsPerDay === 2 ? 'lunch & dinner' : deliverySlot}${savings > 0 ? ` · saves ₹${savings.toLocaleString('en-IN')}` : ''}`;
  const hint = `Keep at least ${MONTHLY_MIN_DAYS} of ${MONTHLY_PLAN_DAYS} days for the monthly price (skip up to ${maxSkips}).`;

  const goToCheckout = () => {
    setCartPlan({
      type: 'monthly',
      title: `Monthly ${boxSize === 'lite' ? 'Lite ' : ''}plan · ${variation === 'veg' ? 'Veg' : variation === 'mixed' ? 'Mixed' : 'Non-veg'}`,
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
    // Calendar rows: one per plan week, Mon–Sat columns.
    const rows: (typeof days[number] | null)[][] = [];
    for (const d of days) {
      const col = WEEKDAYS.indexOf(d.dayOfWeek);
      if (!rows.length || (col === 0 && rows[rows.length - 1].some(Boolean))) rows.push(Array(6).fill(null));
      rows[rows.length - 1][col] = d;
    }
    return (
      <FlowShell
        flow="Monthly plan" step={1} steps={2}
        title="Plan your month"
        subtitle={`${MONTHLY_PLAN_DAYS} days, Monday to Saturday. Our best price per meal, delivery free.`}
        bar={<FlowBar price={inr(total)} note={barNote} cta="See your month's menu" onClick={() => setStep(2)} disabled={!enough} hint={hint} />}
      >
        <BoxSizeSection value={boxSize} onChange={setBoxSize} priceNote="per meal"
          full={{ price: Math.round(perMeal(variation, 'regular')), ...avgMacros('regular') }}
          lite={PRICING.lite ? { price: Math.round(perMeal(variation, 'lite')), ...avgMacros('lite') } : null} />

        <Section title="Your diet">
          <div className="grid gap-2" role="radiogroup" aria-label="Diet">
            {([
              { k: 'non-veg', title: 'Non-veg', note: 'A non-veg box every day' },
              { k: 'veg', title: 'Veg', note: 'A veg box every day' },
              { k: 'mixed', title: 'Mixed', note: 'Non-veg, with veg on Wednesdays and Fridays' },
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

        <Section title="Your days" note={`Tap a day to skip it. ${hint}`}
          right={<span className="text-xs font-bold text-gray-900 shrink-0">{active.length}/{MONTHLY_PLAN_DAYS}</span>}>
          <div className="grid grid-cols-6 gap-1.5 text-center">
            {WEEKDAYS.map((w) => <span key={w} className="text-[11px] font-bold text-gray-400">{w}</span>)}
            {rows.flatMap((row, r) => row.map((d, c) => d ? (
              <button key={d.dateStr} type="button" aria-pressed={!d.isSkipped}
                aria-label={`${d.dayName} ${d.formatted}: ${d.isSkipped ? 'skipped' : 'included'}`}
                onClick={() => toggleDay(d.dateStr)}
                className={cn('min-h-[48px] rounded-lg border flex flex-col items-center justify-center tap-active transition-colors',
                  d.isSkipped ? 'border-dashed border-gray-300 bg-gray-50 text-gray-400' : 'border-ink bg-ink text-white')}>
                <span className={cn('font-heading font-black text-sm leading-none', d.isSkipped && 'line-through')}>{d.formatted.split(' ')[0]}</span>
                <span className={cn('text-[11px] leading-tight mt-0.5', d.isSkipped ? 'text-gray-400' : 'text-white/70')}>
                  {d.isSkipped ? 'skip' : variation === 'mixed' && d.diet === 'veg' ? 'veg' : d.formatted.split(' ')[1]}
                </span>
              </button>
            ) : <span key={`e${r}-${c}`} />))}
          </div>
          {!enough && <p role="alert" className="text-xs font-semibold text-rose-700">{hint}</p>}
          {peanutLeft.length > 0 && (peanutFits ? (
            <button type="button" onClick={() => setSkipped((prev) => [...new Set([...prev, ...peanutLeft])])}
              className="text-xs font-bold text-accent">
              Peanut allergy? Skip the {peanutLeft.length} peanut day{peanutLeft.length > 1 ? 's' : ''}
            </button>
          ) : (
            <p className="text-xs text-gray-600">
              Peanut allergy? {peanutLeft.length} days have peanut.{' '}
              <a href={`https://wa.me/${BRAND.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hi! I have a peanut allergy. Can you swap the peanut days in my monthly plan?')}`}
                target="_blank" rel="noopener noreferrer" className="font-bold text-accent">WhatsApp us</a> and we&apos;ll swap them for you.
            </p>
          ))}
        </Section>
      </FlowShell>
    );
  }

  const weeks = [...new Set(active.map((d) => d.weekIndex))].sort();
  const shownWeek = weeks.includes(week) ? week : weeks[0] ?? 0;
  return (
    <FlowShell
      flow="Monthly plan" step={2} steps={2} onBack={() => setStep(1)}
      title="Your month's menu"
      subtitle={`${boxSize === 'lite' ? 'Lite box · ' : ''}${active.length} days · ${mealsPerDay === 2 ? 'lunch & dinner' : `${deliverySlot} ${SLOT_TIME[deliverySlot]}`}`}
      bar={<FlowBar price={inr(total)} note={barNote} cta="Continue to checkout"
        onClick={goToCheckout} disabled={!enough} />}
    >
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Week">
        {weeks.map((w) => (
          <button key={w} type="button" role="tab" aria-selected={shownWeek === w} onClick={() => { setWeek(w); setOpenDate(null); }}
            className={cn('shrink-0 rounded-full border px-4 py-2 text-xs font-bold',
              shownWeek === w ? 'border-ink bg-ink text-white' : 'border-gray-200 bg-white text-gray-700')}>
            Week {w + 1}
          </button>
        ))}
      </div>

      <Section title={`Week ${shownWeek + 1}`} note="Tap a day to see what's in the box.">
        <ul className="divide-y divide-gray-100 -my-1">
          {active.filter((d) => d.weekIndex === shownWeek).map((d) => {
            const open = openDate === d.dateStr;
            return (
              <li key={d.dateStr} className="py-1">
                <button type="button" aria-expanded={open} onClick={() => setOpenDate(open ? null : d.dateStr)}
                  className="w-full flex items-center gap-3 py-2 text-left">
                  <span className="w-12 shrink-0">
                    <span className="block text-xs font-bold text-gray-900">{d.dayOfWeek}</span>
                    <span className="block text-[11px] text-gray-500">{d.formatted}</span>
                  </span>
                  <DietMark kind={d.diet} size="sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-900 truncate">{d.view.main.name}</span>
                    <span className="block text-xs text-gray-500">
                      {g1(d.view.totals.protein)} g protein · {Math.round(d.view.totals.calories)} kcal{d.view.hasPeanut ? ' · contains peanut' : ''}
                    </span>
                  </span>
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="pb-3">
                    <BoxContents box={d.box} size={boxSize} />
                    {mealsPerDay === 2 && (
                      <p className="mt-2 text-xs text-gray-500">Dinner that day: {d.menu.dinner.items.main.name}.</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>
    </FlowShell>
  );
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
