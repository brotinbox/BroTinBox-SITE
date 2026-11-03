import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { ArrowRight, Check, Eye, Target, X } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Why we started ${BRAND.name}, our vision and mission, how we cook and deliver, and how we compare with other meal options in ${BRAND.city}.`,
  alternates: { canonical: '/about' },
};

const PROBLEMS = [
  {
    title: 'Restaurant and mess food',
    body: 'Tasty and easy to order, but you rarely know the calories, the protein or how much oil went in.',
  },
  {
    title: 'Bland diet food',
    body: 'Boiled chicken, plain vegetables and imported salads. The numbers look good, but few people can keep eating it for months.',
  },
];

const STEPS = [
  {
    title: 'You choose your plan',
    body: 'Start with a trial box or take a weekly or monthly plan. Pick veg or non-veg and tell us about any allergies.',
  },
  {
    title: 'We weigh and cook',
    body: 'Every dish follows a standard recipe and is cooked fresh on the day of delivery. Portions are weighed on digital scales.',
  },
  {
    title: 'We show the numbers',
    body: 'We calculate calories, protein, carbs and fat from those weights using Indian food composition data, and show them to you.',
  },
  {
    title: 'We seal and deliver',
    body: `Boxes are sealed and delivered ${BRAND.workingDays.toLowerCase()}. Choose morning (${BRAND.deliverySlots.morning}) or dinner (${BRAND.deliverySlots.dinner}).`,
  },
  {
    title: 'You stay in control',
    body: 'Skip, pause or change a meal until 9:00 PM the night before. Skipped meals become credits at the end of your plan, and plans never renew automatically.',
  },
];

const KITCHEN_RULES = [
  'Every portion is weighed on commercial digital scales.',
  'Cold-pressed groundnut and sesame oils and A2 cow ghee, in measured amounts. No palm oil.',
  'Every meal is sealed in a food-grade, BPA-free tray.',
];

/** BroTin Box is yes on every row. `others` follows the order of COMPETITORS. */
const COMPARISON: { label: string; others: [boolean, boolean, boolean] }[] = [
  { label: 'Calories and protein shown for every meal', others: [false, false, true] },
  { label: 'Portions weighed on digital scales', others: [false, false, true] },
  { label: 'Tamil home-style taste', others: [true, true, false] },
  { label: 'Menu planned by a health professional', others: [false, false, true] },
  { label: 'Protein planned into every box', others: [false, false, true] },
  { label: 'Planned menu, no deciding every day', others: [false, true, true] },
  { label: 'Delivered on a fixed daily schedule', others: [false, true, true] },
  { label: 'Skipped meals become credits', others: [false, false, true] },
];

const COMPETITORS = [
  { short: 'Food apps', full: 'Restaurants & food apps' },
  { short: 'Mess / tiffin', full: 'Local mess & tiffin' },
  { short: 'Diet food', full: 'Diet-food services' },
];

const ROADMAP = [
  {
    stage: 'Where we are now',
    title: 'Starting small',
    body: `We're at the beginning, cooking for our first few customers in ${BRAND.city} and getting the food, portions and delivery right.`,
    current: true,
  },
  {
    stage: 'Next',
    title: 'Our own cloud kitchen',
    body: 'As more people join us, we plan to move into a dedicated cloud kitchen so we can cook for more customers.',
  },
  {
    stage: 'After that',
    title: 'A café alongside the kitchen',
    body: 'We plan to open a café next to our kitchen, so you can walk in and eat the same measured meals.',
  },
  {
    stage: 'Our goal',
    title: 'A restaurant',
    body: 'We plan to open a full restaurant, serving food you love with the numbers still on the table.',
  },
];

