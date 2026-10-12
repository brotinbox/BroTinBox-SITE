import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Detects the real file type from its first bytes. The browser-supplied
 * MIME type and file name are ignored, so a renamed script or HTML file
 * cannot be uploaded as an "image".
 */
function sniff(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return { mime: 'image/avif', ext: 'avif' };
  return null;
}

/** Uploads an image to a public bucket under a random name; returns its public URL. */
export async function uploadImage(supabase: SupabaseClient<any>, bucket: 'menu-images' | 'blog-images', file: File, folder: string) {
  if (file.size > MAX_BYTES) throw new Error('Image must be 5 MB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) throw new Error('Only JPG, PNG, WebP or AVIF images are allowed.');

  const safeFolder = folder.replace(/[^a-z0-9/-]/gi, '').slice(0, 80);
  const path = `${safeFolder}/${randomUUID()}.${type.ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: type.mime,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error('Upload failed. Please try again.');
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
