import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';

/** "Profile 40% complete" nudge. With `href` it is a link (dashboard); without, a plain banner (profile page). */
export function ProfileProgress({ percent, missing, href }: { percent: number; missing: string[]; href?: string }) {
  if (percent >= 100) return null;
  const body = (
    <>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#E8F1D4] text-[#124233] flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-black text-sm text-gray-900">Your profile is {percent}% complete</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Complete it to get accurate calorie and protein targets matched to your body.
            {missing.length > 0 && <> Still missing: {missing.slice(0, 4).join(', ')}{missing.length > 4 ? '…' : ''}.</>}
          </p>
        </div>
        {href && <ChevronRight className="w-4 h-4 text-[#124233] mt-2.5 shrink-0" />}
      </div>
      <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#124233] rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </>
  );
  const cls = 'block rounded-2xl border border-[#124233]/15 bg-gradient-to-br from-[#E8F1D4]/40 to-white p-4';
  return href ? <Link href={href} className={`${cls} hover:border-[#124233] transition-colors`}>{body}</Link> : <div className={cls}>{body}</div>;
}
