'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Share2 } from 'lucide-react';
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph';
import { partnerMessage, partnerWhatsappUrl, referralLink } from '@/lib/referral';
import { BRAND } from '@/config/brand';

/** A trainer's code with copy / WhatsApp / share. The link fills the code in at checkout. */
export function PartnerCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);
  const link = referralLink(code);

  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? code : link);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  };
  const share = async () => {
    try { await navigator.share({ title: BRAND.name, text: partnerMessage(code), url: link }); } catch {}
  };

  return (
    <section className="rounded-2xl bg-ink text-white p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-accent-bright">Your partner code</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="flex-1 min-w-0 font-mono font-black text-3xl tracking-[0.15em] truncate">{code}</p>
        <button type="button" onClick={() => copy('code')}
          className="shrink-0 h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold inline-flex items-center gap-1.5">
          {copied === 'code' ? <Check className="w-4 h-4 text-accent-bright" /> : <Copy className="w-4 h-4" />}
          {copied === 'code' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <button type="button" onClick={() => copy('link')}
        className="mt-2 w-full flex items-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/5 px-3 py-2 text-left text-xs text-white/75 hover:bg-white/10">
        <Link2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1">{link.replace(/^https?:\/\//, '')}</span>
        <span className="font-bold text-white shrink-0">{copied === 'link' ? 'Copied' : 'Copy link'}</span>
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={partnerWhatsappUrl(code)} target="_blank" rel="noopener noreferrer"
          className="h-11 rounded-xl bg-[#25D366] hover:brightness-95 text-white text-sm font-bold inline-flex items-center justify-center gap-2">
          <WhatsAppGlyph className="w-5 h-5" /> WhatsApp
        </a>
        <button type="button" onClick={canShare ? share : () => copy('link')}
          className="h-11 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold inline-flex items-center justify-center gap-2">
          <Share2 className="w-4 h-4" /> {canShare ? 'Share' : copied === 'link' ? 'Link copied' : 'Copy link'}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-white/55">Clients who open your link get the code filled in at checkout. New clients get free juices on their first plan.</p>
    </section>
  );
}
