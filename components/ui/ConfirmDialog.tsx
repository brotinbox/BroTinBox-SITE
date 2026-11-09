'use client';

import {
  createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState,
  type MouseEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Pin, rng } from '@/components/ui/pushpin-tear-footer';
import { cn } from '@/lib/utils';

/**
 * "Are you sure?" for anything hard to undo: cancelling, deleting, removing, signing out.
 * Drawn like the site footer: a black poster with paper grain, pinned with the orange
 * pushpin and torn along the bottom to show the sand paper the buttons sit on.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Sign out?', confirmLabel: 'Sign out' }))) return;
 *
 * Submit buttons inside a <form action={serverAction}> use useConfirmClick(opts) as their
 * onClick: it stops the submit, asks, and re-submits the same button on "yes".
 */

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  /** Small orange label above the title. */
  eyebrow?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: the yes button turns orange (cancels, deletes, removals). */
  tone?: 'default' | 'danger';
};
export type ConfirmInput = string | ConfirmOptions;

type Ask = (input: ConfirmInput) => Promise<boolean>;

const toOptions = (input: ConfirmInput): ConfirmOptions => (typeof input === 'string' ? { title: input } : input);

// Without the provider (tests, a stray tree) fall back to the browser's own confirm.
const ConfirmContext = createContext<Ask>(async (input) =>
  typeof window === 'undefined' ? false : window.confirm(toOptions(input).title),
);

export function useConfirm(): Ask {
  return useContext(ConfirmContext);
}

/** onClick for a submit button: ask first, then submit the form with this same button. */
export function useConfirmClick(input?: ConfirmInput) {
  const ask = useConfirm();
  return (e: MouseEvent<HTMLButtonElement>) => {
    if (!input) return;
    e.preventDefault();
    const btn = e.currentTarget;
    // Missing required fields: let the browser point at them instead of asking first.
    if (btn.form && !btn.form.reportValidity()) return;
    void ask(input).then((ok) => {
      if (ok && btn.isConnected) btn.form?.requestSubmit(btn);
    });
  };
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const ask = useCallback<Ask>(
    (input) =>
      new Promise<boolean>((resolve) => {
        setPending((prev) => {
          prev?.resolve(false); // a second ask replaces the first; the first counts as "no"
          return { ...toOptions(input), resolve };
        });
      }),
    [],
  );

  const settle = useCallback((ok: boolean) => {
    setPending((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {mounted && createPortal(
        <AnimatePresence>{pending && <Sheet key="confirm" {...pending} onSettle={settle} />}</AnimatePresence>,
        document.body,
      )}
    </ConfirmContext.Provider>
  );
}

// Brand tokens (tailwind.config.ts) — the same raw colours the footer is given.
const ACCENT = '#EA580C';

/** A torn paper edge: the jagged bottom of the black sheet, with a white fibre rim under it. */
function useTear(seed: number) {
  return useMemo(() => {
    const r = rng(seed);
    const n = 34;
    const ys: number[] = [];
    const rim: number[] = [];
    for (let i = 0; i <= n; i++) {
      const tooth = r() < 0.18 ? 2.4 : 0; // the odd deeper tooth
      ys.push(3 + r() * 4.2 + tooth);
      rim.push(0.6 + r() * 1.3);
    }
    // top edge, then the ridge right-to-left
    const path = (off: number[]) => {
      let d = 'M0,0 H100';
      for (let i = n; i >= 0; i--) d += ` L${((i / n) * 100).toFixed(2)},${(ys[i] + off[i]).toFixed(2)}`;
      return d + ' Z';
    };
    return { sheet: path(ys.map(() => 0)), fibre: path(rim) };
  }, [seed]);
}

function Sheet({ title, message, eyebrow = 'Hold on', confirmLabel = 'Yes, continue', cancelLabel = 'Go back', tone = 'default', onSettle }: Pending & { onSettle: (ok: boolean) => void }) {
  const titleId = useId();
  const msgId = useId();
  const pinId = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const tear = useTear(title.length * 7 + 11);

  // Focus the safe choice, lock the page, Esc backs out, Tab stays inside; give focus back after.
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onSettle(false); }
      if (e.key === 'Tab') {
        e.preventDefault();
        (document.activeElement === cancelRef.current ? confirmRef : cancelRef).current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      back?.focus?.();
    };
  }, [onSettle]);

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/60 backdrop-blur-[3px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onSettle(false)}
      />

      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? msgId : undefined}
        className="relative w-full max-w-sm"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotate: -1.5, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, rotate: 1, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        {/* the pushpin: only the cap and flange show, the needle is in the board */}
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 -top-[26px] z-10 h-[45px] w-10 -translate-x-1/2 overflow-hidden [&_svg]:block [&_svg]:h-20 [&_svg]:w-10"
          initial={reduce ? false : { y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 520, damping: 18 }}
        >
          <Pin base={ACCENT} id={'cd' + pinId} />
        </motion.div>
        <span aria-hidden="true" className="absolute left-1/2 top-[17px] z-[5] h-2 w-9 -translate-x-[30%] rounded-full bg-black/60 blur-[3px]" />

        <div className="overflow-hidden rounded-[28px] bg-sand shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          {/* black poster with the footer's grain */}
          <div className="relative bg-ink px-6 pb-5 pt-10 text-center text-white">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grain opacity-50" />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
            <h2 id={titleId} className="relative mt-2 font-heading text-xl font-extrabold leading-snug">{title}</h2>
            {message && <div id={msgId} className="relative mt-2 text-sm leading-relaxed text-white/70">{message}</div>}
          </div>

          {/* torn edge onto the sand paper */}
          <svg aria-hidden="true" viewBox="0 0 100 12" preserveAspectRatio="none" className="-mt-px block h-5 w-full">
            <path d={tear.fibre} fill="#FFFFFF" />
            <path d={tear.sheet} fill="#121212" />
          </svg>

          <div className="relative flex gap-2.5 bg-sand bg-grain px-5 pb-5 pt-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => onSettle(false)}
              className="flex-1 rounded-full border border-ink/15 bg-white py-3 text-sm font-bold text-ink transition hover:border-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98]"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => onSettle(true)}
              className={cn(
                'flex-1 rounded-full py-3 text-sm font-bold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]',
                tone === 'danger'
                  ? 'bg-accent hover:brightness-110 focus-visible:outline-accent'
                  : 'bg-ink hover:bg-ink-soft focus-visible:outline-ink',
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** Shared copy so every sign-out button asks the same thing. */
export const SIGN_OUT_CONFIRM: ConfirmOptions = {
  eyebrow: 'Signing out',
  title: 'Sign out of BroTin Box?',
  message: 'Your plan and meals stay as they are. You’ll need your phone number to sign back in.',
  confirmLabel: 'Sign out',
  cancelLabel: 'Stay signed in',
};
