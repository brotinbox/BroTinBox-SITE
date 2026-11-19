'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { useMenuVersion, usePricing } from '@/components/providers/CatalogProvider';
import { getMenuForDate, getNextBookableDays, type DietType } from '@/lib/menu-engine';
import { useAppStore } from '@/store/useAppStore';
import { toDbDiet } from '@/lib/checkout/submit';
import { loadDraft, saveDraft } from '@/lib/checkout/draft';
import { SLOT_TIME, g1 } from '@/lib/meal-display';
import { DietMark } from '@/components/trial/DietMark';
import { BoxContents, BoxSizeSection, DayChip, FlowBar, FlowShell, OptionCard, Section, Segmented } from '@/components/flow/FlowUI';
import { pricingFor } from '@/lib/pricing';
import { boxView, type BoxSize } from '@/lib/lite-box';
import { getSameDayToday, getTrialSeats, myTrialStatus, type TrialSeats } from '@/lib/checkout/actions';
import type { SameDayOffer } from '@/lib/same-day';

type Slot = 'lunch' | 'dinner';
const FEW = 3; // same as FEW_SEATS / FEW_SPARES on the server
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isNaN(h) ? hhmm : `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/**
 * Single box: one box, any day, as often as you like. Today is offered while
 * the kitchen still has same-day spares and the slot's cutoff hasn't passed
 * (lunch 9:30 AM, dinner 5 PM by default). The server checks it all again.
 *  1. Build your box: size, diet, meals, day, time
 *  2. Your box: what's inside
 */
export function SingleBoxFlow() {
  const router = useRouter();
  const menuVersion = useMenuVersion();
  const PRICING = usePricing();
  const setCartPlan = useAppStore((s) => s.setCartPlan);
  const profileDiet = useAppStore((s) => s.user.dietType);
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  const [step, setStep] = useState<1 | 2>(1);
  const [diet, setDiet] = useState<DietType>('non-veg');
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2>(1);
  const [boxSizeChoice, setBoxSize] = useState<BoxSize>('regular');
  const boxSize: BoxSize = PRICING.lite ? boxSizeChoice : 'regular';
  const [slot, setSlot] = useState<Slot>('lunch');
  const [viewSlot, setViewSlot] = useState<Slot>('lunch');
  const dbDiet = toDbDiet(diet);

  // ----- Today (same-day spares) and the next days (slot seats)
  const [sd, setSd] = useState<SameDayOffer | null>(null);
  const [sdLoaded, setSdLoaded] = useState(false);
  useEffect(() => {
    getSameDayToday().then(setSd).catch(() => {}).finally(() => setSdLoaded(true));
  }, []);
  const today = sd?.date ?? '';
  const todayOpen = (s: Slot, d = dbDiet) => !!sd && sd.slots[s].open && sd.slots[s].left[d] > 0;
  const todayDayOpen = (n: 1 | 2, d = dbDiet) => (n === 2 ? todayOpen('lunch', d) && todayOpen('dinner', d) : todayOpen('lunch', d) || todayOpen('dinner', d));
  const todayAny = !!sd && (['veg', 'non_veg'] as const).some((d) => todayDayOpen(1, d));

  const bookableDays = useMemo(() => getNextBookableDays(6), []);
  const [seats, setSeats] = useState<TrialSeats | null>(null);
  useEffect(() => {
    if (bookableDays.length) getTrialSeats(bookableDays.map((d) => d.dateStr)).then(setSeats).catch(() => {});
  }, [bookableDays]);
  const left = (date: string, s: Slot) => seats?.[date]?.[s];
  const isFull = (date: string, s: Slot) => left(date, s) === 0;
  const dayFull = (date: string, n: 1 | 2) =>
    n === 2 ? isFull(date, 'lunch') || isFull(date, 'dinner') : isFull(date, 'lunch') && isFull(date, 'dinner');
  const openDays = bookableDays.filter((d) => !dayFull(d.dateStr, 1));
  const futureDays = (openDays.length ? openDays : bookableDays).slice(0, todayAny ? 2 : 3);

  const [dateStr, setDateStr] = useState('');
  const isToday = !!today && dateStr === today;
  const day = bookableDays.find((d) => d.dateStr === dateStr);
  const slotOpen = (s: Slot) => (isToday ? todayOpen(s) : !isFull(dateStr, s));
  const dayOpen = (n: 1 | 2) => (isToday ? todayDayOpen(n) : !dayFull(dateStr, n));

  // ----- Draft (refresh / sign-in) and links like /single?diet=veg
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const d = loadDraft<{ step: number; diet: DietType; dateStr: string; slot: Slot; mealsPerDay: 1 | 2; boxSize?: BoxSize }>('single');
    if (d) {
      setDiet(d.diet);
      setDateStr(d.dateStr);
      setSlot(d.slot);
      setMealsPerDay(d.mealsPerDay);
      if (d.boxSize) setBoxSize(d.boxSize);
      setStep(d.step >= 2 ? 2 : 1);
    } else if (profileDiet === 'veg') {
      setDiet('veg');
    }
    const q = new URLSearchParams(window.location.search);
    const qDiet = q.get('diet');
    if (qDiet === 'veg' || qDiet === 'non-veg') {
      setDiet(qDiet);
      setStep(1);
      window.history.replaceState(null, '', window.location.pathname);
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (draftReady) saveDraft('single', { step, diet, dateStr, slot, mealsPerDay, boxSize });
  }, [draftReady, step, diet, dateStr, slot, mealsPerDay, boxSize]);

  // Pick a sensible day once we know what's open: today if it can be done, else the first open day.
  // Also steer off a choice that just closed (cutoff passed, sold out, stale draft).
  useEffect(() => {
    if (!draftReady || !sdLoaded) return;
    const valid = (dateStr === today && todayAny) || futureDays.some((d) => d.dateStr === dateStr);
    if (!valid) { setDateStr(todayAny ? today : futureDays[0]?.dateStr ?? ''); return; }
    if (mealsPerDay === 2 && !dayOpen(2) && dayOpen(1)) { setMealsPerDay(1); return; }
    if (!dayOpen(mealsPerDay)) {
      const next = futureDays.find((d) => !dayFull(d.dateStr, mealsPerDay));
      if (next && next.dateStr !== dateStr) setDateStr(next.dateStr);
      return;
    }
    if (mealsPerDay === 1 && !slotOpen(slot)) setSlot(slot === 'lunch' ? 'dinner' : 'lunch');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, sdLoaded, sd, seats, dateStr, mealsPerDay, slot, diet]);

  // Trial nudge for people who haven't had one (it's cheaper as a first box).
  const [trialOpen, setTrialOpen] = useState(false);
  useEffect(() => {
    if (!isLoggedIn) { setTrialOpen(true); return; }
    myTrialStatus().then((s) => setTrialOpen(!s || s.state === 'available')).catch(() => {});
  }, [isLoggedIn]);

  const menuDate = dateStr || futureDays[0]?.dateStr || '';
  const menus = useMemo(() => ({
    veg: getMenuForDate(menuDate, 'veg'),
    'non-veg': getMenuForDate(menuDate, 'non-veg'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [menuDate, menuVersion]);
  const menu = menus[diet];
  const shownSlot: Slot = mealsPerDay === 2 ? 'lunch' : slot;

  const P = pricingFor(PRICING, boxSize);
  const priceFor = (n: 1 | 2) => P.single[diet] * n - (n === 2 ? P.secondMealDiscount : 0);
  const total = priceFor(mealsPerDay);
  const weeklySaving = P.single[diet] - P.weekly[diet];
  const view = (k: DietType, sz: BoxSize = boxSize) => boxView(menus[k][shownSlot], sz);

  const whenLabel = isToday ? 'Today' : day ? `${day.dayOfWeek}, ${day.formatted}` : '';
  const timeLabel = mealsPerDay === 2 ? 'Lunch & dinner' : slot === 'dinner' ? 'Dinner' : 'Lunch';
  const choiceOk = !!dateStr && (mealsPerDay === 2 ? dayOpen(2) : slotOpen(slot));

  const slotNote = (s: Slot) => {
    if (isToday) {
      if (!sd?.slots[s].open) return `Closed for today · order by ${clock(sd?.slots[s].until ?? '')}`;
      const n = sd.slots[s].left[dbDiet];
      if (n <= 0) return 'Sold out today';
      return `${n <= FEW ? `Only ${n} left · ` : ''}order by ${clock(sd.slots[s].until)} · ${SLOT_TIME[s]}`;
    }
    const n = left(dateStr, s);
    if (n === 0) return 'Fully booked';
    return n !== undefined && n <= FEW ? `Only ${n} left · ${SLOT_TIME[s]}` : SLOT_TIME[s];
  };

  const goToCheckout = () => {
    setCartPlan({
      type: 'single',
      title: `${boxSize === 'lite' ? 'Lite single box' : 'Single box'} · ${diet === 'veg' ? 'Veg' : 'Non-veg'}${isToday ? ' · today' : ''}`,
      mealsPerDay,
      boxSize,
      slot: shownSlot,
      days: [{ date: dateStr, diet: dbDiet }],
      preferences: { isEggFree: false, skipLegume: false },
      estimate: total,
    });
    router.push('/checkout');
  };

  if (step === 1) {
    return (
      <FlowShell
        flow="Single box" step={1} steps={2}
        title="Order a single box"
        subtitle="One fresh box, any day, as often as you like. Same-day delivery when you order early."
        bar={<FlowBar price={inr(total)} note={whenLabel ? `${timeLabel} · ${whenLabel}` : undefined}
          cta="See what's inside" onClick={() => setStep(2)} disabled={!choiceOk} />}
      >
        <BoxSizeSection value={boxSize} onChange={setBoxSize}
          full={{ price: PRICING.single[diet], ...view(diet, 'regular').totals }}
          lite={PRICING.lite ? { price: pricingFor(PRICING, 'lite').single[diet], ...view(diet, 'lite').totals } : null} />

        <Section title="Your diet">
          <div className="grid gap-2" role="radiogroup" aria-label="Diet">
            {(['non-veg', 'veg'] as const).map((k) => {
              const box = view(k);
              const soldOutToday = isToday && !todayDayOpen(1, toDbDiet(k));
              return (
                <OptionCard key={k} selected={diet === k} onClick={() => setDiet(k)}
                  lead={<DietMark kind={k} />}
                  title={k === 'veg' ? 'Veg' : 'Non-veg'}
                  note={soldOutToday ? 'Sold out today: pick tomorrow' : `${g1(box.totals.protein)} g protein · ${Math.round(box.totals.calories)} kcal`}
                />
              );
            })}
          </div>
        </Section>

        <Section title="Day" note={todayAny
          ? `Order by ${clock(sd!.slots.lunch.until)} for lunch or ${clock(sd!.slots.dinner.until)} for dinner today. Sundays closed.`
          : 'Same-day orders: by 9:30 AM for lunch, 5 PM for dinner. Sundays closed.'}>
          <div className="grid grid-cols-3 gap-2">
            {todayAny && (
              <DayChip selected={isToday} onClick={() => setDateStr(today)}
                top="Same day" main="Today"
                sub={new Date(`${today}T12:00:00Z`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' })} />
            )}
            {futureDays.map((d) => {
              const full = dayFull(d.dateStr, mealsPerDay);
              const few = Math.min(...(['lunch', 'dinner'] as const).map((s) => left(d.dateStr, s) ?? FEW + 1).filter((n) => n > 0));
              return (
                <DayChip key={d.dateStr} selected={dateStr === d.dateStr && !full} onClick={() => setDateStr(d.dateStr)} disabled={full}
                  top={full ? 'Full' : few <= FEW ? `${few} left` : undefined}
                  topTone={!full && few <= FEW ? 'warn' : undefined}
                  main={d.dayOfWeek} sub={d.formatted} />
              );
            })}
          </div>
          {sdLoaded && sd && !todayAny && (
            <p className="mt-2 text-xs text-gray-600">Today&apos;s same-day boxes are closed or sold out. Tomorrow is open.</p>
          )}
        </Section>

        <Section title="Meals that day">
          <div className="grid gap-2" role="radiogroup" aria-label="Meals that day">
            <OptionCard selected={mealsPerDay === 1} onClick={() => setMealsPerDay(1)} title="1 meal" note="Lunch or dinner" />
            <OptionCard selected={mealsPerDay === 2} onClick={() => setMealsPerDay(2)} disabled={!!dateStr && !dayOpen(2)}
              title="2 meals" note={dateStr && !dayOpen(2) ? 'Not available this day' : `Lunch and dinner · ₹${P.secondMealDiscount} off the second`} />
          </div>
        </Section>

        <Section title="Delivery time" note={mealsPerDay === 2 ? `Lunch ${SLOT_TIME.lunch} and dinner ${SLOT_TIME.dinner}.` : undefined}>
          {mealsPerDay === 1 && (
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Delivery time">
              {(['lunch', 'dinner'] as const).map((s) => (
                <OptionCard key={s} selected={slot === s} onClick={() => setSlot(s)} disabled={!!dateStr && !slotOpen(s)}
                  title={s === 'lunch' ? 'Lunch' : 'Dinner'} note={slotNote(s)} />
              ))}
            </div>
          )}
        </Section>

        <div className="space-y-2 px-1 text-xs text-gray-600">
          {trialOpen && (
            <p>First order with us? <Link href="/tomorrow" className="font-bold text-accent">Try the trial box</Link> (one per person).</p>
          )}
          {weeklySaving > 0 && (
            <p>Eating with us often? The <Link href="/weekly" className="font-bold text-accent">weekly plan</Link> is {inr(P.weekly[diet])} a box, {inr(weeklySaving)} less than a single box.</p>
          )}
        </div>
      </FlowShell>
    );
  }

  const shown = mealsPerDay === 2 ? viewSlot : slot;
  const box = menu[shown];
  return (
    <FlowShell
      flow="Single box" step={2} steps={2} onBack={() => setStep(1)}
      title={box.items.main.name}
      subtitle={`${boxSize === 'lite' ? 'Lite box · ' : ''}${diet === 'veg' ? 'Veg' : 'Non-veg'} · ${timeLabel} · ${whenLabel}`}
      bar={<FlowBar price={inr(total)} note={isToday ? 'Same-day: pay within 20 minutes' : 'Add sides & juices at checkout'}
        cta="Continue to checkout" onClick={goToCheckout} disabled={!choiceOk} />}
    >
      {isToday && (
        <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs text-gray-800">
          <Zap className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden />
          <p>
            <b>Same-day box.</b> Arrives {shown === 'dinner' ? SLOT_TIME.dinner : SLOT_TIME.lunch} today.
            We hold your box for 20 minutes while you pay.
          </p>
        </div>
      )}
      <Section
        title={mealsPerDay === 2 ? 'Your two boxes' : 'Inside your box'}
        note="Every item weighed on a kitchen scale."
        right={mealsPerDay === 2 ? (
          <Segmented value={viewSlot} onChange={setViewSlot} options={[{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }]} />
        ) : undefined}
      >
        <BoxContents box={box} size={boxSize} />
      </Section>
    </FlowShell>
  );
}
