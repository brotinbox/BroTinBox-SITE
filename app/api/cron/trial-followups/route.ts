import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runTrialFollowups } from '@/lib/notifications/trial-followups';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called every 30 minutes by pg_cron (migration 20261107000030) with
 * "Authorization: Bearer <CRON_SECRET>". Sends due WhatsApp follow-ups after
 * trial boxes. Does nothing unless TRIAL_FOLLOWUP_MODE is "test" or "on".
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
    return NextResponse.json(await runTrialFollowups());
  } catch (e) {
    console.error('[cron] trial-followups failed', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
