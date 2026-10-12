import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getBoxes, getBoxBySlug, getSides, getAddons } from '@/lib/api/boxes';
import { BoxDetailClient } from '@/components/menu/BoxDetailClient';

interface BoxPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const boxes = await getBoxes();
  return boxes.map((box) => ({
    slug: box.slug,
  }));
}

export async function generateMetadata({ params }: BoxPageProps): Promise<Metadata> {
  const { slug } = await params;
  const box = await getBoxBySlug(slug);
  if (!box) {
    return { title: 'Box Not Found' };
  }

  return {
    title: `${box.name} (~${box.totals.protein}g Protein, ~${box.totals.calories} kcal) | BroTin Box`,
    description: `${box.description} 5-item measured breakdown. Delivered fresh across Coimbatore.`,
    openGraph: {
      images: [box.image],
    },
  };
}

export default async function BoxDetailPage({ params }: BoxPageProps) {
  const { slug } = await params;
  const [box, sides, addons] = await Promise.all([
    getBoxBySlug(slug),
    getSides(),
    getAddons(),
  ]);

  if (!box) {
    notFound();
  }

  const suggestedSides = sides.filter((s) => (box.suggestedSides || []).includes(s.id));
  const suggestedAddons = addons.filter((a) => (box.suggestedAddons || []).includes(a.id));

  return (
    <BoxDetailClient
      box={box}
      suggestedSides={suggestedSides.length > 0 ? suggestedSides : sides.slice(0, 2)}
      suggestedAddons={suggestedAddons.length > 0 ? suggestedAddons : addons.slice(0, 2)}
    />
  );
}
