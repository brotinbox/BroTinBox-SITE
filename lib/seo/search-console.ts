import 'server-only';
import { createSign } from 'crypto';

/**
 * Google Search Console from the server, using a service account (no user login).
 *
 * Env:
 *   GSC_SERVICE_ACCOUNT_EMAIL  e.g. brotin-seo@<project>.iam.gserviceaccount.com
 *   GSC_SERVICE_ACCOUNT_KEY    the "private_key" from the JSON key file (\n escapes are fine)
 *   GSC_PROPERTY               optional, default sc-domain:brotinbox.com
 *
 * The service account email must be added as a user (Owner) on the property in
 * Search Console → Settings → Users and permissions.
 */
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
const PROPERTY = process.env.GSC_PROPERTY || 'sc-domain:brotinbox.com';

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

export function searchConsoleConfigured(): boolean {
  return !!process.env.GSC_SERVICE_ACCOUNT_EMAIL && !!process.env.GSC_SERVICE_ACCOUNT_KEY;
}

async function accessToken(): Promise<string> {
  const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GSC_SERVICE_ACCOUNT_KEY!.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key).toString('base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${signature}` }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(`GSC token: ${json.error ?? res.status} ${json.error_description ?? ''}`.trim());
  return json.access_token;
}

/** Submit (or resubmit) a sitemap. Google then re-reads it; it does not guarantee indexing. */
export async function submitSitemap(sitemapUrl: string): Promise<void> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const res = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (!res.ok) throw new Error(`GSC submit ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
