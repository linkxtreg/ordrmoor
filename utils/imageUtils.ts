/**
 * Supabase Storage Image Optimization
 *
 * Converts Supabase Storage public URLs to the render/image endpoint for
 * on-the-fly WebP conversion, resizing, and quality optimization.
 * Requires Supabase Pro Plan or above for image transformations.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

const SUPABASE_OBJECT_SIGN = '/storage/v1/object/sign/';
const SUPABASE_OBJECT_PUBLIC = '/storage/v1/object/public/';

/**
 * Hard-fixes Supabase Storage URLs for Netlify Image CDN and public access.
 * - Strips ?token=... and ALL query parameters (split at first '?')
 * - Replaces /object/sign/ with /object/public/ (bucket is public)
 * - Removes any double slashes (e.g., public//)
 */
export function cleanSupabaseUrl(url: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return url;
  const trimmed = url.trim();
  if (!trimmed.includes('supabase.co')) return url;
  let clean = trimmed.split('?')[0];
  clean = clean.replace(SUPABASE_OBJECT_SIGN, SUPABASE_OBJECT_PUBLIC);
  clean = clean.replace(/public\/\//g, 'public/');
  return clean;
}

export interface OptimizedImageOptions {
  /** Max width in pixels (1–2500). Supabase maintains aspect ratio when only width is set. */
  maxWidth?: number;
  /** Max height in pixels (1–2500). Optional; use with maxWidth for contain/cover. */
  maxHeight?: number;
  /** Quality 20–100. Default 80. Lower = smaller file size. */
  quality?: number;
  /** Resize mode: 'cover' | 'contain' | 'fill'. Default 'cover'. */
  resize?: 'cover' | 'contain' | 'fill';
}

const SUPABASE_RENDER_IMAGE = '/storage/v1/render/image/public/';

/**
 * Returns an optimized Supabase Storage URL with WebP conversion and resize params.
 * Non-Supabase URLs are returned unchanged.
 * Uses clean public URL (no tokens) for CDN compatibility.
 */
export function getOptimizedImageUrl(
  url: string,
  options: OptimizedImageOptions = {}
): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return url;

  const clean = cleanSupabaseUrl(url);
  if (!clean.includes('supabase.co') || !clean.includes(SUPABASE_OBJECT_PUBLIC)) {
    return url;
  }

  const { maxWidth = 1200, maxHeight, quality = 80, resize = 'cover' } = options;

  const renderBase = clean.replace(SUPABASE_OBJECT_PUBLIC, SUPABASE_RENDER_IMAGE);

  const params = new URLSearchParams();
  params.set('width', String(Math.min(2500, Math.max(1, maxWidth))));
  if (maxHeight != null && maxHeight > 0) {
    params.set('height', String(Math.min(2500, Math.max(1, maxHeight))));
  }
  params.set('quality', String(Math.min(100, Math.max(20, quality))));
  params.set('resize', resize);

  const queryString = params.toString();
  return queryString ? `${renderBase}?${queryString}` : renderBase;
}
