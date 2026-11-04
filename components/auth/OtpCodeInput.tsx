'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Six digit boxes backed by one real input, so paste, SMS/WhatsApp autofill
 * (autocomplete="one-time-code") and backspace all behave natively.
 */
export const OtpCodeInput = forwardRef<HTMLInputElement, {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}>(function OtpCodeInput({ value, onChange, onComplete, disabled, invalid }, ref) {
  const [focused, setFocused] = useState(true);

  return (
    <div className="relative">
      <div className="grid grid-cols-6 gap-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => {
          const active = focused && !disabled && (i === value.length || (i === 5 && value.length === 6));
          return (
            <div
              key={i}
              className={cn(
                'h-14 rounded-2xl border-2 flex items-center justify-center font-heading font-black text-2xl text-ink bg-white transition-colors',
                invalid ? 'border-rose-300 bg-rose-50' : active ? 'border-ink' : value[i] ? 'border-gray-300' : 'border-gray-200',
              )}
            >
              {value[i] ?? (active ? <span className="w-0.5 h-6 bg-ink animate-pulse" /> : '')}
            </div>
          );
        })}
      </div>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus
        disabled={disabled}
        aria-label="6-digit code"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
          onChange(v);
          if (v.length === 6) onComplete?.(v);
        }}
        className="absolute inset-0 w-full h-full opacity-0 text-base cursor-text"
      />
    </div>
  );
});
