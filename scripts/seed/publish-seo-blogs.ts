/**
 * Upload the 10-post SEO launch set (scripts/seed/blogs) to public.blog_posts.
 *
 *   npm run seed:blogs -- --dry-run   validate only, no writes, no image spend
 *   npm run seed:blogs                upsert drafts → generate missing covers → publish
 *
 *   npm run seed:blogs:october        same steps for the October 2026 set only
 *
 * Safe to re-run: posts are upserted by slug, covers already on R2 are kept, and
 * published_at is never changed once set, unless the post pins its own date in the
 * manifest. Nothing is published unless every post has a generated R2 cover (the
 * posts cross-link, so they go live together).
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { readingMinutes, renderMarkdown } from '../../lib/content/markdown';
import { generateAndUploadCoverImage } from '../modes/image-prompt';
import { AUTHOR, OCTOBER_2026_POSTS, SEO_POSTS } from './blogs/manifest';

const DRY_RUN = process.argv.includes('--dry-run');
const POSTS = process.argv.includes('--october') ? OCTOBER_2026_POSTS : SEO_POSTS;
const DIR = join(process.cwd(), 'scripts/seed/blogs');
const SCENE_SUFFIX = 'Natural documentary-style photography, realistic lighting, authentic South Indian setting, no watermarks, no text, no logos.';
const SITE_PATHS = new Set(['/', '/menu', '/plans', '/pricing', '/weekly', '/monthly', '/tomorrow', '/delivery-areas', '/blog', '/faq', '/about', '/contact', '/food-safety', '/refund-policy']);

// ─── 1. Validate ────────────────────────────────────────────────────────────
const slugs = new Set(POSTS.map((p) => p.slug));
const linkableSlugs = new Set([...SEO_POSTS, ...OCTOBER_2026_POSTS].map((p) => p.slug));
const problems: string[] = [];
const bodies = new Map<string, string>();

for (const p of POSTS) {
  const md = readFileSync(join(DIR, p.file), 'utf8').trim();
  bodies.set(p.slug, md);
  const at = (msg: string) => problems.push(`${p.slug}: ${msg}`);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) at('invalid slug');
  if (p.published_at && new Date(p.published_at).getTime() > Date.now()) at(`published_at ${p.published_at} is in the future`);
  if (p.seo_title.length > 60) at(`seo_title is ${p.seo_title.length} chars (max 60)`);
  if (p.seo_description.length > 155) at(`seo_description is ${p.seo_description.length} chars (max 155)`);
  if (/^\s*\|.*\|\s*$/m.test(md)) at('contains a markdown table (renderer does not support tables)');
  if (/^#{4,}\s/m.test(md)) at('uses #### headings (renderer supports # to ### only)');

  for (const [, href] of md.matchAll(/\]\(([^)]+)\)/g)) {
    if (href.startsWith('/blog/')) {
      if (!linkableSlugs.has(href.slice(6))) at(`links to unknown post ${href}`);
    } else if (href.startsWith('/')) {
      if (!SITE_PATHS.has(href)) at(`links to unknown page ${href}`);
    } else if (!href.startsWith('https://')) {
      at(`link will not render: ${href}`);
    }
  }
  // Every link must survive the renderer; a dropped link shows up as raw "](" text.
  if (renderMarkdown(md).includes('](')) at('a link did not render');
}

if (problems.length) {
  console.error('❌ Validation failed:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`✅ ${POSTS.length} posts validated (${[...bodies.values()].reduce((n, b) => n + b.split(/\s+/).length, 0)} words).`);
if (DRY_RUN) process.exit(0);

// ─── 2. Upsert drafts ───────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_PUBLIC = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '');
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const hasOwnCover = (url: string | null | undefined) => !!url && !!R2_PUBLIC && url.startsWith(`${R2_PUBLIC}/`);

async function main() {
  const { data: categories, error: catErr } = await supabase.from('blog_categories').select('id, slug');
  if (catErr) throw catErr;
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  const { data: existing, error: exErr } = await supabase
    .from('blog_posts')
    .select('slug, status, published_at, cover_image_url')
    .in('slug', [...slugs]);
  if (exErr) throw exErr;
  const current = new Map(existing.map((r) => [r.slug, r]));

  const rows = POSTS.map((p) => {
    const content = bodies.get(p.slug)!;
    if (!categoryId.has(p.category)) throw new Error(`Unknown category ${p.category}`);
    return {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content,
      category_id: categoryId.get(p.category),
      tags: p.tags,
      author_name: AUTHOR.name,
      author_role: AUTHOR.role,
      read_minutes: readingMinutes(content),
      macros_highlight: p.macros_highlight,
      seo_title: p.seo_title,
      seo_description: p.seo_description,
      is_featured: !!p.is_featured,
    };
  });
  const { error: upErr } = await supabase.from('blog_posts').upsert(rows, { onConflict: 'slug' });
  if (upErr) throw upErr;
  console.log(`💾 Upserted ${rows.length} posts (new ones as drafts).`);

  // ─── 3. Covers ────────────────────────────────────────────────────────────
  const covers = new Map(POSTS.map((p) => [p.slug, current.get(p.slug)?.cover_image_url ?? null]));
  const missing = POSTS.filter((p) => !hasOwnCover(covers.get(p.slug)));

  if (missing.length && !OPENAI_KEY) {
    console.warn(`⚠️  OPENAI_API_KEY is empty: ${missing.length} posts have no cover. They stay as drafts.`);
  } else {
    for (const p of missing) {
      console.log(`\n📸 ${p.slug}`);
      const url = await generateAndUploadCoverImage(p.image_prompt, p.slug, OPENAI_KEY, p.scene ? SCENE_SUFFIX : undefined);
      if (!hasOwnCover(url)) {
        console.warn(`⚠️  No generated cover for ${p.slug} (got fallback). Leaving it as a draft.`);
        continue;
      }
      const { error } = await supabase.from('blog_posts').update({ cover_image_url: url, og_image_url: url }).eq('slug', p.slug);
      if (error) throw error;
      covers.set(p.slug, url);
    }
  }

  // ─── 4. Publish together ──────────────────────────────────────────────────
  const stillMissing = POSTS.filter((p) => !hasOwnCover(covers.get(p.slug))).map((p) => p.slug);
  if (stillMissing.length) {
    console.warn(`\n⏸  Not publishing: ${stillMissing.length} posts still need covers:\n   ${stillMissing.join('\n   ')}\n   Fix the cause and re-run; finished covers are kept.`);
    return;
  }

  // Manifest order = reading order on /blog: first post newest. Existing dates are kept unless pinned.
  const now = Date.now();
  for (const [i, p] of POSTS.entries()) {
    const prev = current.get(p.slug);
    const update = p.published_at
      ? { status: 'published' as const, published_at: new Date(p.published_at).toISOString() }
      : prev?.published_at
        ? { status: 'published' as const }
        : { status: 'published' as const, published_at: new Date(now - i * 60_000).toISOString() };
    const { error } = await supabase.from('blog_posts').update(update).eq('slug', p.slug);
    if (error) throw error;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  console.log(`\n🚀 Published ${POSTS.length} posts. The /blog cache refreshes within 5 minutes.`);
  POSTS.forEach((p) => console.log(`   ${site}/blog/${p.slug}`));
}

main().catch((err) => {
  console.error('\n❌', err.message ?? err);
  process.exit(1);
});
