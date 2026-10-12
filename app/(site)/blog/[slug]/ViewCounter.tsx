'use client';

import { useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

/** Counts one view per article per browser session. */
export function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const key = `viewed:${slug}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      return;
    }
    getSupabaseBrowser().rpc('increment_blog_view', { p_slug: slug }).then(() => undefined);
  }, [slug]);
  return null;
}
