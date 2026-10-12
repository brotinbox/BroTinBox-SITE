'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';

export type BlogCard = {
  id: string; slug: string; title: string; excerpt: string | null; cover: string | null;
  author: string | null; publishedAt: string | null; minutes: number | null;
  category: { slug: string; name: string } | null;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';

/** Category filter runs in the browser so /blog stays a cached static page. */
export function BlogList({ posts }: { posts: BlogCard[] }) {
  const [category, setCategory] = useState('');
  const categories = [...new Map(posts.flatMap((p) => (p.category ? [[p.category.slug, p.category.name] as const] : []))).entries()];
  const shown = category ? posts.filter((p) => p.category?.slug === category) : posts;
  const [featured, ...rest] = shown;
  const pill = (active: boolean) => `px-3 py-1.5 rounded-full text-xs font-bold border ${active ? 'bg-ink text-white border-ink' : 'bg-white border-gray-200 text-gray-700'}`;

  return (
    <>
      {categories.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <button onClick={() => setCategory('')} className={pill(!category)}>All</button>
          {categories.map(([slug, name]) => <button key={slug} onClick={() => setCategory(slug)} className={pill(category === slug)}>{name}</button>)}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="text-center text-sm text-gray-500 mt-16">New articles are on the way. Check back soon.</p>
      ) : (
        <>
          {featured && (
            <Link href={`/blog/${featured.slug}`} className="mt-10 grid md:grid-cols-2 gap-6 items-center bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {featured.cover && (
                <div className="relative aspect-[16/10] md:aspect-auto md:h-full min-h-56">
                  <Image src={featured.cover} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" priority />
                </div>
              )}
              <div className="p-6">
                {featured.category && <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent">{featured.category.name}</span>}
                <h2 className="font-heading font-black text-2xl text-gray-900 mt-1">{featured.title}</h2>
                {featured.excerpt && <p className="text-sm text-gray-600 mt-2">{featured.excerpt}</p>}
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-2">{featured.author}{featured.author && ' · '}{fmt(featured.publishedAt)} · <Clock className="w-3 h-3" /> {featured.minutes} min</p>
              </div>
            </Link>
          )}
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {p.cover && <div className="relative aspect-[16/10]"><Image src={p.cover} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" /></div>}
                <div className="p-5 flex-1 flex flex-col">
                  {p.category && <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent">{p.category.name}</span>}
                  <h3 className="font-heading font-bold text-lg text-gray-900 mt-1">{p.title}</h3>
                  {p.excerpt && <p className="text-sm text-gray-600 mt-1.5 line-clamp-3">{p.excerpt}</p>}
                  <p className="text-xs text-gray-500 mt-auto pt-3">{fmt(p.publishedAt)} · {p.minutes} min read</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
