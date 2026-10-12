import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import {
  NUTRIENT_PILLARS,
  PLACE_PILLARS,
  CONCEPT_PILLARS,
  TIMING_PILLARS,
  FREE_FROM_PILLARS,
  NutrientPillar,
  PlacePillar,
  ConceptPillar,
  TimingPillar,
  FreeFromPillar,
} from './data/blog-pillars';
import { buildPlannerPrompt, BlogPlan } from './modes/planner-prompt';
import { buildWriterPrompt } from './modes/writer-prompt';
import { generateAndUploadCoverImage } from './modes/image-prompt';
import { readingMinutes } from '../lib/content/markdown';

// ─── CONFIGURATION & ENVIRONMENT VALIDATION ──────────────────────────────────
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const PRIMARY_DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash';
const FALLBACK_DEEPSEEK_MODEL = 'deepseek-chat';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in environment (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

if (!DEEPSEEK_API_KEY) {
  console.error('❌ Missing DEEPSEEK_API_KEY in environment. DeepSeek is required for content generation.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Helper: Call DeepSeek Chat API with Automatic Fallback
async function callDeepSeek(systemMessage: string, userMessage: string, jsonMode = false): Promise<string> {
  const models = [PRIMARY_DEEPSEEK_MODEL, FALLBACK_DEEPSEEK_MODEL];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      console.log(`🤖 Querying DeepSeek [${model}]${jsonMode ? ' (JSON Mode)' : ''}...`);
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️  DeepSeek model [${model}] returned ${response.status}: ${errorText}`);
        if (model === PRIMARY_DEEPSEEK_MODEL && PRIMARY_DEEPSEEK_MODEL !== FALLBACK_DEEPSEEK_MODEL) {
          console.log(`🔄 Retrying with fallback model [${FALLBACK_DEEPSEEK_MODEL}]...`);
          continue;
        }
        throw new Error(`DeepSeek API failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('DeepSeek returned empty content');
      return content;
    } catch (err: any) {
      lastError = err;
      if (model === PRIMARY_DEEPSEEK_MODEL && PRIMARY_DEEPSEEK_MODEL !== FALLBACK_DEEPSEEK_MODEL) {
        continue;
      }
    }
  }

  throw lastError || new Error('DeepSeek call failed across all models');
}

// Helper: Sanitize slug to adhere to database constraint: check (slug ~ '^[a-z0-9-]+$')
function sanitizeSlug(rawSlug: string): string {
  return rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

// ─── MASTER GENERATION WORKFLOW ─────────────────────────────────────────────
async function generateBlog() {
  console.log('\n============================================================');
  console.log('🚀 BroTin Box Automated Blog Engine');
  console.log(`   Text Engine:  ${PRIMARY_DEEPSEEK_MODEL} (fallback: ${FALLBACK_DEEPSEEK_MODEL})`);
  console.log(`   Image Engine: ${process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst'} (quality: low, C2PA stripped)`);
  console.log('   Storage:      Cloudflare R2 (zero egress CDN)');
  console.log('============================================================\n');

  // 1. Fetch existing blog posts & categories
  console.log('📦 Fetching existing posts & categories from Supabase...');
  const { data: existingPosts, error: postsErr } = await supabase
    .from('blog_posts')
    .select('slug, title, tags');

  if (postsErr) {
    console.error('❌ Failed to fetch blog_posts:', postsErr.message);
    process.exit(1);
  }

  const { data: categories, error: catErr } = await supabase
    .from('blog_categories')
    .select('id, slug, name');

  if (catErr || !categories || categories.length === 0) {
    console.error('❌ Failed to fetch blog_categories:', catErr?.message);
    process.exit(1);
  }

  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.slug, c.id));
  const existingSlugs = (existingPosts || []).map((p) => p.slug);
  console.log(`Found ${existingSlugs.length} existing articles in database.`);

  // 2. Select Strategic Pillars (including high-intent Free-From search terms)
  const nutrient: NutrientPillar = NUTRIENT_PILLARS[Math.floor(Math.random() * NUTRIENT_PILLARS.length)];
  const place: PlacePillar = PLACE_PILLARS[Math.floor(Math.random() * PLACE_PILLARS.length)];
  const concept: ConceptPillar = CONCEPT_PILLARS[Math.floor(Math.random() * CONCEPT_PILLARS.length)];
  const timing: TimingPillar = TIMING_PILLARS[Math.floor(Math.random() * TIMING_PILLARS.length)];
  const freeFrom: FreeFromPillar = FREE_FROM_PILLARS[Math.floor(Math.random() * FREE_FROM_PILLARS.length)];

  console.log('\n🎯 Selected Strategic Pillars:');
  console.log(`  1. Clean Guarantee: ${freeFrom.name} (${freeFrom.searchKeyword})`);
  console.log(`  2. Nutrient Focus:  ${nutrient.name}`);
  console.log(`  3. Place Target:    ${place.name} (${place.type})`);
  console.log(`  4. Persona/Concept: ${concept.name} (${concept.categorySlug})`);
  console.log(`  5. Meal Timing:     ${timing.name}`);

  // 3. DeepSeek Planning Step
  console.log('\n🧠 [Step 1/4] Running DeepSeek Blog Planner (JSON Mode)...');
  const plannerPrompt = buildPlannerPrompt(nutrient, place, concept, timing, freeFrom, existingSlugs);
  const rawPlanJson = await callDeepSeek(
    'You are an expert clinical nutrition SEO/AEO architect. Output pure, valid JSON.',
    plannerPrompt,
    true
  );

  let plan: BlogPlan;
  try {
    plan = JSON.parse(rawPlanJson);
  } catch (err) {
    console.error('❌ Failed to parse DeepSeek plan JSON:', rawPlanJson);
    throw err;
  }

  // Sanitize and ensure slug uniqueness
  let slug = sanitizeSlug(plan.slug || plan.title);
  if (existingSlugs.includes(slug)) {
    slug = `${slug}-${Math.floor(Math.random() * 900 + 100)}`;
  }

  console.log(`✅ Plan Created:`);
  console.log(`   Title: ${plan.title}`);
  console.log(`   Slug:  ${slug}`);
  console.log(`   Badge: ${plan.macros_highlight}`);

  // 4. DeepSeek Writing Step
  console.log('\n✍️  [Step 2/4] Running DeepSeek Article Writer...');
  const writerPrompt = buildWriterPrompt(plan, place);
  const markdownContent = await callDeepSeek(
    'You are a senior clinical pharmacist and functional South Indian nutrition specialist. Output rich, pure markdown.',
    writerPrompt,
    false
  );

  const readMinutes = readingMinutes(markdownContent);
  console.log(`✅ Content written: ${markdownContent.split(/\s+/).length} words (~${readMinutes} min read).`);

  // 5. OpenAI Image Generation (Low Quality, AI Metadata Stripped) + Cloudflare R2 Upload
  console.log('\n📸 [Step 3/4] Generating Low-Quality Image, Stripping AI Metadata, & Uploading to R2...');
  const coverImageUrl = await generateAndUploadCoverImage(plan.image_prompt, slug, OPENAI_API_KEY);
  console.log(`✅ Cover image URL: ${coverImageUrl}`);

  // 6. Database Insertion into public.blog_posts
  console.log('\n💾 [Step 4/4] Inserting article into Supabase public.blog_posts...');
  const categoryId = categoryMap.get(plan.category_slug) || categories[0].id;

  const newPostData = {
    slug,
    title: plan.title,
    excerpt: plan.excerpt,
    content: markdownContent,
    cover_image_url: coverImageUrl,
    og_image_url: coverImageUrl,
    category_id: categoryId,
    tags: Array.isArray(plan.tags) ? plan.tags.map((t) => t.toLowerCase()) : ['nutrition', 'coimbatore'],
    author_name: plan.author_name,
    author_role: plan.author_role,
    read_minutes: readMinutes,
    macros_highlight: plan.macros_highlight,
    status: 'published' as const,
    published_at: new Date().toISOString(),
    seo_title: plan.seo_title,
    seo_description: plan.seo_description,
    is_featured: false,
    views: 0,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('blog_posts')
    .insert(newPostData)
    .select('id, slug, title')
    .single();

  if (insertErr) {
    console.error('❌ Failed to insert into blog_posts:', insertErr.message);
    process.exit(1);
  }

  console.log('\n🎉 ============================================================');
  console.log('🚀 Blog Post Published Successfully!');
  console.log(`   ID:    ${inserted.id}`);
  console.log(`   Title: ${inserted.title}`);
  console.log(`   Link:  http://localhost:3000/blog/${inserted.slug}`);
  console.log('============================================================\n');
}

generateBlog().catch((err) => {
  console.error('\n❌ Fatal error during blog generation:', err);
  process.exit(1);
});
