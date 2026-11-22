/**
 * Ping IndexNow (Bing, which also feeds ChatGPT search and Copilot) with every URL in the live sitemap.
 *
 *   npm run indexnow            all sitemap URLs
 *   npm run indexnow -- <url>   just these URLs
 *
 * The daily cron (/api/cron/seo-sitemap) already pings new posts; use this after a big content change.
 */
import { submitIndexNow } from '../lib/seo/indexnow';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.brotinbox.com';

async function main() {
  const args = process.argv.slice(2);
  let urls = args;
  if (!urls.length) {
    const xml = await fetch(`${SITE.replace(/\/$/, '')}/sitemap.xml`, { cache: 'no-store' }).then((r) => r.text());
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  }
  console.log(`Submitting ${urls.length} URLs to IndexNow…`);
  const { ok, status } = await submitIndexNow(SITE, urls);
  console.log(ok ? `✅ Accepted (HTTP ${status})` : `❌ Rejected (HTTP ${status}). Is ${SITE}/<key>.txt live?`);
  if (!ok) process.exit(1);
}

main();
