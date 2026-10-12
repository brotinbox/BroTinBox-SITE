'use server';

import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { rateLimit, resetRateLimit } from '@/lib/security/ratelimit';
import { clientIp, userAgent } from '@/lib/security/request';
import { isStaffRole } from '@/lib/auth/permissions';
import { adminHref } from '@/lib/admin/paths';

export type LoginState = { error?: string } | null;

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  website: z.string().max(0).optional(), // honeypot: real users never fill it
});

const GENERIC = 'Invalid email or password.';
const hash = (v: string) => createHash('sha256').update(v).digest('hex').slice(0, 32);

async function audit(action: string, userId: string | null, email: string, ip: string, ua: string) {
  try {
    await getSupabaseService().from('activity_log').insert({
      user_id: userId,
      actor_id: userId,
      actor_role: 'system',
      entity: 'auth',
      action,
      after: { email_hash: hash(email), user_agent: ua },
      ip,
    });
  } catch {
    // Auditing must never block login.
  }
}

export async function staffLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await clientIp();
  const ua = await userAgent();

  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    website: formData.get('website') ?? '',
  });
  if (!parsed.success) return { error: GENERIC };
  const { email, password } = parsed.data;

  const [byIp, byEmail] = await Promise.all([
    rateLimit('staffLogin', `ip:${ip}`),
    rateLimit('staffLogin', `email:${hash(email)}`),
  ]);
  if (!byIp.success || !byEmail.success) {
    await audit('staff_login_rate_limited', null, email, ip, ua);
    return { error: 'Too many attempts. Try again in 15 minutes.' };
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await audit('staff_login_failed', null, email, ip, ua);
    return { error: GENERIC };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_blocked')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.is_blocked || !isStaffRole(profile.role)) {
    await supabase.auth.signOut();
    await audit('staff_login_denied', data.user.id, email, ip, ua);
    return { error: GENERIC };
  }

  await Promise.all([
    resetRateLimit('staffLogin', `email:${hash(email)}`),
    audit('staff_login', data.user.id, email, ip, ua),
    getSupabaseService().from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', data.user.id),
  ]);

  redirect(adminHref('/'));
}

export async function staffLogout() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await audit('staff_logout', data.user.id, data.user.email ?? '', await clientIp(), await userAgent());
  }
  await supabase.auth.signOut();
  redirect(adminHref('/login'));
}
