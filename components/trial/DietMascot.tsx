'use client';

import { cn } from '@/lib/utils';

/**
 * Small animated mascots for the diet picker.
 * Non-veg: a drumstick that flexes. Veg: a broccoli that waves its leaf.
 * Idle: gentle float + blink. Selected: a happy bounce.
 */
export function DietMascot({
  kind,
  active,
  size = 'md',
}: {
  kind: 'veg' | 'non-veg';
  active: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('btb-mascot', size === 'sm' && 'btb-mascot--sm', active && 'btb-mascot--active')} aria-hidden="true">
      {kind === 'non-veg' ? <Drumstick /> : <Broccoli />}
      <span className="btb-mascot-shadow" />
      <style>{css}</style>
    </div>
  );
}

function Eyes({ cx1, cx2, cy }: { cx1: number; cx2: number; cy: number }) {
  return (
    <g className="btb-eyes">
      <ellipse cx={cx1} cy={cy} rx="3.2" ry="4" fill="#1a1a1a" />
      <ellipse cx={cx2} cy={cy} rx="3.2" ry="4" fill="#1a1a1a" />
      <circle cx={cx1 + 1} cy={cy - 1.4} r="1.1" fill="#fff" />
      <circle cx={cx2 + 1} cy={cy - 1.4} r="1.1" fill="#fff" />
    </g>
  );
}

function Drumstick() {
  return (
    <svg viewBox="0 0 100 100" className="btb-mascot-svg">
      {/* bone */}
      <g className="btb-bone">
        <rect x="44" y="62" width="12" height="22" rx="5" fill="#f4ead8" stroke="#1a1a1a" strokeWidth="2.5" />
        <circle cx="44" cy="86" r="6" fill="#f4ead8" stroke="#1a1a1a" strokeWidth="2.5" />
        <circle cx="56" cy="86" r="6" fill="#f4ead8" stroke="#1a1a1a" strokeWidth="2.5" />
      </g>
      {/* meat */}
      <path
        d="M50 12c18 0 30 13 30 30 0 15-10 25-22 27H42C30 67 20 57 20 42c0-17 12-30 30-30z"
        fill="#d9480f"
        stroke="#1a1a1a"
        strokeWidth="2.5"
      />
      <path d="M33 30c4-7 11-10 18-10" stroke="#ff8a4c" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* flexing arm */}
      <g className="btb-arm">
        <path d="M78 46c8-2 12-8 12-14" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="90" cy="30" r="4" fill="#d9480f" stroke="#1a1a1a" strokeWidth="2.5" />
      </g>
      <Eyes cx1={42} cx2={58} cy={40} />
      <path d="M44 51c3 4 9 4 12 0" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="36" cy="49" r="3" fill="#ff8a4c" opacity=".8" />
      <circle cx="64" cy="49" r="3" fill="#ff8a4c" opacity=".8" />
    </svg>
  );
}

function Broccoli() {
  return (
    <svg viewBox="0 0 100 100" className="btb-mascot-svg">
      {/* stem */}
      <path d="M40 58h20l-3 30H43z" fill="#a7d989" stroke="#1a1a1a" strokeWidth="2.5" strokeLinejoin="round" />
      {/* florets */}
      <g fill="#2f9e44" stroke="#1a1a1a" strokeWidth="2.5">
        <circle cx="30" cy="42" r="15" />
        <circle cx="70" cy="42" r="15" />
        <circle cx="50" cy="30" r="20" />
        <circle cx="50" cy="50" r="17" />
      </g>
      <circle cx="44" cy="22" r="4" fill="#51cf66" />
      <circle cx="64" cy="34" r="3" fill="#51cf66" />
      {/* waving leaf */}
      <g className="btb-leaf">
        <path d="M58 70c10-2 18 2 22-6-8-6-16-4-22 6z" fill="#51cf66" stroke="#1a1a1a" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <Eyes cx1={43} cx2={57} cy={46} />
      <path d="M45 56c3 3 7 3 10 0" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const css = `
.btb-mascot{position:relative;width:76px;height:76px;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:640px){.btb-mascot{width:96px;height:96px}}
.btb-mascot--sm{width:50px;height:50px}
@media (min-width:640px){.btb-mascot--sm{width:64px;height:64px}}
.btb-mascot-svg{width:100%;height:100%;animation:btb-float 3s ease-in-out infinite;transform-origin:50% 90%;position:relative;z-index:1}
.btb-mascot-shadow{position:absolute;bottom:-2px;left:50%;width:46%;height:6px;margin-left:-23%;border-radius:50%;background:rgba(0,0,0,.12);animation:btb-shadow 3s ease-in-out infinite}
.btb-eyes{animation:btb-blink 4s infinite;transform-origin:50% 45%;transform-box:fill-box}
.btb-arm{transform-origin:78px 46px;transform-box:view-box}
.btb-leaf{transform-origin:58px 70px;transform-box:view-box}
.btb-mascot--active .btb-mascot-svg{animation:btb-hop .9s cubic-bezier(.3,1.6,.5,1) 1, btb-float 3s ease-in-out .9s infinite}
.btb-mascot--active .btb-arm{animation:btb-flex .6s ease-in-out 3}
.btb-mascot--active .btb-leaf{animation:btb-wave .5s ease-in-out 4}
@keyframes btb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes btb-shadow{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(.8);opacity:.7}}
@keyframes btb-hop{0%{transform:translateY(0) scale(1)}30%{transform:translateY(-14px) scale(1.06,.96)}60%{transform:translateY(0) scale(1.05,.92)}100%{transform:translateY(0) scale(1)}}
@keyframes btb-flex{0%,100%{transform:rotate(0)}50%{transform:rotate(-28deg)}}
@keyframes btb-wave{0%,100%{transform:rotate(0)}50%{transform:rotate(-22deg)}}
@keyframes btb-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@media (prefers-reduced-motion:reduce){.btb-mascot *{animation:none!important}}
`;
