'use client';

import { HEARD_FROM, type HeardFromSource } from '@/lib/heard-from';
import { cn } from '@/lib/utils';

export type HeardFromAnswer = { source: HeardFromSource | null; detail: string };

/** Optional "How did you find us?" at checkout. Never required; tap again to unselect. */
export function HeardFromCard({ value, onChange }: { value: HeardFromAnswer; onChange: (v: HeardFromAnswer) => void }) {
  const askDetail = value.source === 'other' || value.source === 'friend' || value.source === 'trainer';
  const detailPrompt =
    value.source === 'friend' ? "Friend's name, if you like. We'd love to thank them 🙂"
    : value.source === 'trainer' ? 'Which trainer or gym?'
    : 'Where did you see us?';

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="font-heading font-bold text-sm text-gray-900">One small favour 🙏 How did you find us?</p>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
        We're a small home kitchen in Coimbatore. Mum cooks, we deliver. Knowing how you found us helps us reach more people like you.
        Optional, one tap.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {HEARD_FROM.map((o) => {
          const on = value.source === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ source: on ? null : o.value, detail: on ? '' : value.detail })}
              className={cn(
                'px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors',
                on ? 'bg-ink text-white border-ink' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400',
              )}
            >
              <span aria-hidden className="mr-1">{o.emoji}</span>{o.label}
            </button>
          );
        })}
      </div>
      {askDetail && (
        <input
          value={value.detail}
          onChange={(e) => onChange({ ...value, detail: e.target.value })}
          maxLength={200}
          placeholder={detailPrompt}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:border-ink focus:outline-none"
        />
      )}
      {value.source && <p className="mt-2 text-[11px] font-semibold text-emerald-700">Thank you! That really helps us. 💛</p>}
    </section>
  );
}
