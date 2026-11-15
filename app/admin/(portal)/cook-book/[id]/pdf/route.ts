import { z } from 'zod';
import { getStaffContext } from '@/lib/auth/session';
import { loadCookbookDish, loadLogo } from '@/lib/cookbook-pdf/data';
import { renderRecipePdf } from '@/components/admin/pdf/CookbookPdf';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * One recipe as a designed A4 PDF. ?portions=N scales every quantity (same as
 * the recipe page); ?print=1 gives the ink-saving kitchen printer copy.
 * Built fresh on every download, so edits show up straight away.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffContext();
  if (!staff || !staff.can('menu.read')) return new Response('Not found', { status: 404 });

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const p = Number(url.searchParams.get('portions'));
  const portions = Number.isFinite(p) && p > 0 && p <= 1000 ? Math.round(p * 10) / 10 : 1;
  const variant = url.searchParams.get('print') === '1' ? 'print' : 'designed';

  const [dish, logo] = await Promise.all([loadCookbookDish(id, url.origin), loadLogo()]);
  if (!dish) return new Response('Not found', { status: 404 });

  const pdf = await renderRecipePdf({ dish, portions, logo, variant });
  const slug = dish.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || dish.code.toLowerCase();
  const file = `brotin-recipe-${slug}${portions !== 1 ? `-${portions}p` : ''}${variant === 'print' ? '-print' : ''}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${url.searchParams.get('view') === '1' ? 'inline' : 'attachment'}; filename="${file}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
