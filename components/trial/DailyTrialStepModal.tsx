'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMenuVersion, usePricing, useRegularTrialPrice, useTrialOffer } from '@/components/providers/CatalogProvider';
import { LAUNCH_DATE, getMenuForDate, getNextBookableDays, type DietType } from '@/lib/menu-engine';
import { useAppStore } from '@/store/useAppStore';
import type { MealSlot } from '@/types';
import { toDbDiet } from '@/lib/checkout/submit';
import { loadDraft, saveDraft } from '@/lib/checkout/draft';
import { SLOT_TIME, g1 } from '@/lib/meal-display';
import { DietMark } from '@/components/trial/DietMark';
import { BoxContents, BoxSizeSection, DayChip, FlowBar, FlowShell, OptionCard, Section, Segmented } from '@/components/flow/FlowUI';
import { pricingFor } from '@/lib/pricing';
import { boxView, type BoxSize } from '@/lib/lite-box';
import { getTrialSeats, type TrialSeats } from '@/lib/checkout/actions';

const FEW = 3; // same as FEW_SEATS in lib/capacity.ts

/**
 * Trial box: 2 steps, then the one-page checkout (address, sides & juices, pay).
 *  1. Build your box: diet, meals a day, day, time
 *  2. Your box: what's inside, weighed
 */
