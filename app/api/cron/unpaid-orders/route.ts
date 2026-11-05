import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { alertUnpaidOrders } from '@/lib/notifications/unpaid-orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called every 10 minutes by pg_cron (see migration 20261105000027) with
 * "Authorization: Bearer <CRON_SECRET>". Sends Telegram alerts for orders
 * unpaid for 30+ minutes.
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
    return NextResponse.json(await alertUnpaidOrders());
  } catch (e) {
    console.error('[cron] unpaid-orders failed', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
