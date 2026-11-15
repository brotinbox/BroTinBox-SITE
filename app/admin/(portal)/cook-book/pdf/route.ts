import { getStaffContext } from '@/lib/auth/session';
import { loadCookbook, loadLogo } from '@/lib/cookbook-pdf/data';
import { renderCookbookPdf } from '@/components/admin/pdf/CookbookPdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * The whole cook book: cover, contents with page numbers, then every active
 * dish (1 portion each). ?print=1 gives the ink-saving printer copy.
 */
export async function GET(request: Request) {
  const staff = await getStaffContext();
  if (!staff || !staff.can('menu.read')) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const variant = url.searchParams.get('print') === '1' ? 'print' : 'designed';
  const [dishes, logo] = await Promise.all([loadCookbook(url.origin), loadLogo()]);
  const pdf = await renderCookbookPdf({ dishes, logo, variant });

  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const file = `brotin-cookbook-${day}${variant === 'print' ? '-print' : ''}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${url.searchParams.get('view') === '1' ? 'inline' : 'attachment'}; filename="${file}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
