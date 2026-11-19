import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { catchUpUsage } from '@/lib/stock/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called at 21:05 IST by pg_cron (migration 20261118000053) with
 * "Authorization: Bearer <CRON_SECRET>", 5 minutes after the 9 PM lock.
 * Takes tomorrow's cooking (cook-sheet portions × recipes) off kitchen stock,
 * plus any earlier locked day that was missed. Safe to call again: a day is
 * only posted once.
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization') ?? '';
  if (!secret || secret.length < 32) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return new NextResponse('Unauthorized', { status: 401 });
  try {
    const posted = await catchUpUsage();
    return NextResponse.json({ posted });
  } catch (e) {
    console.error('[cron] stock-usage failed', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
