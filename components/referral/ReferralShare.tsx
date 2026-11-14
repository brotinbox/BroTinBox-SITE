'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Gift, Share2 } from 'lucide-react';
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph';
import { referralLink, referralMessage, whatsappShareUrl } from '@/lib/referral';
import { BRAND } from '@/config/brand';

/** The signed-in customer's referral code with copy / WhatsApp / share buttons. */
export function ReferralShare({ code, compact = false }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);

  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? code : referralLink(code));
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  };
  const share = async () => {
    try { await navigator.share({ title: BRAND.name, text: referralMessage(code), url: referralLink(code) }); } catch {}
  };

  return (
    <div id="refer" className="scroll-mt-24 rounded-2xl bg-ink text-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0"><Gift className="w-5 h-5" /></span>
        <div className="min-w-0">
          <p className="font-heading font-black text-base sm:text-lg">Refer & earn</p>
          <p className="text-xs sm:text-sm text-white/75 leading-snug">
            Your friend gets a free juice. So do you.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 min-w-0 rounded-xl border border-dashed border-white/30 bg-white/5 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Your code</p>
          <p className="font-mono font-black text-lg tracking-[0.2em] truncate">{code}</p>
        </div>
        <button type="button" onClick={() => copy('code')}
          className="shrink-0 h-[58px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold inline-flex flex-col items-center justify-center gap-1">
          {copied === 'code' ? <Check className="w-4 h-4 text-accent-bright" /> : <Copy className="w-4 h-4" />}
          {copied === 'code' ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={whatsappShareUrl(code)} target="_blank" rel="noopener noreferrer"
          className="h-11 rounded-xl bg-[#25D366] hover:brightness-95 text-white text-sm font-bold inline-flex items-center justify-center gap-2">
          <WhatsAppGlyph className="w-5 h-5" /> WhatsApp
        </a>
        {canShare ? (
          <button type="button" onClick={share}
            className="h-11 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold inline-flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> Share
          </button>
        ) : (
          <button type="button" onClick={() => copy('link')}
            className="h-11 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold inline-flex items-center justify-center gap-2">
            {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied === 'link' ? 'Link copied' : 'Copy link'}
          </button>
        )}
      </div>

      {!compact && (
        <p className="mt-3 text-[11px] text-white/50">
          <a href="#terms" onClick={() => { const d = document.getElementById('terms'); if (d instanceof HTMLDetailsElement) d.open = true; }} className="underline underline-offset-2 hover:text-white">T&C apply</a>
        </p>
      )}
      {compact && (
        <a href="/refer" className="mt-3 inline-block text-[11px] text-white/60 underline underline-offset-2 hover:text-white">How it works · T&C apply</a>
      )}
    </div>
  );
}
