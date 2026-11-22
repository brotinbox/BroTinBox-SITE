/**
 * IndexNow: tells Bing (and Yandex, Seznam, Naver) about new or changed URLs right away.
 * Bing's index also feeds ChatGPT search and Copilot, so this is how new posts reach AI answers fast.
 *
 * The key is public by design: it must be served at <site>/<key>.txt (see public/).
 */
export const INDEXNOW_KEY = '5eaf77a305b0a4358cb2069cbdcdb1db';

export async function submitIndexNow(siteUrl: string, urls: string[]): Promise<{ ok: boolean; status: number }> {
  const base = siteUrl.replace(/\/$/, '');
  const host = new URL(base).host;
  const urlList = [...new Set(urls)].filter((u) => u.startsWith(base)).slice(0, 10_000);
  if (!urlList.length) return { ok: true, status: 204 };
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${base}/${INDEXNOW_KEY}.txt`, urlList }),
  });
  // 200 = accepted, 202 = accepted (key check pending). Anything else is a problem.
  return { ok: res.status === 200 || res.status === 202, status: res.status };
}
