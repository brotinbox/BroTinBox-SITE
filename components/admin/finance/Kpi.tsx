import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './Charts';

/** Tiny trend line under a KPI (server-rendered SVG, no JS). */
export function Sparkline({ values, color = '#2A2A2A' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const w = 120, h = 28;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)]);
  // Smooth curve through the points (Catmull-Rom → Bézier).
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 mt-2" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

export function Delta({ pct, goodWhen = 'up' }: { pct: number | null; goodWhen?: 'up' | 'down' }) {
  if (pct == null || !Number.isFinite(pct)) return <span className="text-[11px] text-gray-400">no earlier data</span>;
  const up = pct >= 0;
  const good = Math.abs(pct) < 0.5 ? null : (up === (goodWhen === 'up'));
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-bold',
      good == null ? 'text-gray-500' : good ? 'text-emerald-700' : 'text-rose-700')}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%
      <span className="font-medium text-gray-400 ml-1">vs before</span>
    </span>
  );
}

export function KpiCard({ label, value, format = 'inr', decimals = 0, tone = 'default', delta, spark, sparkColor, hint }: {
  label: string; value: number | null; format?: 'inr' | 'pct' | 'int'; decimals?: number;
  tone?: 'default' | 'good' | 'bad' | 'warn'; delta?: ReactNode; spark?: number[]; sparkColor?: string; hint?: ReactNode;
}) {
  const tones = { default: 'text-gray-900', good: 'text-emerald-700', bad: 'text-rose-700', warn: 'text-amber-700' };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={cn('font-heading font-black text-2xl mt-1 tabular-nums', tones[tone])}>
        {value == null ? '—' : <AnimatedNumber value={value} format={format} decimals={decimals} />}
      </p>
      {delta && <div className="mt-0.5">{delta}</div>}
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      {spark && <div className="mt-auto"><Sparkline values={spark} color={sparkColor} /></div>}
    </div>
  );
}
