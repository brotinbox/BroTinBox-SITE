'use client';

import { useEffect, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent } from 'framer-motion';
import {
  Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ChartPoint } from '@/lib/finance/shared';

/* Colours: revenue = brand ink, cost = brand orange. Profit/loss use the
   reserved good/bad status colours and always carry a +/− sign and a label. */
const INK = '#2A2A2A';
const ORANGE = '#EA580C';
const GOOD = '#059669';
const BAD = '#E11D48';
const GRID = '#EEECE9';
const AXIS = '#6B7280';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const short = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e5 ? `${(a / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L` : a >= 1e3 ? `${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k` : `${Math.round(a)}`;
  return `${n < 0 ? '−' : ''}₹${s}`;
};

/** Number that counts up from 0 when the page opens. */
export function AnimatedNumber({ value, format = 'inr', decimals = 0 }: { value: number; format?: 'inr' | 'pct' | 'int'; decimals?: number }) {
  const mv = useMotionValue(0);
  const [shown, setShown] = useState(0);
  useMotionValueEvent(mv, 'change', setShown);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { mv.set(value); return; }
    const c = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [mv, value]);
  const n = Number(shown.toFixed(decimals));
  if (format === 'pct') return <>{n.toLocaleString('en-IN', { maximumFractionDigits: decimals })}%</>;
  if (format === 'int') return <>{Math.round(n).toLocaleString('en-IN')}</>;
  return <>{n < 0 ? '−' : ''}₹{Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: decimals })}</>;
}

function WaveTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs min-w-40">
      <p className="font-bold text-gray-900 mb-1">{p.label}</p>
      <p className="flex justify-between gap-4 text-gray-600"><span className="flex items-center gap-1.5"><i className="w-2.5 h-0.5 rounded" style={{ background: INK }} />Revenue</span><span className="font-semibold text-gray-900">{inr(p.revenue)}</span></p>
      <p className="flex justify-between gap-4 text-gray-600"><span className="flex items-center gap-1.5"><i className="w-2.5 h-0.5 rounded" style={{ background: ORANGE }} />Cost</span><span className="font-semibold text-gray-900">{inr(p.cost)}</span></p>
      <p className="flex justify-between gap-4 border-t border-gray-100 mt-1 pt-1 text-gray-600">
        <span>{p.profit >= 0 ? 'Profit' : 'Loss'}</span>
        <span className="font-bold" style={{ color: p.profit >= 0 ? GOOD : BAD }}>{p.profit >= 0 ? '+' : '−'}{inr(Math.abs(p.profit))}</span>
      </p>
    </div>
  );
}

/** Revenue and cost as two smooth waves; the gap between them is the profit. */
export function WaveChart({ points }: { points: ChartPoint[] }) {
  const showBrush = points.length > 20;
  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-3" aria-hidden>
        <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 rounded" style={{ background: INK }} />Revenue</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 rounded" style={{ background: ORANGE }} />Cost</span>
        <span className="text-gray-400">Hover a day for profit{showBrush ? ' · drag the handles below to zoom' : ''}</span>
      </div>
      <div className="h-72 max-sm:h-60" role="img" aria-label="Revenue and cost over time">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fin-rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INK} stopOpacity={0.16} />
                <stop offset="100%" stopColor={INK} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fin-cost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity={0.22} />
                <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} tickFormatter={short} width={52} />
            <Tooltip content={<WaveTooltip />} cursor={{ stroke: '#9CA3AF', strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke={INK} strokeWidth={2} fill="url(#fin-rev)"
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} animationDuration={1100} animationEasing="ease-out" />
            <Area type="monotone" dataKey="cost" name="Cost" stroke={ORANGE} strokeWidth={2} fill="url(#fin-cost)"
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} animationDuration={1300} animationEasing="ease-out" />
            {showBrush && <Brush dataKey="label" height={22} stroke="#9CA3AF" travellerWidth={8} tickFormatter={() => ''} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProfitTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-gray-900">{p.label}</p>
      <p className="font-bold mt-0.5" style={{ color: p.profit >= 0 ? GOOD : BAD }}>
        {p.profit >= 0 ? 'Profit +' : 'Loss −'}{inr(Math.abs(p.profit))}
      </p>
    </div>
  );
}

/** Profit per day (green above zero, red below). */
export function ProfitBars({ points }: { points: ChartPoint[] }) {
  return (
    <div className="h-48" role="img" aria-label="Profit or loss per day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} tickFormatter={short} width={52} />
          <ReferenceLine y={0} stroke="#9CA3AF" />
          <Tooltip content={<ProfitTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="profit" radius={[4, 4, 4, 4]} maxBarSize={18} animationDuration={900}>
            {points.map((p) => <Cell key={p.from} fill={p.profit >= 0 ? GOOD : BAD} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
