'use client';

import React, { useState } from 'react';
import { DeliveryZone } from '@/types';
import {
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface DeliveryMapZone extends DeliveryZone {
  lat: number;
  lng: number;
  status: 'active' | 'coming-soon';
  description?: string;
  isKitchenHub?: boolean;
}

export const COIMBATORE_ZONES_WITH_COORDS: DeliveryMapZone[] = [
  // 4 Active Zones
  {
    pincode: '641008',
    area: 'Kuniyamuthur',
    isDeliverable: true,
    avgDeliveryMinutes: 15,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 10.9575,
    lng: 76.9530,
    status: 'active',
    isKitchenHub: true,
    description: 'Central Kitchen Hub (Semmozhi Nagar) • Instant Priority Dispatch',
  },
  {
    pincode: '641001',
    area: 'Ukkadam',
    isDeliverable: true,
    avgDeliveryMinutes: 20,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 10.9880,
    lng: 76.9630,
    status: 'active',
    description: 'Ukkadam Lake & Bypass Corridor • Twice Daily Hot Delivery',
  },
  {
    pincode: '641042',
    area: 'Kovaipudhur',
    isDeliverable: true,
    avgDeliveryMinutes: 20,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 10.9415,
    lng: 76.9360,
    status: 'active',
    description: 'Kovaipudhur Township & Ashram area • Daily insulated delivery',
  },
  {
    pincode: '641024',
    area: 'Sundarapuram',
    isDeliverable: true,
    avgDeliveryMinutes: 20,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 10.9575,
    lng: 76.9850,
    status: 'active',
    description: 'Pollachi Main Road & SIDCO area • Express thermal dispatch',
  },

  // Coming Soon Zones (Next Phases)
  {
    pincode: '641002',
    area: 'RS Puram',
    isDeliverable: false,
    avgDeliveryMinutes: 30,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 11.0089,
    lng: 76.9500,
    status: 'coming-soon',
    description: 'Expansion Phase 2 • Route onboarding soon',
  },
  {
    pincode: '641018',
    area: 'Race Course',
    isDeliverable: false,
    avgDeliveryMinutes: 25,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 11.0038,
    lng: 76.9744,
    status: 'coming-soon',
    description: 'Expansion Phase 2 • Route onboarding soon',
  },
  {
    pincode: '641012',
    area: 'Gandhipuram',
    isDeliverable: false,
    avgDeliveryMinutes: 30,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 11.0183,
    lng: 76.9644,
    status: 'coming-soon',
    description: 'Expansion Phase 2 • Route onboarding soon',
  },
  {
    pincode: '641045',
    area: 'Ramanathapuram',
    isDeliverable: false,
    avgDeliveryMinutes: 30,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 10.9942,
    lng: 76.9936,
    status: 'coming-soon',
    description: 'Expansion Phase 2 • Route onboarding soon',
  },
  {
    pincode: '641011',
    area: 'Saibaba Colony',
    isDeliverable: false,
    avgDeliveryMinutes: 35,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 11.0268,
    lng: 76.9442,
    status: 'coming-soon',
    description: 'Expansion Phase 2 • Route onboarding soon',
  },
  {
    pincode: '641004',
    area: 'Peelamedu',
    isDeliverable: false,
    avgDeliveryMinutes: 35,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 11.0289,
    lng: 77.0097,
    status: 'coming-soon',
    description: 'Expansion Phase 2 • Route onboarding soon',
  },
  {
    pincode: '641005',
    area: 'Singanallur',
    isDeliverable: false,
    avgDeliveryMinutes: 35,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 10.9995,
    lng: 77.0270,
    status: 'coming-soon',
    description: 'Expansion Phase 2 • Route onboarding soon',
  },
  {
    pincode: '641035',
    area: 'Saravanampatti',
    isDeliverable: false,
    avgDeliveryMinutes: 45,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 11.0797,
    lng: 76.9997,
    status: 'coming-soon',
    description: 'IT Corridor • Phase 3 Onboarding',
  },
  {
    pincode: '641041',
    area: 'Vadavalli',
    isDeliverable: false,
    avgDeliveryMinutes: 40,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 11.0232,
    lng: 76.9023,
    status: 'coming-soon',
    description: 'Phase 3 Onboarding',
  },
  {
    pincode: '641006',
    area: 'Ganapathy',
    isDeliverable: false,
    avgDeliveryMinutes: 35,
    slots: ['7:00 AM - 9:00 AM', '7:00 PM - 9:00 PM'],
    lat: 11.0425,
    lng: 76.9754,
    status: 'coming-soon',
    description: 'Phase 3 Onboarding',
  },
];

interface DeliveryCoverageMapProps {
  selectedZone: DeliveryMapZone | null;
  onSelectZone: (zone: DeliveryMapZone | null) => void;
}

export function DeliveryCoverageMap({
  selectedZone,
  onSelectZone,
}: DeliveryCoverageMapProps) {
  const [mapView, setMapView] = useState<'map' | 'satellite' | 'boundary'>('map');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'coming-soon'>('active');

  const activeZones = COIMBATORE_ZONES_WITH_COORDS.filter((z) => z.status === 'active');
  const comingSoonZones = COIMBATORE_ZONES_WITH_COORDS.filter((z) => z.status === 'coming-soon');

  // Google Map embed URL centered on Kuniyamuthur, Coimbatore
  const queryParam = selectedZone
    ? `${encodeURIComponent(selectedZone.area + ', Coimbatore, Tamil Nadu')}`
    : 'Kuniyamuthur,Coimbatore,Tamil+Nadu';

  const mapTypeParam = mapView === 'satellite' ? 'k' : 'm';
  const zoomLevel = selectedZone ? '14' : '13';
  const googleMapEmbedUrl = `https://maps.google.com/maps?q=${queryParam}&t=${mapTypeParam}&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-gray-200 shadow-xl bg-white">
      {/* Top Controls Bar */}
      <div className="p-4 bg-white/95 backdrop-blur-md border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Toggles */}
        <div className="flex items-center gap-1.5 bg-gray-100/90 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setMapView('map')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all tap-active flex items-center gap-1.5 cursor-pointer",
              mapView === 'map'
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Map</span>
          </button>
          <button
            type="button"
            onClick={() => setMapView('satellite')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all tap-active flex items-center gap-1.5 cursor-pointer",
              mapView === 'satellite'
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <span>Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => setMapView('boundary')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all tap-active flex items-center gap-1.5 cursor-pointer",
              mapView === 'boundary'
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Boundary Geofence</span>
          </button>
        </div>

        {/* Right: Active vs Coming Soon Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('active');
              onSelectZone(null);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
              statusFilter === 'active'
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Currently Serving (4 Zones)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('coming-soon');
              onSelectZone(null);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer",
              statusFilter === 'coming-soon'
                ? "bg-gray-800 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <span>Coming Soon ({comingSoonZones.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              onSelectZone(null);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer",
              statusFilter === 'all'
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <span>All Zones ({COIMBATORE_ZONES_WITH_COORDS.length})</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative w-full h-[520px] sm:h-[600px] bg-slate-100 overflow-hidden">
        {/* Layer 1: Google Map Iframe (Active in 'map' and 'satellite' modes) */}
        {mapView !== 'boundary' && (
          <iframe
            title="Kuniyamuthur Coimbatore Delivery Network Google Map"
            src={googleMapEmbedUrl}
            className="w-full h-full border-0 filter saturate-[1.05]"
            loading="lazy"
            allowFullScreen
          />
        )}

        {/* Layer 2: Custom Geofence & Location Boundary Vector Map (Active in 'boundary' mode) */}
        {mapView === 'boundary' && (
          <div className="relative w-full h-full bg-[#0b1c15] text-white overflow-hidden select-none flex items-center justify-center">
            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px), linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
                backgroundSize: '24px 24px, 72px 72px, 72px 72px',
              }}
            />

            {/* SVG Boundaries: Active 4 Zones Geofence (Kuniyamuthur, Ukkadam, Kovaipudhur, Sundarapuram) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1000 700"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <radialGradient id="hubPulse" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="activeGeofenceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
                </linearGradient>
              </defs>

              {/* Active Serving Boundary Polygon: Kuniyamuthur ↔ Kovaipudhur ↔ Sundarapuram ↔ Ukkadam */}
              <polygon
                points="340,430 460,300 620,440 480,560"
                fill="url(#activeGeofenceGrad)"
                stroke="#10b981"
                strokeWidth="3"
                className="animate-pulse"
              />

              {/* Expansion Phase Outer Geofence (Coming Soon) */}
              <polygon
                points="220,520 280,260 490,140 680,180 820,340 760,560 520,640"
                fill="none"
                stroke="#6b7280"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                strokeOpacity="0.35"
              />

              {/* Express Radius Circles from Kitchen Hub (Kuniyamuthur Semmozhi Nagar: ~460, 440) */}
              <circle cx="460" cy="440" r="90" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="4 4" />
              <circle cx="460" cy="440" r="180" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4" />
              <circle cx="460" cy="440" r="140" fill="url(#hubPulse)" />

              {/* Radius Labels */}
              <text x="460" y="340" fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="middle" opacity="0.7">
                CURRENT ACTIVE ZONE (15-20 MINS)
              </text>
              <text x="460" y="245" fill="#9ca3af" fontSize="10" fontWeight="bold" textAnchor="middle" opacity="0.5">
                UPCOMING EXPANSION BOUNDARY
              </text>
            </svg>

            {/* Interactive Markers Overlay */}
            <div className="absolute inset-0 w-full h-full">
              {/* 1. KUNIYAMUTHUR (Kitchen Hub - Semmozhi Nagar) */}
              <div
                style={{ left: '46%', top: '63%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group"
                onClick={() => onSelectZone(COIMBATORE_ZONES_WITH_COORDS[0])}
              >
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-14 h-14 rounded-full bg-emerald-500/35 animate-ping" />
                  <span className="absolute w-9 h-9 rounded-full bg-emerald-500/60" />
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-gray-900 font-black text-xs flex items-center justify-center shadow-xl border-2 border-white">
                    ⭐
                  </div>
                </div>
                <div className="mt-1 px-3 py-1 rounded-full bg-gray-900 text-white text-[11px] font-black border border-amber-400 shadow-lg whitespace-nowrap -translate-x-6">
                  Kuniyamuthur (Semmozhi Nagar Hub)
                </div>
              </div>

              {/* 2. UKKADAM (Active) */}
              <div
                style={{ left: '49%', top: '42%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-25 cursor-pointer group"
                onClick={() => onSelectZone(COIMBATORE_ZONES_WITH_COORDS[1])}
              >
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white border-2 border-white shadow-md flex items-center justify-center group-hover:scale-125 transition-transform">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-white text-gray-900 shadow-md whitespace-nowrap">
                    Ukkadam (641001)
                  </div>
                </div>
              </div>

              {/* 3. KOVAIPUDHUR (Active) */}
              <div
                style={{ left: '33%', top: '68%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-25 cursor-pointer group"
                onClick={() => onSelectZone(COIMBATORE_ZONES_WITH_COORDS[2])}
              >
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white border-2 border-white shadow-md flex items-center justify-center group-hover:scale-125 transition-transform">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-white text-gray-900 shadow-md whitespace-nowrap">
                    Kovaipudhur (641042)
                  </div>
                </div>
              </div>

              {/* 4. SUNDARAPURAM (Active) */}
              <div
                style={{ left: '62%', top: '63%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-25 cursor-pointer group"
                onClick={() => onSelectZone(COIMBATORE_ZONES_WITH_COORDS[3])}
              >
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white border-2 border-white shadow-md flex items-center justify-center group-hover:scale-125 transition-transform">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-white text-gray-900 shadow-md whitespace-nowrap">
                    Sundarapuram (641024)
                  </div>
                </div>
              </div>

              {/* Coming Soon Pins (Subtle Gray Pins) */}
              {comingSoonZones.map((z, idx) => {
                // Projection offsets
                const xOffset = 46 + (z.lng - 76.9530) * 350;
                const yOffset = 63 - (z.lat - 10.9575) * 450;
                const isSelected = selectedZone?.pincode === z.pincode;

                return (
                  <div
                    key={z.pincode}
                    style={{
                      left: `${Math.max(10, Math.min(90, xOffset))}%`,
                      top: `${Math.max(12, Math.min(88, yOffset))}%`,
                    }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all duration-200 group opacity-60 hover:opacity-100",
                      isSelected && "opacity-100 z-30 scale-110"
                    )}
                    onClick={() => onSelectZone(z)}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full bg-gray-600 text-white border border-gray-400 shadow-xs flex items-center justify-center" />
                      <div className="mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-900/80 text-gray-300 border border-gray-700 whitespace-nowrap">
                        {z.area} (Soon)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Floating Top-Left Status Pill */}
        <div className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-gray-100 flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div>
            <span className="text-[11px] font-black text-gray-900 block leading-tight">
              Kuniyamuthur Central Kitchen
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block">
              Serving: Kuniyamuthur • Ukkadam • Kovaipudhur • Sundarapuram
            </span>
          </div>
        </div>

        {/* Floating Bottom-Right Map Legend */}
        <div className="hidden sm:flex absolute bottom-4 right-4 z-30 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-md border border-gray-100 flex-col gap-1.5 text-[11px]">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <span className="w-3 h-3 rounded-full bg-amber-400 border border-white shadow-xs inline-block" />
            <span>Kitchen Hub (Semmozhi Nagar)</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-emerald-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs inline-block" />
            <span>4 Active Delivery Zones</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-gray-400">
            <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
            <span>Coming Soon Zones</span>
          </div>
        </div>

        {/* Selected Zone Interactive Detail Card (Floats at bottom-left) */}
        {selectedZone && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-40 bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                      selectedZone.isDeliverable
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    )}
                  >
                    {selectedZone.isDeliverable ? 'Active Zone • Free Delivery' : 'Coming Soon'}
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-500">
                    {selectedZone.pincode}
                  </span>
                </div>
                <h3 className="font-heading font-black text-lg text-gray-900 mt-1">
                  {selectedZone.area}
                </h3>
                {selectedZone.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedZone.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSelectZone(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold p-1 rounded-full hover:bg-gray-100 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {selectedZone.isDeliverable ? (
              <>
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Avg: ~{selectedZone.avgDeliveryMinutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Free Delivery</span>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-500 font-medium">
                    2 daily hot slots: Morning & Dinner
                  </span>
                  <Link
                    href="/weekly"
                    className="bg-cta hover:bg-cta-hover text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-cta/25 hover:shadow-md transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <span>Order to {selectedZone.area}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  We are expanding our delivery fleet to {selectedZone.area} soon.
                </p>
                <a
                  href={`https://wa.me/917604909848?text=Hi%2C%20I%20would%20like%20to%20request%20BroTin%20Box%20delivery%20in%20${encodeURIComponent(selectedZone.area)}%20(${selectedZone.pincode})`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  <span>Notify Me on WhatsApp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Location Pills Bar */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 overflow-x-auto flex items-center gap-2">
        <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider pl-2 shrink-0 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Active Zones:
        </span>
        {activeZones.map((z) => {
          const isSelected = selectedZone?.pincode === z.pincode;
          return (
            <button
              key={z.pincode}
              type="button"
              onClick={() => onSelectZone(z)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer",
                isSelected
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-white text-gray-800 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50/50"
              )}
            >
              <MapPin className={cn("w-3 h-3", isSelected ? "text-white" : "text-emerald-600")} />
              <span>{z.area}</span>
              <span className={cn("text-[10px] font-mono", isSelected ? "text-white/80" : "text-gray-400")}>
                {z.pincode}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
