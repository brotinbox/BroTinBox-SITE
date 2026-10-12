import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { Stethoscope, Heart, Scale, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <section className="bg-white border-b border-gray-200 py-14 md:py-20 text-center px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full">
            Our Story & Philosophy
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-gray-900 mt-3 leading-tight">
            Why We Count Every Gram in Coimbatore
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
            Founded by a clinical pharmacist to bridge the gap between traditional Tamil homestyle food and precise athletic macronutrient control.
          </p>
        </div>
      </section>

      {/* Main Narrative */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-10">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm space-y-6 text-sm text-gray-700 leading-relaxed">
          <h2 className="font-heading font-black text-2xl text-gray-900">
            The Problem: Hidden Calories in Daily Food
          </h2>
          <p>
            Coimbatore is a powerhouse city of hardworking entrepreneurs, textile leaders, IT engineers, and sports enthusiasts. But when it comes to food, active people faced two bad choices:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 pl-2">
            <li><strong>Restaurant / Mess Delivery:</strong> Drenched in palm oil or reheated vegetable oil, high sodium, and zero disclosure of calories or protein.</li>
            <li><strong>Bland "Diet Food" Deliveries:</strong> Boiled chicken breast, unseasoned veggies, and tasteless imported salads that no Indian palate can sustain for more than 10 days.</li>
          </ul>

          <h3 className="font-heading font-black text-xl text-gray-900 pt-4">
            Our Pharmacist-Led Solution
          </h3>
          <p>
            Dr. Vigneshwaran K. (Pharm.D), after years of consulting patients on cardiovascular health, metabolic syndrome, and athletic performance, realized that nutrition adherence requires authentic flavor combined with exact measurement.
          </p>
          <p>
            At {BRAND.name}, we didn&apos;t invent new food. We took the meals Coimbatore loves — Chettinad chicken, soft foxtail millet, moringa leaves, tri-dal palak, and fish curry — and instituted strict digital scale raw weighing protocols before cooking.
          </p>

          <div className="p-5 rounded-2xl bg-primary-light/40 border border-primary/20 text-primary-dark">
            <h4 className="font-heading font-bold text-base text-gray-900 mb-1">
              Our 3 Non-Negotiable Kitchen Rules:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs font-semibold">
              <li>Every portion weighed to ±5g on commercial digital scales.</li>
              <li>Only cold-pressed groundnut, sesame, and A2 cow ghee used in calculated portions. Zero palm oil.</li>
              <li>Never served in toxic plastics — all food heat-sealed in BPA-free microwave-safe certified trays.</li>
            </ol>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center pt-4">
          <Link
            href="/build-plan"
            className="inline-flex items-center gap-2 bg-cta hover:bg-cta-hover text-white font-bold text-sm px-8 py-4 rounded-full shadow-lg shadow-cta/25 hover:shadow-xl transition-all tap-active"
          >
            <span>Start Your Healthy Routine in Coimbatore</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