function Mark({ yes }: { yes: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${
        yes ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
      }`}
    >
      {yes ? (
        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} aria-hidden="true" />
      ) : (
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} aria-hidden="true" />
      )}
      <span className="sr-only">{yes ? 'Yes' : 'No'}</span>
    </span>
  );
}

function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="max-w-2xl">
      <span className="text-xs font-extrabold uppercase tracking-wider text-accent">{eyebrow}</span>
      <h2 className="font-heading font-black text-2xl sm:text-3xl text-gray-900 mt-1 tracking-tight">{title}</h2>
      {intro && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{intro}</p>}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <section className="bg-white border-b border-gray-200 py-14 md:py-20 text-center px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full">
            About {BRAND.name}
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-gray-900 mt-3 leading-tight">
            Food you enjoy, with every gram counted
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
            We cook Tamil home-style meals in {BRAND.city}, weigh every portion and show you what&apos;s in your box.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-14">
        {/* Why we created it */}
        <section aria-labelledby="why-heading" className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm">
          <span className="text-xs font-extrabold uppercase tracking-wider text-accent">Why we created it</span>
          <h2 id="why-heading" className="font-heading font-black text-2xl sm:text-3xl text-gray-900 mt-1 tracking-tight">
            A diet only works if you can stick to it
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mt-4">
            People in {BRAND.city} who train, work long hours or want to eat better were left with two choices:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {PROBLEMS.map((problem) => (
              <div key={problem.title} className="p-5 rounded-2xl bg-paper border border-gray-200/80">
                <h3 className="font-heading font-bold text-base text-gray-900">{problem.title}</h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{problem.body}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed mt-5">
            <p>
              We started {BRAND.name} to remove that trade-off. We believe good nutrition has to be accurate, and it has to taste good enough to eat every day.
            </p>
            <p>
              So we didn&apos;t invent new food. We took meals people here already love, like Chettinad chicken, foxtail millet, moringa leaves, palak dal and fish curry, and started measuring them properly.
            </p>
          </div>
        </section>

        {/* Vision and mission */}
        <section aria-label="Our vision and mission" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-ink text-white rounded-3xl p-6 sm:p-8">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-accent-bright flex items-center justify-center">
              <Eye className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="font-heading font-black text-xl sm:text-2xl mt-4">Our vision</h2>
            <p className="text-sm sm:text-base text-gray-200 leading-relaxed mt-2">
              A Tamil Nadu where eating for your health never means giving up the food you grew up with.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-ink text-accent-muted flex items-center justify-center">
              <Target className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="font-heading font-black text-xl sm:text-2xl text-gray-900 mt-4">Our mission</h2>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mt-2">
              To cook fresh, measured meals and deliver them to your door, so you can reach your goal without cooking, counting or guessing.
            </p>
          </div>
        </section>

        {/* How we work */}
        <section aria-labelledby="how-heading">
          <div id="how-heading">
            <SectionHeading eyebrow="How we work" title="From our kitchen to your door" />
          </div>
          <ol className="mt-6 space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 bg-white rounded-2xl p-5 border border-gray-200">
                <span className="shrink-0 w-8 h-8 rounded-full bg-ink text-white font-heading font-black text-sm flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-heading font-bold text-base text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 p-5 sm:p-6 rounded-2xl bg-accent-soft border border-accent-muted">
            <h3 className="font-heading font-bold text-base text-gray-900">Our kitchen rules</h3>
            <ul className="mt-3 space-y-2">
              {KITCHEN_RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={3} aria-hidden="true" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Comparison */}
        <section aria-labelledby="compare-heading">
          <div id="compare-heading">
            <SectionHeading
              eyebrow="How we compare"
              title={`Why people choose ${BRAND.name}`}
              intro="Other options do some of this well. We built our service to do all of it."
            />
          </div>
          <div className="mt-6 bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">
                {BRAND.name} compared with restaurants and food apps, local mess and tiffin services, and diet-food services
              </caption>
              <colgroup>
                <col className="w-[36%] sm:w-[40%]" />
                <col className="w-[16%] sm:w-[15%]" />
                <col className="w-[16%] sm:w-[15%]" />
                <col className="w-[16%] sm:w-[15%]" />
                <col className="w-[16%] sm:w-[15%]" />
              </colgroup>
              <thead>
                <tr className="align-bottom">
                  <th scope="col" className="p-3 sm:p-4 text-[11px] sm:text-sm font-bold text-gray-500">
                    What you get
                  </th>
                  <th scope="col" className="px-1 py-3 sm:p-4 text-center text-[10px] sm:text-sm font-black text-white bg-ink leading-tight">
                    {BRAND.name}
                  </th>
                  {COMPETITORS.map((option) => (
                    <th key={option.full} scope="col" className="px-1 py-3 sm:p-4 text-center text-[10px] sm:text-sm font-bold text-gray-600 leading-tight">
                      <span className="sm:hidden">{option.short}</span>
                      <span className="hidden sm:inline">{option.full}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t border-gray-100">
                    <th scope="row" className="p-3 sm:p-4 text-xs sm:text-sm font-semibold text-gray-800 leading-snug">
                      {row.label}
                    </th>
                    <td className="px-1 py-3 sm:p-4 text-center bg-accent-soft">
                      <Mark yes />
                    </td>
                    {row.others.map((yes, index) => (
                      <td key={COMPETITORS[index].full} className="px-1 py-3 sm:p-4 text-center">
                        <Mark yes={yes} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mt-3">
            This shows what is typical for each type of service. Individual businesses vary. Our nutrition values are calculated from weighed recipes, not lab-tested. See{' '}
            <Link href="/food-safety#nutrition" className="underline hover:text-gray-700">
              how we calculate them
            </Link>
            .
          </p>
        </section>

        {/* Roadmap */}
        <section aria-labelledby="roadmap-heading">
          <div id="roadmap-heading">
            <SectionHeading
              eyebrow="Where we're going"
              title="We're just getting started"
              intro="We're in the early stage of building BroTin Box. Our plan is to reach every step below within the next 3 to 4 years."
            />
          </div>
          <ol className="mt-6 ml-3 border-l-2 border-gray-200 space-y-6">
            {ROADMAP.map((step) => (
              <li key={step.title} className="relative pl-6">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${
                    step.current ? 'bg-accent' : 'bg-gray-300'
                  }`}
                />
                <span className={`text-xs font-extrabold uppercase tracking-wider ${step.current ? 'text-accent' : 'text-gray-500'}`}>
                  {step.stage}
                </span>
                <h3 className="font-heading font-bold text-base sm:text-lg text-gray-900 mt-0.5">{step.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Call to action */}
        <div className="text-center">
          <Link
            href="/build-plan"
            className="inline-flex items-center gap-2 bg-cta hover:bg-cta-hover text-white font-bold text-sm px-8 py-4 rounded-full shadow-lg shadow-cta/25 hover:shadow-xl transition-all tap-active"
          >
            <span>Build your meal plan</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
