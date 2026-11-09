'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore, addonKey } from '@/store/useAppStore';
import sidesData from '@/data/sides.json';
import drinksData from '@/data/addons.json';

type Item = { id: string; slug?: string; name: string; price: number; image?: string };
const SIDES = sidesData as Item[];
const DRINKS = drinksData as Item[];
const find = (list: Item[], id: string) => list.find((x) => x.id === id || x.slug === id);

/**
 * Old "Add side / Add drink" links (/build-plan?addSide=… / ?addDrink=…) land
 * here: the item goes into the cart and the customer goes to checkout, which
 * asks for a box first if the cart has none. Prices are re-checked by the server.
 */
function AddToCart() {
  const router = useRouter();
  const params = useSearchParams();
  const addCartAddon = useAppStore((s) => s.addCartAddon);
  const done = useRef(false);

  useEffect(() => {
    // Wait for the persisted cart to load so this item is added to it, not replaced.
    const run = () => {
      if (done.current) return; // effects can run twice (React dev mode)
      done.current = true;
      const side = params.get('addSide');
      const drink = params.get('addDrink');
      const s = side ? find(SIDES, side) : null;
      const d = drink ? find(DRINKS, drink) : null;
      if (s) addCartAddon({ id: addonKey(s.id), name: s.name, price: s.price, image: s.image, type: 'side' });
      if (d) addCartAddon({ id: d.id, name: d.name, price: d.price, image: d.image, type: 'drink' });
      router.replace(s || d ? '/checkout' : '/plans');
    };
    if (useAppStore.persist.hasHydrated()) run();
    else return useAppStore.persist.onFinishHydration(run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Adding to your cart…</div>;
}

export default function BuildPlanPage() {
  return (
    <Suspense fallback={null}>
      <AddToCart />
    </Suspense>
  );
}
