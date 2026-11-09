import { cn } from '@/lib/utils';

/**
 * Indian food mark: green square + dot for veg, red square + triangle for non-veg.
 * size="sm" (14px) is for chips and inline labels; the dot/triangle scale with
 * the square, so don't shrink it with width/height classes.
 */
export function DietMark({ kind, size = 'md', className }: { kind: 'veg' | 'non-veg'; size?: 'sm' | 'md'; className?: string }) {
  const veg = kind === 'veg';
  const sm = size === 'sm';
  return (
    <span
      role="img"
      aria-label={veg ? 'Veg' : 'Non-veg'}
      className={cn(
        'inline-flex rounded-[3px] items-center justify-center bg-white shrink-0',
        sm ? 'w-3.5 h-3.5 border-[1.5px]' : 'w-4 h-4 sm:w-5 sm:h-5 border-2',
        veg ? 'border-emerald-600' : 'border-red-600',
        className
      )}
    >
      {veg ? (
        <span className={cn('rounded-full bg-emerald-600', sm ? 'w-1.5 h-1.5' : 'w-2 h-2 sm:w-2.5 sm:h-2.5')} />
      ) : (
        <span className={cn(
          'w-0 h-0 border-x-transparent border-b-red-600',
          sm ? 'border-x-[3.5px] border-b-[6px]' : 'border-x-[5px] border-b-[9px] sm:border-x-[6px] sm:border-b-[10px]'
        )} />
      )}
    </span>
  );
}
