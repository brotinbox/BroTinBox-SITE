import Image from 'next/image';
import { MapPin, Star } from 'lucide-react';
import type { Review } from '@/types';

const SOURCE_LABEL: Record<string, string> = {
  call: 'Told us on a call',
  whatsapp: 'Via WhatsApp',
  in_person: 'Told us at delivery',
  google: 'Google review',
  instagram: 'Via Instagram',
  website: 'Verified customer',
};

/** Real, approved customer reviews. Renders nothing until there's at least one. */
export function CustomerReviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-extrabold uppercase tracking-wider text-primary">From our customers</span>
          <h2 className="font-heading font-black text-lg sm:text-4xl text-gray-900 mt-1">What people are saying</h2>
          <p className="text-gray-600 text-sm mt-2">Real words from people we deliver to in Coimbatore.</p>
        </div>

        <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-2 [scrollbar-width:none]">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="shrink-0 w-[82%] sm:w-[60%] md:w-auto snap-start bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/90 shadow-card flex flex-col"
            >
              <div className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={i < r.rating ? 'w-4 h-4 fill-amber-400 text-amber-400' : 'w-4 h-4 text-gray-200'} />
                ))}
              </div>
              <blockquote className="mt-3 text-sm sm:text-base text-gray-800 leading-relaxed flex-1">“{r.comment}”</blockquote>
              <figcaption className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-ink flex items-center justify-center">
                  {r.avatar ? (
                    <Image src={r.avatar} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <span className="font-heading font-black text-white text-sm">{r.userName.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-bold text-sm text-gray-900 truncate">{r.userName}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    <span>{r.area}</span>
                    {r.goal && <><span>·</span><span>{r.goal}</span></>}
                  </p>
                </div>
                {r.source && SOURCE_LABEL[r.source] && (
                  <span className="ml-auto shrink-0 text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {SOURCE_LABEL[r.source]}
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
