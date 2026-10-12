import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit } from '@/lib/security/ratelimit';

/**
 * Runs before every non-static request.
 *  1. Refreshes the Supabase session cookie (only when one exists).
 *  2. Admin portal: /admin is a 404; /<ADMIN_PATH>/… is rewritten to /admin/….
 *     Signed-out visitors to the portal see only its login page.
 *  3. Customer account pages require a session (optimistic; pages re-check).
 *  4. Per-IP rate limit on API routes and form posts.
 * Authorisation is NOT decided here; server code and RLS do that.
 */

const CUSTOMER_PAGES = ['/dashboard', '/profile', '/orders', '/subscription', '/my-plan', '/progress', '/onboarding', '/checkout'];

function adminPrefix() {
  const p = (process.env.ADMIN_PATH || '').replace(/^\/+|\/+$/g, '');
  return /^[a-z0-9-]{6,64}$/.test(p) ? `/${p}` : null;
}

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL('/__not_found', request.url), { status: 404 });
}

function clientIp(request: NextRequest) {
  return request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const prefix = adminPrefix();

  // --- Rate limit API calls and form/action POSTs per IP ---------------------
  if (pathname.startsWith('/api/') || request.method === 'POST') {
    const r = await rateLimit('global', clientIp(request));
    if (!r.success) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((r.reset - Date.now()) / 1000)) },
      });
    }
  }

  // --- Hide the real admin folder -------------------------------------------
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return notFound(request);
  }

  const isAdmin = !!prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`));
  const adminRest = isAdmin ? pathname.slice(prefix!.length) || '/' : '';

  const isCustomerPage = CUSTOMER_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

  // Anonymous visitors: no Supabase call at all. Keeps public pages fast and
  // free of Set-Cookie so the CDN can serve them from cache.
  if (!hasSession) {
    if (isAdmin) {
      const isLoginPage = adminRest === '/login' || adminRest.startsWith('/login/');
      if (!isLoginPage) {
        const url = request.nextUrl.clone();
        url.pathname = `${prefix}/login`;
        url.search = '';
        return NextResponse.redirect(url);
      }
      const r = NextResponse.rewrite(new URL(`/admin${adminRest}${search}`, request.url));
      r.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      r.headers.set('Cache-Control', 'no-store');
      return r;
    }
    if (isCustomerPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Response we may rewrite; cookies set by Supabase are copied onto it.
  let response = isAdmin
    ? NextResponse.rewrite(new URL(`/admin${adminRest === '/' ? '' : adminRest}${search}`, request.url))
    : NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = isAdmin
            ? NextResponse.rewrite(new URL(`/admin${adminRest === '/' ? '' : adminRest}${search}`, request.url), { request })
            : NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Verifies the JWT and refreshes it if needed.
  const { data: { user } } = await supabase.auth.getUser();

  if (isAdmin) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.headers.set('Cache-Control', 'no-store');
    const isLogin = adminRest === '/login' || adminRest.startsWith('/login/');
    if (!user && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = `${prefix}/login`;
      url.search = '';
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!user && isCustomerPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|json|txt|woff2?)$).*)',
  ],
};
