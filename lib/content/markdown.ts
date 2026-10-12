/**
 * Minimal, XSS-safe Markdown → HTML for blog posts.
 * All input HTML is escaped first; only these constructs become markup:
 *   # / ## / ### headings, **bold**, *italic*, `code`, [text](https://… or /path),
 *   - / 1. lists, > quotes, blank-line paragraphs, --- rules.
 * Links are limited to http(s) and site-relative URLs.
 */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function inline(s: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]*)\)/g, (_m, text, href) => {
      const external = href.startsWith('http');
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer nofollow"' : ''}>${text}</a>`;
    });
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => {
    if (list) { out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`); list = null; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara(); flushList();
      const level = m[1].length + 1; // # → h2 (page title is h1)
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if (/^---+$/.test(line)) {
      flushPara(); flushList(); out.push('<hr />');
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara(); flushList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      if (list?.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
      list.items.push(m[1]);
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      flushPara();
      if (list?.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
      list.items.push(m[1]);
    } else {
      flushList(); para.push(line.trim());
    }
  }
  flushPara(); flushList();
  return out.join('\n');
}

export function readingMinutes(md: string) {
  return Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200));
}
