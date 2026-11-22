// Rotating blog cover styles, so the /blog grid does not look like 30 food photos in a row.
// Each post gets a style from its position in its set (or a pinned `cover_style` in the manifest).
// Text styles (quote, meme) need a short `cover_text`; without one the post falls back to a photo.
// Quality stays low (OPENAI_IMAGE_QUALITY), so text is kept to a few words to limit misspellings.

export type CoverStyle = 'realistic' | 'scenario' | 'still-life' | 'quote' | 'meme';

export const COVER_ROTATION: CoverStyle[] = ['realistic', 'scenario', 'still-life', 'quote', 'meme'];

const NEEDS_TEXT: ReadonlySet<CoverStyle> = new Set(['quote', 'meme']);

const NO_BRANDS = 'No logos, no brand names, no watermarks, no real or famous people.';

export interface CoverInput {
  title: string;
  image_prompt: string;
  scene?: boolean;
  cover_style?: CoverStyle;
  cover_text?: string;
}

/** Style for the post at `index` in its set: pinned style wins, text styles need cover_text. */
export function pickCoverStyle(post: CoverInput, index: number): CoverStyle {
  if (post.cover_style) {
    if (NEEDS_TEXT.has(post.cover_style) && !post.cover_text) return 'realistic';
    return post.cover_style;
  }
  const style = COVER_ROTATION[index % COVER_ROTATION.length];
  return NEEDS_TEXT.has(style) && !post.cover_text ? 'realistic' : style;
}

/** Full image prompt for the chosen style (sent as-is; no extra suffix is added). */
export function buildCoverPrompt(post: CoverInput, style: CoverStyle): string {
  const topic = `"${post.title}"`;
  const text = post.cover_text?.trim();
  switch (style) {
    case 'realistic':
      return post.scene
        ? `${post.image_prompt}. Natural documentary-style photography, realistic lighting, authentic South Indian setting. No text. ${NO_BRANDS}`
        : `${post.image_prompt}. Natural food photography, authentic South Indian meal, realistic warm lighting, fresh and appetizing, zero artificial styling. No text. ${NO_BRANDS}`;
    case 'scenario':
      return `Candid, realistic photo of an everyday moment in Coimbatore, South India, that shows the idea of the article ${topic}. Ordinary young Indian people in a real home, office, college hostel, street or local gym, mid-action, genuine expressions, slightly imperfect phone-camera feel, natural light. Subject hint: ${post.image_prompt}. No text. ${NO_BRANDS}`;
    case 'still-life':
      return `Minimal editorial still-life photo of a few everyday objects that together tell the story of the article ${topic}, for example a steel tiffin, measuring tape, dumbbell, kitchen scale, notebook, water bottle or raw ingredients, arranged with plenty of empty space on a warm off-white or charcoal surface, soft directional light, a single orange accent object. Subject hint: ${post.image_prompt}. No text. ${NO_BRANDS}`;
    case 'quote':
      return `A bold typographic poster. Large, clean sans-serif headline in white with one word in orange (#EA580C), exactly this text and nothing else: "${text}". Spell every word exactly. The text sits over a dark charcoal (#121212) background with a softly blurred, darkened photo behind it of: ${post.image_prompt}. Generous margins, centred, modern Instagram quote-card look. ${NO_BRANDS}`;
    case 'meme':
      return `An original, light-hearted meme-style image. A realistic, relatable photo of an ordinary young Indian person in Coimbatore with a funny, exaggerated but natural expression, in a situation about the article ${topic} (scene hint: ${post.image_prompt}). Bold white capital letters with a thin black outline across the top, exactly this caption and nothing else: "${text}". Spell every word exactly. No other text, signs, posters or writing anywhere in the scene. Not a copy of any known meme template. ${NO_BRANDS}`;
  }
}