export function DailyTrialStepModal() {
  const router = useRouter();
  const menuVersion = useMenuVersion();
  const PRICING = usePricing();
  const trialOffer = useTrialOffer();
  const TRIAL_REGULAR = useRegularTrialPrice();
  const setCartPlan = useAppStore((s) => s.setCartPlan);
  const profileDiet = useAppStore((s) => s.user.dietType);

  const [step, setStep] = useState<1 | 2>(1);
  const [diet, setDiet] = useState<DietType>('non-veg');
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2>(1);
  const [boxSizeChoice, setBoxSize] = useState<BoxSize>('regular');
  // Lite only while it's on sale (a stale draft can't keep it).
  const boxSize: BoxSize = PRICING.lite ? boxSizeChoice : 'regular';
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [viewSlot, setViewSlot] = useState<'lunch' | 'dinner'>('lunch');

  // Look a week ahead so fully booked days can roll over to the next open ones.
  const bookableDays = useMemo(() => getNextBookableDays(6), []);
  const [dateStr, setDateStr] = useState(bookableDays[0]?.dateStr ?? '');
  // Never keep a date the screen isn't showing (cutoff passed, stale draft).
  useEffect(() => {
    if (bookableDays.length && !bookableDays.some((d) => d.dateStr === dateStr)) setDateStr(bookableDays[0].dateStr);
  }, [bookableDays, dateStr]);
  const day = bookableDays.find((d) => d.dateStr === dateStr) ?? bookableDays[0];

  // Seats left per day and slot (null until loaded or if unavailable: no badges, the server still checks).
  const [seats, setSeats] = useState<TrialSeats | null>(null);
  useEffect(() => {
    if (bookableDays.length) getTrialSeats(bookableDays.map((d) => d.dateStr)).then(setSeats).catch(() => {});
  }, [bookableDays]);
  const left = (date: string, s: 'lunch' | 'dinner') => seats?.[date]?.[s];
  const isFull = (date: string, s: 'lunch' | 'dinner') => left(date, s) === 0;
  /** The day can't take this many meals: 2 meals need both slots, 1 meal needs either. */
  const dayFull = (date: string, n: 1 | 2) =>
    n === 2 ? isFull(date, 'lunch') || isFull(date, 'dinner') : isFull(date, 'lunch') && isFull(date, 'dinner');
  // The three days on screen: the next ones with any seat left (sold-out days drop off).
  const openDays = bookableDays.filter((d) => !dayFull(d.dateStr, 1));
  const shownDays = (openDays.length ? openDays : bookableDays).slice(0, 3);

  // Draft: survives refreshes and sign-in redirects. Saving waits for the restore.
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const d = loadDraft<{ step: number; diet: DietType; selectedDateStr: string; mealSlot: MealSlot; mealsPerDay: 1 | 2; boxSize?: BoxSize }>('trial');
    if (d) {
      setDiet(d.diet);
      if (bookableDays.some((b) => b.dateStr === d.selectedDateStr)) setDateStr(d.selectedDateStr);
      setMealSlot(d.mealSlot);
      setMealsPerDay(d.mealsPerDay);
      if (d.boxSize) setBoxSize(d.boxSize);
      setStep(d.step >= 2 ? 2 : 1);
    } else if (profileDiet === 'veg') {
      setDiet('veg'); // start from the diet in their profile
    }
    // A link from a home/menu card (?date=…&diet=…) wins: they just picked that box.
    const q = new URLSearchParams(window.location.search);
    const qDiet = q.get('diet');
    const qDate = q.get('date');
    if (qDiet === 'veg' || qDiet === 'non-veg') setDiet(qDiet);
    if (qDate && bookableDays.some((b) => b.dateStr === qDate)) setDateStr(qDate);
    if (qDiet || qDate) {
      setStep(1);
      window.history.replaceState(null, '', window.location.pathname); // a refresh keeps the draft, not the link
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (draftReady) saveDraft('trial', { step, diet, selectedDateStr: dateStr, mealSlot, mealsPerDay, boxSize });
  }, [draftReady, step, diet, dateStr, mealSlot, mealsPerDay, boxSize]);

  // Steer away from a fully booked choice: other slot, then 1 meal, then the next open day.
  useEffect(() => {
    if (!seats || !draftReady || !dateStr) return;
    if (mealsPerDay === 2 && dayFull(dateStr, 2) && !dayFull(dateStr, 1)) { setMealsPerDay(1); return; }
    if (dayFull(dateStr, mealsPerDay)) {
      const open = shownDays.find((d) => !dayFull(d.dateStr, mealsPerDay)) ?? shownDays.find((d) => !dayFull(d.dateStr, 1));
      if (open && open.dateStr !== dateStr) setDateStr(open.dateStr);
      return;
    }
    if (mealsPerDay === 1) {
      const s = mealSlot === 'dinner' ? 'dinner' : 'lunch';
      if (isFull(dateStr, s)) setMealSlot(s === 'lunch' ? 'dinner' : 'lunch');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, draftReady, dateStr, mealsPerDay, mealSlot]);

  const menus = useMemo(() => ({
    veg: getMenuForDate(dateStr, 'veg'),
    'non-veg': getMenuForDate(dateStr, 'non-veg'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [dateStr, menuVersion]);
  const menu = menus[diet];
  const slot: 'lunch' | 'dinner' = mealsPerDay === 2 ? 'lunch' : mealSlot === 'dinner' ? 'dinner' : 'lunch';

  // Prices for the chosen size. The opening offer (struck-out price) is on the full box only.
  const P = pricingFor(PRICING, boxSize);
  const priceFor = (n: 1 | 2) => P.trial[diet] * n - (n === 2 ? P.secondMealDiscount : 0);
  const total = priceFor(mealsPerDay);
  const offerOn = !!trialOffer && boxSize === 'regular';
  const regularTotal = offerOn ? TRIAL_REGULAR[diet] * mealsPerDay - (mealsPerDay === 2 ? PRICING.secondMealDiscount : 0) : null;
  const view = (k: DietType, sz: BoxSize = boxSize) => boxView(menus[k][slot], sz);
  const strike = regularTotal && regularTotal !== total ? inr(regularTotal) : undefined;
  const when = `${day?.dayOfWeek}, ${day?.formatted}`;
  const timeLabel = mealsPerDay === 2 ? 'Lunch & dinner' : slot === 'dinner' ? 'Dinner' : 'Lunch';
  const choiceFull = !!dateStr && (mealsPerDay === 2 ? dayFull(dateStr, 2) : isFull(dateStr, slot));
  const allFull = !!seats && bookableDays.every((d) => dayFull(d.dateStr, 1));
  const slotNote = (s: 'lunch' | 'dinner') => {
    const n = left(dateStr, s);
    if (n === 0) return 'Fully booked';
    return n !== undefined && n <= FEW ? `Only ${n} left · ${SLOT_TIME[s]}` : SLOT_TIME[s];
  };

  const goToCheckout = () => {
    setCartPlan({
      type: 'trial',
      title: `${boxSize === 'lite' ? 'Lite trial box' : 'Trial box'} · ${diet === 'veg' ? 'Veg' : 'Non-veg'}`,
      mealsPerDay,
      boxSize,
      slot,
      days: [{ date: dateStr, diet: toDbDiet(diet) }],
      preferences: { isEggFree: false, skipLegume: false },
      estimate: total,
    });
    router.push('/checkout');
  };

  if (step === 1) {
    return (
      <FlowShell
        flow="Trial box" step={1} steps={2}
        title="Build your trial box"
        subtitle="One fresh box, weighed to the gram. Delivery is free."
        bar={<FlowBar price={inr(total)} strike={strike} note={`${timeLabel} · ${when}`}
          cta="See what's inside" onClick={() => setStep(2)} disabled={!dateStr || choiceFull} />}
      >
        <BoxSizeSection value={boxSize} onChange={setBoxSize}
          full={{ price: PRICING.trial[diet], strike: trialOffer ? TRIAL_REGULAR[diet] : undefined, ...view(diet, 'regular').totals }}
          lite={PRICING.lite ? { price: PRICING.lite.trial[diet], ...view(diet, 'lite').totals } : null} />

        <Section title="Your diet">
          <div className="grid gap-2" role="radiogroup" aria-label="Diet">
            {(['non-veg', 'veg'] as const).map((k) => {
              const box = view(k);
              return (
                <OptionCard key={k} selected={diet === k} onClick={() => setDiet(k)}
                  lead={<DietMark kind={k} />}
                  title={k === 'veg' ? 'Veg' : 'Non-veg'}
                  note={`${g1(box.totals.protein)} g protein · ${Math.round(box.totals.calories)} kcal`}
                />
              );
            })}
          </div>
        </Section>

        <Section title="Meals that day">
          <div className="grid gap-2" role="radiogroup" aria-label="Meals that day">
            <OptionCard selected={mealsPerDay === 1} onClick={() => setMealsPerDay(1)}
              title="1 meal" note="Lunch or dinner" />
            <OptionCard selected={mealsPerDay === 2} onClick={() => setMealsPerDay(2)} disabled={dayFull(dateStr, 2)}
              title="2 meals" note={dayFull(dateStr, 2) ? 'Not available this day: one slot is fully booked' : `Lunch and dinner · ₹${P.secondMealDiscount} off the second`} />
          </div>
        </Section>

        <Section title="Day" note={bookableDays[0]?.dateStr === LAUNCH_DATE ? 'We launch on Monday 16 Nov. Sundays closed.' : 'Order by 9 PM for the next day. Sundays closed.'}>
          <div className="grid grid-cols-3 gap-2">
            {shownDays.map((d) => {
              const full = dayFull(d.dateStr, mealsPerDay);
              const few = Math.min(...(['lunch', 'dinner'] as const).map((s) => left(d.dateStr, s) ?? FEW + 1).filter((n) => n > 0));
              return (
                <DayChip key={d.dateStr} selected={dateStr === d.dateStr && !full} onClick={() => setDateStr(d.dateStr)} disabled={full}
                  top={full ? 'Full' : few <= FEW ? `${few} left` : d.isEarliest ? (d.dateStr === LAUNCH_DATE ? 'Launch day' : 'Earliest') : undefined}
                  topTone={!full && few <= FEW ? 'warn' : undefined}
                  main={d.dayOfWeek} sub={d.formatted} />
              );
            })}
          </div>
          {allFull && (
            <p role="alert" className="mt-2 text-xs font-semibold text-orange-700">
              Trial boxes are fully booked for the next week. Check back tomorrow, or start a weekly plan (no limit).
            </p>
          )}
        </Section>

        <Section title="Delivery time" note={mealsPerDay === 2 ? `Lunch ${SLOT_TIME.lunch} and dinner ${SLOT_TIME.dinner}.` : undefined}>
          {mealsPerDay === 1 && (
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Delivery time">
              <OptionCard selected={mealSlot !== 'dinner'} onClick={() => setMealSlot('lunch')} disabled={isFull(dateStr, 'lunch')} title="Lunch" note={slotNote('lunch')} />
              <OptionCard selected={mealSlot === 'dinner'} onClick={() => setMealSlot('dinner')} disabled={isFull(dateStr, 'dinner')} title="Dinner" note={slotNote('dinner')} />
            </div>
          )}
        </Section>
      </FlowShell>
    );
  }

  const shownSlot = mealsPerDay === 2 ? viewSlot : slot;
  const box = menu[shownSlot];
  return (
    <FlowShell
      flow="Trial box" step={2} steps={2} onBack={() => setStep(1)}
      title={box.items.main.name}
      subtitle={`${boxSize === 'lite' ? 'Lite box · ' : ''}${diet === 'veg' ? 'Veg' : 'Non-veg'} · ${timeLabel} · ${when}`}
      bar={<FlowBar price={inr(total)} strike={strike} note="Add sides & juices at checkout"
        cta="Continue to checkout" onClick={goToCheckout} />}
    >
      <Section
        title={mealsPerDay === 2 ? 'Your two boxes' : 'Inside your box'}
        note="Every item weighed on a kitchen scale."
        right={mealsPerDay === 2 ? (
          <Segmented value={viewSlot} onChange={setViewSlot} options={[{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }]} />
        ) : undefined}
      >
        <BoxContents box={box} size={boxSize} />
      </Section>

      {mealsPerDay === 2 && (
        <p className="text-xs text-gray-500 px-1">
          Both boxes together: {Math.round(boxView(menu.lunch, boxSize).totals.calories + boxView(menu.dinner, boxSize).totals.calories)} kcal · {g1(boxView(menu.lunch, boxSize).totals.protein + boxView(menu.dinner, boxSize).totals.protein)} g protein.
        </p>
      )}
    </FlowShell>
  );
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
