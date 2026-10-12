'use client';

import React, { useState } from 'react';
import { BRAND } from '@/config/brand';
import { LEGAL, hasFssai } from '@/config/legal';
import { MapPin, Phone, Mail, MessageCircle, Clock, ShieldCheck, Check } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <section className="bg-white border-b border-gray-200 py-12 md:py-16 text-center px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full">
            Contact Support
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-gray-900 mt-3">
            We are here in Coimbatore
          </h1>
          <p className="text-gray-600 text-sm mt-2 max-w-lg mx-auto">
            Reach out for dietary consultations, corporate meal subscriptions, or kitchen questions.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Contact Info & Kitchen */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-heading font-black text-xl text-gray-900">
                Coimbatore Central Kitchen
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {LEGAL.entityName || BRAND.name}{hasFssai() ? ` • FSSAI Lic. ${LEGAL.fssai.licenseNumber}` : ''}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900">Kitchen Address</p>
                  <p className="text-gray-600 mt-0.5">{BRAND.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900">Kitchen Operational Hours</p>
                  <p className="text-gray-600 mt-0.5">Monday to Saturday: 6:00 AM – 9:00 PM</p>
                  <p className="text-gray-400">Sunday: Closed for deep sanitization</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900">Phone Support</p>
                  <p className="text-gray-600 mt-0.5">{BRAND.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900">Email Inquiries</p>
                  <p className="text-gray-600 mt-0.5">{BRAND.supportEmail}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <a
                href={`https://wa.me/${BRAND.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm tap-active"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Instant WhatsApp Concierge</span>
              </a>
            </div>
          </div>

          {/* Right: Message Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
            {submitted ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h3 className="font-heading font-black text-xl text-gray-900">
                  Message Received!
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Thank you, {name}. Our Coimbatore kitchen concierge will respond to your WhatsApp/phone within 2 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-heading font-black text-xl text-gray-900 mb-2">
                  Send a Message
                </h3>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Karthik Ram"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Mobile Number (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 98421 23456"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    How can we help you?
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your fitness goal, delivery area, or diet restrictions..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm tap-active"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
