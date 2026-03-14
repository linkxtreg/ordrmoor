import { cleanSupabaseUrl, getOptimizedImageUrl, type OptimizedImageOptions } from './imageUtils';

/**
 * Netlify Image CDN - compresses and converts images to WebP.
 * Bypasses Supabase Free Tier (no on-the-fly transformations).
 * Set VITE_USE_NETLIFY_IMAGE_CDN=false to fall back to Supabase (Pro only).
 */
const USE_NETLIFY_CDN = import.meta.env.VITE_USE_NETLIFY_IMAGE_CDN !== 'false';

/**
 * Returns an optimized image URL. For Supabase URLs, prefers Netlify Image CDN
 * (w=800, q=80, fm=webp) to compress the 287KB hero and avoid Supabase Free Tier limits.
 * Uses clean public URLs (no tokens) so Netlify can process them.
 */
export function optimizeImageUrl(
  url: string,
  width = 1200,
  quality = 80,
  options?: Partial<OptimizedImageOptions>
): string {
  if (!url || !url.includes('supabase')) return url;
  if (USE_NETLIFY_CDN) {
    const cleanUrl = cleanSupabaseUrl(url);
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/.netlify/images?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${quality}&fm=webp`;
  }
  return getOptimizedImageUrl(url, {
    maxWidth: width,
    quality,
    ...options,
  });
}
