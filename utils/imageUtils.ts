/**
 * Supabase Storage Image Optimization
 *
 * Converts Supabase Storage public URLs to the render/image endpoint for
 * on-the-fly WebP conversion, resizing, and quality optimization.
 * Requires Supabase Pro Plan or above for image transformations.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

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

const SUPABASE_OBJECT_PUBLIC = '/storage/v1/object/public/';
const SUPABASE_RENDER_IMAGE = '/storage/v1/render/image/public/';

/**
 * Returns an optimized Supabase Storage URL with WebP conversion and resize params.
 * Non-Supabase URLs are returned unchanged.
 *
 * Handles URLs with existing query params (e.g. ?token=...) by appending
 * transformation params with the correct separator (& or ?).
 */
export function getOptimizedImageUrl(
  url: string,
  options: OptimizedImageOptions = {}
): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return url;

  const trimmed = url.trim();
  if (!trimmed.includes('supabase.co') || !trimmed.includes(SUPABASE_OBJECT_PUBLIC)) {
    return url;
  }

  const { maxWidth = 1200, maxHeight, quality = 80, resize = 'cover' } = options;

  const [base, existingQuery] = trimmed.split('?');
  const renderBase = base.replace(SUPABASE_OBJECT_PUBLIC, SUPABASE_RENDER_IMAGE);

  const params = new URLSearchParams(existingQuery || '');
  params.set('width', String(Math.min(2500, Math.max(1, maxWidth))));
  if (maxHeight != null && maxHeight > 0) {
    params.set('height', String(Math.min(2500, Math.max(1, maxHeight))));
  }
  params.set('quality', String(Math.min(100, Math.max(20, quality))));
  params.set('resize', resize);

  const queryString = params.toString();
  return queryString ? `${renderBase}?${queryString}` : renderBase;
}
