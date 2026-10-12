import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Flame,
  Target,
  Utensils,
  Sparkles,
  MapPin,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  MessageCircle,
  Gift,
  Repeat,
  ArrowRight,
} from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { dateLabel, getMyPendingOrders, getMySubscriptions, getUpcomingMeals, inr } from '@/lib/customer/data';
import { AccountShell } from '@/components/account/AccountNav';
import { MealCard } from '@/components/account/MealCard';
import { ProfileProgress } from '@/components/account/ProfileProgress';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getPricingMatrix } from '@/lib/data/catalog';
import { profileCompletion } from '@/lib/customer/profile-completion';
import { hasFssai } from '@/config/legal';

export const metadata = { title: 'My dashboard', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const profile = await requireCustomer('/dashboard');
  const supabase = await getSupabaseServer();

  const [meals, subs, pending, pricing, { count: addressCount }] = await Promise.all([
    getUpcomingMeals(12), getMySubscriptions(), getMyPendingOrders(), getPricingMatrix(),
    supabase.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
  ]);
  const live = subs.filter((s) => s.status === 'active' || s.status === 'paused');
  const upcoming = meals.filter((m) => m.status !== 'skipped' && m.status !== 'paused');
  const firstName = (profile.full_name ?? '').split(' ')[0] || 'there';
  const completion = profileCompletion(profile, (addressCount ?? 0) > 0);
  // Brand-new customer: nothing bought, nothing pending, nothing coming up.
  const isNew = !live.length && !pending.length && !upcoming.length;
  const diet = profile.diet_type === 'veg' ? 'veg' : 'non-veg';

  return (
    <AccountShell current="/dashboard" title={`Hi ${firstName}`} subtitle="Your meals, plan and orders in one place.">
      <div className="space-y-6">
        {pending.map((o) => (
          <Link key={o.id} href={`/checkout/pay/${o.id}`} className="flex items-center gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <span className="flex-1 text-sm text-amber-900">
              <b>Order {o.order_number}</b> ({inr(o.total)}) is waiting for payment
              {(o.metadata as { upi_reference?: string } | null)?.upi_reference ? ' confirmation.' : '. Tap to pay by UPI.'}
            </span>
            <ChevronRight className="w-4 h-4 text-amber-700" />
          </Link>
        ))}

        {isNew && (
          <section className="rounded-3xl bg-[#124233] text-white p-5 sm:p-6">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#C8E88C]">Get started</p>
            <h2 className="font-heading font-black text-xl sm:text-2xl mt-1">How would you like to start?</h2>
            <p className="text-xs text-white/70 mt-1">Fresh, macro-counted meals delivered across Coimbatore. Pay by UPI in under a minute.</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <Link href="/tomorrow" className="group rounded-2xl bg-white text-gray-900 p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow">
                <span className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Gift className="w-4 h-4" /></span>
                  <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">No commitment</span>
                </span>
                <span className="font-heading font-black text-base">Try a Trial Box</span>
                <span className="text-xs text-gray-600">One box tomorrow to taste the food first. {inr(pricing.trial[diet])} per meal.</span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-[#124233]">Order for tomorrow <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
              </Link>
              <div className="rounded-2xl bg-white text-gray-900 p-4 flex flex-col gap-2">
                <span className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-[#E8F1D4] text-[#124233] flex items-center justify-center"><Repeat className="w-4 h-4" /></span>
                  <span className="text-[10px] font-bold bg-[#E8F1D4] text-[#124233] px-2 py-0.5 rounded-full">Best value</span>
                </span>
                <span className="font-heading font-black text-base">Subscribe &amp; save</span>
                <span className="text-xs text-gray-600">Meals 6 days a week, from {inr(pricing.monthly[diet])} per meal. Skip or pause any day.</span>
                <span className="mt-auto grid grid-cols-2 gap-2 pt-1">
                  <Link href="/weekly" className="text-center px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold hover:border-[#124233]">Weekly</Link>
                  <Link href="/monthly" className="text-center px-3 py-2 rounded-xl bg-[#124233] text-white text-xs font-bold hover:bg-[#0E3529]">Monthly</Link>
                </span>
              </div>
            </div>
            <Link href="/pricing" className="inline-block mt-3 text-xs font-bold text-[#C8E88C] hover:underline">Compare all plans →</Link>
          </section>
        )}

        <ProfileProgress percent={completion.percent} missing={completion.missing} href="/profile#body" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#124233]/15 bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Daily targets</p>
            {profile.target_calories ? (
              <p className="font-heading font-black text-xl text-gray-900 mt-1">{profile.target_calories} kcal · {profile.target_protein} g protein</p>
            ) : (
              <Link href="/profile#body" className="block text-sm text-gray-600 mt-1">
                Add age, height and weight to unlock your personal targets. <span className="font-bold text-[#124233]">Add now →</span>
              </Link>
            )}
            <p className="text-xs text-gray-500 mt-0.5 capitalize">Goal: {profile.goal?.replace('-', ' ') ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-[#124233]/15 bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Your plan</p>
            {live.length ? live.map((s) => (
              <Link key={s.id} href="/subscription" className="block mt-1">
                <p className="font-heading font-black text-xl text-gray-900 capitalize">{s.plans?.name ?? `${s.type} plan`}</p>
                <p className="text-xs text-gray-600">
                  {s.status === 'paused' ? `Paused until ${dateLabel(s.paused_until!)}` : `Until ${s.end_date ? dateLabel(s.end_date) : '—'}`} · {s.meals_delivered}/{s.meals_total} delivered
                </p>
              </Link>
            )) : (
              <>
                <p className="text-sm text-gray-600 mt-1">No active plan yet.</p>
                <div className="flex gap-2 mt-2">
                  <Link href="/tomorrow" className="px-3 py-1.5 rounded-lg bg-[#124233] text-white text-xs font-bold">Try a day</Link>
                  <Link href="/weekly" className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold">Weekly</Link>
                  <Link href="/monthly" className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold">Monthly</Link>
                </div>
              </>
            )}
          </div>
        </div>

        {!isNew && <div>
          <div className="flex items-center justify-between pt-2 mb-3">
            <h2 className="font-heading font-black text-lg text-gray-900 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Coming up</h2>
            <Link href="/my-plan" className="text-xs font-bold text-[#124233]">All meals →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
              {pending.length ? 'Your meals appear here once payment is confirmed.' : 'No meals scheduled yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 4).map((m) => <MealCard key={m.id} meal={m} />)}
            </div>
          )}
          <p className="text-[11px] text-gray-500 text-center pt-2">Skip, pause or change any meal until 9 PM the night before. Skipped meals move to the end of your plan.</p>
        </div>}

        {/* Explore & Quick Shortcuts (from Menu Drawer) */}
        <div className="pt-2">
          <h2 className="font-heading font-black text-lg text-gray-900 mb-3">Explore & Quick Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <Link
              href="/menu"
              className="group p-3.5 rounded-2xl bg-white border border-[#124233]/15 hover:border-[#124233] transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-xl bg-[#E8F1D4] text-[#124233] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">Weekly Menu</p>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">Rotating 6-day boxes & macros</p>
              </div>
            </Link>

            <Link
              href="/pricing"
              className="group p-3.5 rounded-2xl bg-white border border-[#124233]/15 hover:border-[#124233] transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">Pricing Plans</p>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">Trial vs Weekly vs Monthly</p>
              </div>
            </Link>

            <Link
              href="/tomorrow"
              className="group p-3.5 rounded-2xl bg-white border border-[#124233]/15 hover:border-[#124233] transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">Trial Box</p>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">Order tomorrow’s test box</p>
              </div>
            </Link>

            <Link
              href="/delivery-areas"
              className="group p-3.5 rounded-2xl bg-white border border-[#124233]/15 hover:border-[#124233] transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">Delivery Areas</p>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">Coimbatore pincodes & slots</p>
              </div>
            </Link>

            <Link
              href="/blog"
              className="group p-3.5 rounded-2xl bg-white border border-[#124233]/15 hover:border-[#124233] transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">Nutrition Blog</p>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">Clinical guides & kitchen secrets</p>
              </div>
            </Link>

            <Link
              href="/faq"
              className="group p-3.5 rounded-2xl bg-white border border-[#124233]/15 hover:border-[#124233] transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">Help & FAQ</p>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">Skip cutoffs, billing & kitchen</p>
              </div>
            </Link>
          </div>
        </div>

        {/* WhatsApp Nutritionist Support & FSSAI Trust Card */}
        <div className="rounded-2xl border border-[#124233]/15 bg-gradient-to-br from-[#E8F1D4]/40 to-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-heading font-black text-sm sm:text-base text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#124233]" />
              Need help with your meals or subscription?
            </p>
            <p className="text-xs text-gray-600">
              Speak directly with our nutrition team in Coimbatore for diet adjustments or delivery changes.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>100% Digitally Weighed{hasFssai() ? ' • FSSAI Licensed Kitchen' : ''}</span>
            </div>
          </div>

          <a
            href="https://wa.me/917604909848?text=Hi%20BroTin%20Box%20Team,%20I%20have%20a%20question%20about%20my%20meal%20plan"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-95"
          >
            <img
              src="https://img.icons8.com/color/480/whatsapp--v1.png"
              alt="WhatsApp"
              className="w-4 h-4 object-contain"
            />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>
    </AccountShell>
  );
}
