import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/dashboard';
  return next;
}

// Customers who sign in mid-order go straight back to it; onboarding is optional.
const ORDER_PATHS = ['/checkout', '/tomorrow', '/weekly', '/monthly', '/custom', '/build-plan', '/box/'];

/** OAuth (Google) return URL: exchanges the code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_onboarded, is_blocked')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=blocked`);
  }
  if (!profile?.is_onboarded && !ORDER_PATHS.some((p) => next.startsWith(p))) {
    return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
