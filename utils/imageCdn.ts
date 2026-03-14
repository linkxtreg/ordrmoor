/**
 * Netlify Image CDN - optimizes Supabase storage URLs for LCP.
 * Enable when on Netlify Pro/Enterprise with Image CDN add-on.
 * Set VITE_USE_NETLIFY_IMAGE_CDN=true in .env.
 */
const USE_CDN = import.meta.env.VITE_USE_NETLIFY_IMAGE_CDN === 'true';

export function optimizeImageUrl(url: string, width = 1200, quality = 80): string {
  if (!url || !USE_CDN || !url.includes('supabase')) return url;
  return `/.netlify/images?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}
