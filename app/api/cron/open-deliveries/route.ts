import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { alertOpenDeliveries } from '@/lib/notifications/open-deliveries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called daily at 9 AM IST by pg_cron (migration 20261119000054) with
 * "Authorization: Bearer <CRON_SECRET>". Sends one Telegram list of past
 * meals never marked delivered / failed.
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
    return NextResponse.json(await alertOpenDeliveries());
  } catch (e) {
    console.error('[cron] open-deliveries failed', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
