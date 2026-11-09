import Link from 'next/link';
import { ChevronRight, Clock, Gift, MessageCircle, Smartphone, Target, Wallet } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { phoneOtpMode } from '@/lib/auth/otp-mode';
import { dateLabel, dayWord, getMyPendingOrders, getMySubscriptions, getUpcomingMeals, inr, type UpcomingMeal } from '@/lib/customer/data';
import { todayIST } from '@/lib/menu/rotation';
import { AccountShell } from '@/components/account/AccountNav';
import { Btn, CustomerForm } from '@/components/account/forms';
import { skipMeal } from '@/lib/customer/actions';
import { getPricingMatrix, getTrialOffer } from '@/lib/data/catalog';
import { getMyTrialStatus, type MyTrialStatus } from '@/lib/checkout/trial';
import { TrialStatusCard } from '@/components/trial/TrialStatusCard';
import { DietMark } from '@/components/trial/DietMark';
import { SLOT_TIME } from '@/lib/meal-display';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/utils';

export const metadata = { title: 'My dashboard', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, { text: string; tone: 'live' | 'done' | 'plain' | 'warn' }> = {
  scheduled: { text: 'Scheduled', tone: 'plain' },
  locked: { text: 'Being cooked', tone: 'live' },
  preparing: { text: 'Being cooked', tone: 'live' },
  packed: { text: 'Packed', tone: 'live' },
  out_for_delivery: { text: 'On the way', tone: 'live' },
  delivered: { text: 'Delivered', tone: 'done' },
  failed: { text: 'Delivery issue', tone: 'warn' },
};
const TONE = {
  live: 'bg-orange-50 text-orange-700 border-orange-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-rose-50 text-rose-700 border-rose-200',
  plain: 'bg-sand text-ink border-ink/15',
};

function nextWhen(date: string) {
  const w = dayWord(date);
  return w === 'Today' || w === 'Tomorrow' ? w.toLowerCase() : `on ${w}`;
}
const slotLine = (m: UpcomingMeal) => `${m.slot === 'lunch' ? 'Lunch' : 'Dinner'} · ${SLOT_TIME[m.slot]}`;
const dishName = (m: UpcomingMeal) => m.menu?.dishes[0]?.name ?? (m.diet === 'veg' ? 'Veg box' : 'Non-veg box');
const dietKind = (m: UpcomingMeal) => (m.diet === 'veg' ? 'veg' : 'non-veg') as 'veg' | 'non-veg';

export default async function DashboardPage() {
  const profile = await requireCustomer('/dashboard');

  const [meals, subs, pending, pricing, trialOffer, trial, otpMode] = await Promise.all([
    getUpcomingMeals(12), getMySubscriptions(), getMyPendingOrders(), getPricingMatrix(), getTrialOffer(),
    getMyTrialStatus(profile.id).catch((): MyTrialStatus => ({ state: 'available' })),
    phoneOtpMode(),
  ]);
  const today = todayIST();
  // A plan past its last day is over, even before the nightly job marks it completed.
  const live = subs.filter((s) => (s.status === 'active' || s.status === 'paused') && !(s.end_date && s.end_date < today));
  const upcoming = meals.filter((m) => m.status !== 'skipped' && m.status !== 'paused');
  const next = upcoming[0];
  const later = upcoming.slice(1, 4);
  const firstName = (profile.full_name ?? '').split(' ')[0] || 'there';
  const diet = profile.diet_type === 'veg' ? 'veg' : 'non-veg';
  const trialUsed = trial.state === 'used';
  const hasPlanOrMeals = live.length > 0 || upcoming.length > 0;
  // Trial booked/used and nothing else going on: the trial card is the next step.
  const showTrialCard = trial.state !== 'available' && !hasPlanOrMeals;

  const subtitle = next
    ? `Your next box arrives ${nextWhen(next.delivery_date)}, ${next.slot}.`
    : pending.length ? 'One step left: finish your payment.'
    : live.length ? 'Your plan is set. Meals show up here.'
    : 'Fresh, weighed meals delivered in Coimbatore.';

  return (
    <AccountShell current="/dashboard" title={`Hi ${firstName} 👋`} subtitle={subtitle}>
      <div className="space-y-4">
        {/* Things to do: only when they apply */}
        {pending.map((o) => {
          const waiting = !!(o.metadata as { upi_reference?: string } | null)?.upi_reference;
          return (
            <Link key={o.id} href={`/checkout/pay/${o.id}`} className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 tap-active">
              <span className="w-9 h-9 rounded-xl bg-white text-amber-700 flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-amber-950">{waiting ? 'Checking your payment' : `Pay ${inr(o.total)} to confirm`}</span>
                <span className="block text-xs text-amber-800">Order {o.order_number}{waiting ? ' · we’ll confirm shortly' : ' · your meals start once paid'}</span>
              </span>
              {!waiting && <span className="shrink-0 rounded-xl bg-ink text-white text-xs font-bold px-3 py-2">Pay now</span>}
            </Link>
          );
        })}

        {!profile.phone_verified && otpMode !== 'off' && (
          <Link href="/profile/details" className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 tap-active">
            <span className="w-9 h-9 rounded-xl bg-sand text-ink flex items-center justify-center shrink-0"><Smartphone className="w-4 h-4" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-gray-900">Verify your mobile</span>
              <span className="block text-xs text-gray-500">Get delivery updates on WhatsApp</span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </Link>
        )}

        {/* Hero: next box, or how to start */}
        {next ? (
          <NextBoxCard meal={next} />
        ) : showTrialCard ? (
          <TrialStatusCard status={trial} />
        ) : !hasPlanOrMeals && !pending.length ? (
          <section className="space-y-2.5">
            <h2 className="font-heading font-bold text-sm text-gray-900 px-1">Start eating better</h2>
            {!trialUsed && (
              <Link href="/tomorrow" className="flex items-center gap-3 rounded-2xl border border-ink/15 bg-white p-4 tap-active">
                <span className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><Gift className="w-5 h-5" /></span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-heading font-black text-base text-gray-900">Trial box</span>
                    {trialOffer?.label && <span className="text-[10px] font-extrabold uppercase tracking-wide text-orange-700 bg-orange-50 rounded-full px-2 py-0.5">{trialOffer.label}</span>}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">Taste it first. One box, no commitment.</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block font-heading font-black text-base text-ink">{inr(pricing.trial[diet])}</span>
                  {trialOffer && <s className="block text-[11px] text-gray-400">{inr(trialOffer.regular[diet])}</s>}
                </span>
              </Link>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <PlanTile href="/weekly" title="Weekly" note="6 days" price={inr(pricing.weekly[diet])} />
              <PlanTile href="/monthly" title="Monthly" note="26 days" price={inr(pricing.monthly[diet])} badge="Best value" />
            </div>
          </section>
        ) : null}

        {/* Plan progress */}
        {live.map((s) => {
          const pct = s.meals_total ? Math.min(100, Math.round((s.meals_delivered / s.meals_total) * 100)) : 0;
          const left = Math.max(0, s.meals_total - s.meals_delivered);
          return (
            <Link key={s.id} href="/subscription" className="block rounded-2xl border border-gray-200 bg-white p-4 tap-active">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-sand text-ink flex items-center justify-center shrink-0"><Wallet className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-gray-900 capitalize truncate">{s.plans?.name ?? `${s.type} plan`}</span>
                  <span className="block text-xs text-gray-500">
                    {s.status === 'paused' ? `Paused until ${dateLabel(s.paused_until!)}` : `${left} meal${left === 1 ? '' : 's'} left${s.end_date ? ` · till ${dateLabel(s.end_date)}` : ''}`}
                  </span>
                </span>
                <span className="text-xs font-bold text-ink shrink-0">Manage</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} /></div>
              <p className="mt-1.5 text-[11px] text-gray-500">{s.meals_delivered} of {s.meals_total} delivered</p>
            </Link>
          );
        })}

        {/* Coming up */}
        {later.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="font-heading font-bold text-sm text-gray-900">Coming up</h2>
              <Link href="/my-plan" className="text-xs font-bold text-ink">See all</Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {later.map((m) => (
                <li key={m.id}>
                  <Link href="/my-plan" className="flex items-center gap-3 px-4 py-3">
                    <MealThumb meal={m} size="sm" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-gray-900 truncate">{dishName(m)}</span>
                      <span className="block text-xs text-gray-500">{dayWord(m.delivery_date)} · {m.slot === 'lunch' ? 'Lunch' : 'Dinner'}</span>
                    </span>
                    {m.menu && <span className="text-xs font-semibold text-gray-500 shrink-0">{Math.round(m.menu.protein)} g protein</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Daily target: one line */}
        {profile.target_calories ? (
          <Link href="/profile/body" className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 tap-active">
            <span className="w-9 h-9 rounded-xl bg-accent-soft text-ink flex items-center justify-center shrink-0"><Target className="w-4 h-4" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-gray-900">{profile.target_calories} kcal · {profile.target_protein} g protein</span>
              <span className="block text-xs text-gray-500">Your daily target</span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </Link>
        ) : (
          <Link href="/profile/body" className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3.5 tap-active">
            <span className="w-9 h-9 rounded-xl bg-accent-soft text-ink flex items-center justify-center shrink-0"><Target className="w-4 h-4" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-gray-900">Get your daily protein target</span>
              <span className="block text-xs text-gray-500">Add age, height and weight. Takes 30 seconds.</span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </Link>
        )}

        <a href={`${BRAND.socials.whatsapp}?text=${encodeURIComponent('Hi BroTin Box! I have a question about my meals.')}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 tap-active">
          <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><MessageCircle className="w-4 h-4" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-gray-900">Need help?</span>
            <span className="block text-xs text-gray-500">Chat with us on WhatsApp</span>
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </a>
      </div>
    </AccountShell>
  );
}

function MealThumb({ meal, size }: { meal: UpcomingMeal; size: 'sm' | 'lg' }) {
  const img = meal.menu?.dishes[0]?.image_url;
  const box = size === 'lg' ? 'w-full aspect-[16/9] rounded-xl' : 'w-12 h-12 rounded-xl';
  return img ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img} alt={dishName(meal)} loading="lazy" className={cn(box, 'object-cover bg-gray-100 shrink-0')} />
  ) : (
    <span className={cn(box, 'bg-sand flex items-center justify-center shrink-0')}>
      <DietMark kind={dietKind(meal)} size={size === 'lg' ? undefined : 'sm'} />
    </span>
  );
}

/** Swiggy-style "your order" card for the next box. */
function NextBoxCard({ meal }: { meal: UpcomingMeal }) {
  const st = STATUS[meal.status] ?? { text: meal.status, tone: 'plain' as const };
  const sides = meal.menu?.dishes.slice(1).map((d) => d.name).join(' · ');
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-3 space-y-3">
      <div className="relative">
        <MealThumb meal={meal} size="lg" />
        <span className={cn('absolute top-2 left-2 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm', TONE[st.tone])}>{st.text}</span>
        {meal.box_size === 'lite' && <span className="absolute top-2 right-2 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/95 text-ink shadow-sm">Lite box</span>}
      </div>
      <div className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">Next box · {dayWord(meal.delivery_date)}</p>
        <h2 className="font-heading font-black text-lg text-ink mt-0.5 flex items-center gap-2">
          <DietMark kind={dietKind(meal)} size="sm" /> <span className="truncate">{dishName(meal)}</span>
        </h2>
        {sides && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{sides}</p>}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="text-[11px] font-bold rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">{slotLine(meal)}</span>
          {meal.menu && <span className="text-[11px] font-bold rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">{meal.menu.calories} kcal</span>}
          {meal.menu && <span className="text-[11px] font-bold rounded-full bg-accent-soft text-ink px-2.5 py-1">{Math.round(meal.menu.protein)} g protein</span>}
          {meal.addons.length > 0 && <span className="text-[11px] font-bold rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">+ {meal.addons.join(', ')}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 px-1 pb-1">
        {meal.editable && meal.status === 'scheduled' ? (
          <CustomerForm action={skipMeal} className="flex-1">
            <input type="hidden" name="delivery_id" value={meal.id} />
            <input type="hidden" name="undo" value="false" />
            <Btn variant="ghost" className="w-full py-2.5"
              confirm={{ eyebrow: 'Skip meal', title: 'Skip this meal?', message: 'It moves to the end of your plan, so you don’t lose it. You can undo until 9 PM the night before.', confirmLabel: 'Skip it', cancelLabel: 'Keep this meal' }}>
              Skip
            </Btn>
          </CustomerForm>
        ) : (
          <p className="flex-1 text-[11px] text-gray-500">{meal.status === 'scheduled' ? 'Changes closed at 9 PM last night.' : 'Fresh from our kitchen.'}</p>
        )}
        <Link href="/my-plan" className="flex-1 text-center rounded-xl bg-ink text-white text-xs font-bold py-2.5">My meals</Link>
      </div>
    </section>
  );
}

function PlanTile({ href, title, note, price, badge }: { href: string; title: string; note: string; price: string; badge?: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-gray-200 bg-white p-4 tap-active flex flex-col gap-0.5">
      <span className="flex items-center justify-between gap-1">
        <span className="font-heading font-black text-base text-gray-900">{title}</span>
        {badge && <span className="text-[10px] font-extrabold uppercase tracking-wide text-ink bg-accent-soft rounded-full px-2 py-0.5">{badge}</span>}
      </span>
      <span className="text-xs text-gray-500">{note} · free delivery</span>
      <span className="mt-1.5 text-sm text-gray-900"><b className="font-heading font-black">{price}</b><span className="text-xs text-gray-500"> / meal</span></span>
    </Link>
  );
}
