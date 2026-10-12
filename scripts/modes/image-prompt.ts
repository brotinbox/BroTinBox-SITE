import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1200&q=80',
];

// ─── STRIP AI METADATA & C2PA DIGITAL PROVENANCE ─────────────────────────────
async function stripAiMetadata(rawBuffer: Buffer): Promise<Buffer> {
  console.log('🧹 Stripping AI metadata, EXIF, IPTC, and C2PA digital provenance markers...');
  // sharp by default completely discards all EXIF, XMP, IPTC, ICC, and C2PA manifests unless withMetadata() is explicitly called.
  // We compress to clean WebP at 80% quality (lightweight, zero AI flags).
  const cleanBuffer = await sharp(rawBuffer)
    .rotate()
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  console.log(`✨ AI provenance wiped! Clean image size: ${(cleanBuffer.length / 1024).toFixed(1)} KB`);
  return cleanBuffer;
}

export async function generateAndUploadCoverImage(
  prompt: string,
  slug: string,
  openAiKey: string,
  promptSuffix = 'Natural food photography, authentic South Indian meal, realistic warm morning lighting, top-down perspective, fresh and appetizing, zero artificial styling, no watermarks, no text.'
): Promise<string> {
  const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '');

  if (!openAiKey) {
    console.warn('⚠️  OPENAI_API_KEY is not set. Using curated South Indian cover image fallback.');
    return FALLBACK_COVERS[Math.floor(Math.random() * FALLBACK_COVERS.length)];
  }

  const primaryModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
  // OPENAI_IMAGE_FALLBACK_MODEL=none disables the (≈4× pricier) DALL·E retry.
  const fallbackModel = process.env.OPENAI_IMAGE_FALLBACK_MODEL || 'dall-e-3';

  let rawBuffer: Buffer | null = null;

  // Try primary model first, fallback to dall-e-3 if endpoint rejects
  const models = fallbackModel === 'none' ? [primaryModel] : [primaryModel, fallbackModel];
  for (const modelToUse of models) {
    try {
      console.log(`🎨 Generating image via OpenAI with model [${modelToUse}] (quality: low)...`);
      const isGptImage = modelToUse.startsWith('gpt-image');
      
      const payload: Record<string, any> = {
        model: modelToUse,
        prompt: `${prompt}. ${promptSuffix}`,
        n: 1,
        size: isGptImage ? '1536x1024' : '1024x1024',
        quality: isGptImage ? 'low' : 'standard',
        // gpt-image models always return b64 and reject response_format; only DALL·E takes it.
        ...(modelToUse.startsWith('dall-e') ? { response_format: 'b64_json' } : {}),
      };

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.text();
        console.warn(`⚠️  Model [${modelToUse}] request returned ${response.status}: ${err}`);
        if (modelToUse === primaryModel && primaryModel !== fallbackModel) {
          console.log(`🔄 Retrying with fallback model [${fallbackModel}]...`);
          continue;
        }
        break;
      }

      const json = await response.json();
      const base64Data = json.data?.[0]?.b64_json || json.data?.[0]?.b64;
      if (base64Data) {
        rawBuffer = Buffer.from(base64Data, 'base64');
        break;
      } else if (json.data?.[0]?.url) {
        const imgRes = await fetch(json.data[0].url);
        const arrayBuf = await imgRes.arrayBuffer();
        rawBuffer = Buffer.from(arrayBuf);
        break;
      }
    } catch (err: any) {
      console.warn(`⚠️  Error with model [${modelToUse}]: ${err.message}`);
      if (modelToUse === primaryModel && primaryModel !== fallbackModel) {
        continue;
      }
    }
  }

  if (!rawBuffer) {
    console.warn('⚠️  Could not generate image from OpenAI. Using curated fallback.');
    return FALLBACK_COVERS[Math.floor(Math.random() * FALLBACK_COVERS.length)];
  }

  try {
    // 1. Strip all AI metadata, C2PA provenance, EXIF, and camera tags
    const sanitizedWebpBuffer = await stripAiMetadata(rawBuffer);

    // 2. Upload clean image to Cloudflare R2 if credentials present
    if (r2AccessKey && r2SecretKey && r2Endpoint && r2Bucket && r2PublicUrl) {
      console.log('☁️  Uploading sanitized WebP cover to Cloudflare R2...');
      const s3Client = new S3Client({
        region: 'auto',
        // Account origin only: an endpoint ending in /<bucket> makes the SDK prefix every key with the bucket name.
        endpoint: new URL(r2Endpoint).origin,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
      });

      const objectKey = `blog-images/${slug}.webp`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: objectKey,
          Body: sanitizedWebpBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      const finalUrl = `${r2PublicUrl}/${objectKey}`;
      console.log(`✅ Uploaded to Cloudflare R2: ${finalUrl}`);
      return finalUrl;
    } else {
      console.warn('⚠️  Cloudflare R2 keys incomplete in environment. Returning fallback cover.');
      return FALLBACK_COVERS[Math.floor(Math.random() * FALLBACK_COVERS.length)];
    }
  } catch (error: any) {
    console.warn(`⚠️  Error during metadata stripping/upload: ${error.message}`);
    return FALLBACK_COVERS[Math.floor(Math.random() * FALLBACK_COVERS.length)];
  }
}
