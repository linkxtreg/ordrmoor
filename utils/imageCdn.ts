import { getOptimizedImageUrl, type OptimizedImageOptions } from './imageUtils';

/**
 * Netlify Image CDN - optimizes Supabase storage URLs for LCP.
 * Enable when on Netlify Pro/Enterprise with Image CDN add-on.
 * Set VITE_USE_NETLIFY_IMAGE_CDN=true in .env.
 */
const USE_CDN = import.meta.env.VITE_USE_NETLIFY_IMAGE_CDN === 'true';

/**
 * Returns an optimized image URL. Uses Netlify Image CDN when enabled,
 * otherwise falls back to Supabase Storage image transformations (WebP, resize).
 */
export function optimizeImageUrl(
  url: string,
  width = 1200,
  quality = 80,
  options?: Partial<OptimizedImageOptions>
): string {
  if (!url || !url.includes('supabase')) return url;
  if (USE_CDN) {
    return `/.netlify/images?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
  }
  return getOptimizedImageUrl(url, {
    maxWidth: width,
    quality,
    ...options,
  });
}
