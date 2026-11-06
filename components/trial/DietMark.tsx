import { cn } from '@/lib/utils';

/** Indian food mark: green square + dot for veg, red square + triangle for non-veg. */
export function DietMark({ kind, className }: { kind: 'veg' | 'non-veg'; className?: string }) {
  const veg = kind === 'veg';
  return (
    <span
      role="img"
      aria-label={veg ? 'Veg' : 'Non-veg'}
      className={cn(
        'inline-flex w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-[3px] items-center justify-center bg-white shrink-0',
        veg ? 'border-emerald-600' : 'border-red-600',
        className
      )}
    >
      {veg ? (
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-600" />
      ) : (
        <span className="w-0 h-0 border-x-[5px] border-x-transparent border-b-[9px] border-b-red-600 sm:border-x-[6px] sm:border-b-[10px]" />
      )}
    </span>
  );
}
