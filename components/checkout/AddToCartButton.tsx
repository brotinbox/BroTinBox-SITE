'use client';

import { Check, Plus } from 'lucide-react';
import { useAppStore, addonKey } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

/**
 * Adds a side or juice to the cart and stays on the page (the cart bar
 * appears at the bottom). Tapping again when added opens nothing: the
 * quantity is changed in the cart.
 */
export function AddToCartButton({ item, type, label = 'Add', className }: {
  item: { id: string; name: string; price: number; image?: string };
  type: 'side' | 'drink';
  label?: string;
  className?: string;
}) {
  const id = addonKey(item.id);
  const added = useAppStore((s) => s.cartAddons.some((a) => a.id === id));
  const addCartAddon = useAppStore((s) => s.addCartAddon);

  return (
    <button
      type="button"
      onClick={() => { if (!added) addCartAddon({ id, name: item.name, price: item.price, image: item.image, type }); }}
      aria-label={added ? `${item.name} is in your cart` : `Add ${item.name} to cart`}
      className={cn(
        'font-bold text-xs py-2 px-4 rounded-xl tap-active flex items-center gap-1.5 transition-colors',
        added ? 'bg-white text-ink border border-ink' : 'bg-ink hover:bg-ink-soft text-white',
        className
      )}
    >
      {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      <span>{added ? 'In cart' : label}</span>
    </button>
  );
}
