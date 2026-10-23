/**
 * Search Console CLI (OAuth as yourself, no extra dependencies).
 *
 *   npm run gsc -- login                  one-time browser consent
 *   npm run gsc -- sitemaps               list sitemaps + error/warning counts
 *   npm run gsc -- submit [sitemapUrl]    submit sitemap (default: <site>/sitemap.xml)
 *   npm run gsc -- delete <sitemapUrl>    remove a sitemap entry
 *   npm run gsc -- inspect <url>          URL Inspection (index status)
 *   npm run gsc -- queries [days]         top search queries (default 28 days)
 *
 * Needs GSC_CLIENT_ID / GSC_CLIENT_SECRET (Google Cloud "Desktop app" OAuth
 * client) in .env.local. The token is stored outside the repo at
 * ~/.config/brotinbox-gsc.json.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const PROPERTY = process.env.GSC_PROPERTY || 'sc-domain:brotinbox.com';
const SITE = process.env.GSC_SITE_URL || 'https://www.brotinbox.com';
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
const TOKEN_PATH = join(homedir(), '.config', 'brotinbox-gsc.json');
const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}`;

const clientId = process.env.GSC_CLIENT_ID;
const clientSecret = process.env.GSC_CLIENT_SECRET;

type Token = { refresh_token: string; access_token?: string; expires_at?: number };

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId!, client_secret: clientSecret!, ...params }),
  });
  const json: any = await res.json();
  if (!res.ok) die(`OAuth error: ${JSON.stringify(json)}`);
  return json;
}

function login(): Promise<void> {
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId!,
      redirect_uri: REDIRECT,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
    });
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const code = new URL(req.url ?? '/', REDIRECT).searchParams.get('code');
      if (!code) {
        res.end('Waiting for Google…');
        return;
      }
      const json = await tokenRequest({ code, redirect_uri: REDIRECT, grant_type: 'authorization_code' });
      mkdirSync(dirname(TOKEN_PATH), { recursive: true });
      writeFileSync(
        TOKEN_PATH,
        JSON.stringify({ refresh_token: json.refresh_token, access_token: json.access_token, expires_at: Date.now() + json.expires_in * 1000 }),
        { mode: 0o600 },
      );
      res.end('Signed in. You can close this tab.');
      server.close();
      console.log(`Saved token to ${TOKEN_PATH}`);
      resolve();
    });
    server.listen(PORT, '127.0.0.1', () => {
      console.log('Opening browser for Google sign-in…\nIf it does not open, visit:\n' + url);
      execFile('open', [url], () => {});
    });
  });
}

async function accessToken(): Promise<string> {
  if (!existsSync(TOKEN_PATH)) die('Not signed in. Run: npm run gsc -- login');
  const t: Token = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
  if (t.access_token && t.expires_at && t.expires_at > Date.now() + 60_000) return t.access_token;
  const json = await tokenRequest({ refresh_token: t.refresh_token, grant_type: 'refresh_token' });
  t.access_token = json.access_token;
  t.expires_at = Date.now() + json.expires_in * 1000;
  writeFileSync(TOKEN_PATH, JSON.stringify(t), { mode: 0o600 });
  return t.access_token!;
}

async function api(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) die(`${method} ${url} -> ${res.status}\n${text}`);
  return text ? JSON.parse(text) : {};
}

const enc = encodeURIComponent;
const SC = 'https://www.googleapis.com/webmasters/v3/sites';

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (!clientId || !clientSecret) die('Set GSC_CLIENT_ID and GSC_CLIENT_SECRET in .env.local (see docs/SEARCH_CONSOLE.md).');

  switch (cmd) {
    case 'login':
      return login();
    case 'sitemaps': {
      const r = await api('GET', `${SC}/${enc(PROPERTY)}/sitemaps`);
      for (const s of r.sitemap ?? []) console.log(`${s.path}  errors=${s.errors} warnings=${s.warnings} lastDownloaded=${s.lastDownloaded} pending=${s.isPending}`);
      if (!r.sitemap?.length) console.log('No sitemaps.');
      return;
    }
    case 'submit': {
      const url = arg || `${SITE}/sitemap.xml`;
      await api('PUT', `${SC}/${enc(PROPERTY)}/sitemaps/${enc(url)}`);
      return console.log(`Submitted ${url}`);
    }
    case 'delete': {
      if (!arg) die('Usage: delete <sitemapUrl>');
      await api('DELETE', `${SC}/${enc(PROPERTY)}/sitemaps/${enc(arg)}`);
      return console.log(`Deleted ${arg}`);
    }
    case 'inspect': {
      if (!arg) die('Usage: inspect <url>');
      const r = await api('POST', 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { inspectionUrl: arg, siteUrl: PROPERTY });
      const i = r.inspectionResult?.indexStatusResult ?? {};
      return console.log(`${arg}\n  verdict: ${i.verdict}\n  coverage: ${i.coverageState}\n  lastCrawl: ${i.lastCrawlTime}\n  canonical: ${i.googleCanonical}`);
    }
    case 'queries': {
      const days = Number(arg) || 28;
      const end = new Date(Date.now() - 2 * 864e5);
      const start = new Date(end.getTime() - days * 864e5);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const r = await api('POST', `${SC}/${enc(PROPERTY)}/searchAnalytics/query`, { startDate: iso(start), endDate: iso(end), dimensions: ['query'], rowLimit: 25 });
      for (const row of r.rows ?? []) console.log(`${String(row.clicks).padStart(4)} clicks ${String(row.impressions).padStart(6)} impr  pos ${row.position.toFixed(1)}  ${row.keys[0]}`);
      if (!r.rows?.length) console.log('No data yet.');
      return;
    }
    default:
      die('Commands: login | sitemaps | submit [url] | delete <url> | inspect <url> | queries [days]');
  }
}

main();
