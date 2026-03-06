import { Menu, MenuItem, Category, GeneralInfo, BranchAddress } from '../types/menu';
import type { OfferUpsertInput, OfferWithItems } from '../types/offers';
import { resolveFeatureFlags, type FeatureFlags } from '../types/features';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-47a828b2`;

let currentTenantSlug: string | null = null;
const GET_CACHE_TTL_MS = 30_000;
type CacheEntry<T> = { value: T; expiresAt: number };
const responseCache = new Map<string, CacheEntry<unknown>>();
const inFlightCache = new Map<string, Promise<unknown>>();
const PERF_DEBUG = import.meta.env.DEV;

type ApiPerfStats = {
  fetchCount: number;
  fetchTotalMs: number;
  fetchMaxMs: number;
  fetchMinMs: number;
  cacheHits: number;
  inFlightReused: number;
  retryCount: number;
  errorCount: number;
};

const perfStats: ApiPerfStats = {
  fetchCount: 0,
  fetchTotalMs: 0,
  fetchMaxMs: 0,
  fetchMinMs: Number.POSITIVE_INFINITY,
  cacheHits: 0,
  inFlightReused: 0,
  retryCount: 0,
  errorCount: 0,
};

function getPerfSummary() {
  const avgFetchMs = perfStats.fetchCount > 0
    ? Math.round(perfStats.fetchTotalMs / perfStats.fetchCount)
    : 0;
  return {
    ...perfStats,
    fetchMinMs: Number.isFinite(perfStats.fetchMinMs) ? perfStats.fetchMinMs : 0,
    avgFetchMs,
  };
}

function resetPerfStats() {
  perfStats.fetchCount = 0;
  perfStats.fetchTotalMs = 0;
  perfStats.fetchMaxMs = 0;
  perfStats.fetchMinMs = Number.POSITIVE_INFINITY;
  perfStats.cacheHits = 0;
  perfStats.inFlightReused = 0;
  perfStats.retryCount = 0;
  perfStats.errorCount = 0;
}

if (PERF_DEBUG && typeof window !== 'undefined') {
  const win = window as Window & {
    __ORDRMOOR_PERF__?: {
      getSummary: () => ReturnType<typeof getPerfSummary>;
      reset: () => void;
      getCacheSize: () => { responseCache: number; inFlightCache: number };
    };
  };
  if (!win.__ORDRMOOR_PERF__) {
    win.__ORDRMOOR_PERF__ = {
      getSummary: getPerfSummary,
      reset: resetPerfStats,
      getCacheSize: () => ({ responseCache: responseCache.size, inFlightCache: inFlightCache.size }),
    };
  }
}

/** Set by TenantProvider. When null, backend uses legacy single-tenant keys. */
export function setApiTenant(slug: string | null): void {
  if (currentTenantSlug !== slug) {
    responseCache.clear();
    inFlightCache.clear();
  }
  currentTenantSlug = slug;
}

function cacheKey(url: string): string {
  return `${currentTenantSlug ?? 'default'}::${url}`;
}

function invalidateCacheByPath(pathPart: string): void {
  for (const key of responseCache.keys()) {
    if (key.includes(pathPart)) responseCache.delete(key);
  }
  for (const key of inFlightCache.keys()) {
    if (key.includes(pathPart)) inFlightCache.delete(key);
  }
  // Any menu/category/item/general-info mutation can stale customer bundle caches.
  if (
    pathPart !== '/menu-bundle' &&
    (pathPart.includes('/menus') ||
      pathPart.includes('/menu-items') ||
      pathPart.includes('/categories') ||
      pathPart.includes('/general-info') ||
      pathPart.includes('/addresses') ||
      pathPart.includes('/offers'))
  ) {
    invalidateCacheByPath('/menu-bundle');
  }
}

async function getCachedJson<T>(url: string, fetcher: () => Promise<T>): Promise<T> {
  const key = cacheKey(url);
  const now = Date.now();
  const cached = responseCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) {
    perfStats.cacheHits += 1;
    if (PERF_DEBUG) {
      console.debug(`[perf][cache-hit] ${url}`);
    }
    return cached.value;
  }

  const inFlight = inFlightCache.get(key) as Promise<T> | undefined;
  if (inFlight) {
    perfStats.inFlightReused += 1;
    if (PERF_DEBUG) {
      console.debug(`[perf][in-flight-reuse] ${url}`);
    }
    return inFlight;
  }

  const request = fetcher()
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + GET_CACHE_TTL_MS });
      return value;
    })
    .finally(() => {
      inFlightCache.delete(key);
    });

  inFlightCache.set(key, request);
  return request;
}

function getHeaders(opts?: { forFormData?: boolean }): Record<string, string> {
  const h: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
  };
  if (!opts?.forFormData) {
    h['Content-Type'] = 'application/json';
  }
  if (currentTenantSlug) {
    h['X-Tenant-Id'] = currentTenantSlug;
  }
  return h;
}

// ============================================
// HEALTH CHECK & DIAGNOSTICS
// ============================================

let serverHealthy = true;

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { 
      headers: getHeaders(),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    serverHealthy = response.ok;
    return response.ok;
  } catch (error) {
    console.error('Server health check failed:', error);
    serverHealthy = false;
    return false;
  }
}

// ============================================
// RETRY LOGIC FOR NETWORK ERRORS
// ============================================

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  delay = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  // Check server health first on first request
  if (url.includes('/menu-items') || url.includes('/categories') || url.includes('/general-info')) {
    if (!serverHealthy) {
      // Try to check health
      await checkServerHealth();
    }
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      const elapsed = Date.now() - startedAt;
      perfStats.fetchCount += 1;
      perfStats.fetchTotalMs += elapsed;
      perfStats.fetchMaxMs = Math.max(perfStats.fetchMaxMs, elapsed);
      perfStats.fetchMinMs = Math.min(perfStats.fetchMinMs, elapsed);
      if (PERF_DEBUG) {
        console.debug(`[perf][fetch] ${options.method || 'GET'} ${url} -> ${response.status} in ${elapsed}ms`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      perfStats.errorCount += 1;
      console.warn(`Attempt ${attempt + 1} failed for ${url}:`, error);

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        perfStats.retryCount += 1;
        // Exponential backoff: wait longer between each retry
        const waitTime = delay * Math.pow(2, attempt);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  const errorMessage = lastError?.message || 'Unknown error';
  throw new Error(`Network request failed after ${maxRetries + 1} attempts. Please check:\n1. Your internet connection\n2. Supabase Edge Functions are deployed\n3. Server logs for errors\n\nError: ${errorMessage}`);
}

// ============================================
// MENUS API
// ============================================

export const menusApi = {
  async getAll(): Promise<Menu[]> {
    const url = `${API_BASE}/menus`;
    return getCachedJson<Menu[]>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch menus');
      return result.data;
    });
  },

  async getBySlug(slug: string): Promise<Menu> {
    const url = `${API_BASE}/menus/by-slug/${encodeURIComponent(slug)}`;
    return getCachedJson<Menu>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Menu not found');
      return result.data;
    });
  },

  async create(menu: { name: string; order?: number }): Promise<Menu> {
    const response = await fetchWithRetry(`${API_BASE}/menus`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(menu),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create menu');
    invalidateCacheByPath('/menus');
    return result.data;
  },

  async update(id: string, menu: Partial<Menu>): Promise<Menu> {
    const response = await fetchWithRetry(`${API_BASE}/menus/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ ...menu, id }),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update menu');
    invalidateCacheByPath('/menus');
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE}/menus/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete menu');
    invalidateCacheByPath('/menus');
  },

  async duplicate(id: string): Promise<Menu> {
    const response = await fetchWithRetry(`${API_BASE}/menus/${id}/duplicate`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to duplicate menu');
    invalidateCacheByPath('/menus');
    return result.data;
  },
};

// ============================================
// MENU ITEMS API
// ============================================

export const menuItemsApi = {
  async getAll(menuId?: string): Promise<MenuItem[]> {
    const url = menuId ? `${API_BASE}/menu-items?menuId=${encodeURIComponent(menuId)}` : `${API_BASE}/menu-items`;
    return getCachedJson<MenuItem[]>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch menu items');
      return result.data;
    });
  },

  async getById(id: string): Promise<MenuItem> {
    const url = `${API_BASE}/menu-items/${id}`;
    return getCachedJson<MenuItem>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch menu item');
      return result.data;
    });
  },

  async create(item: MenuItem): Promise<MenuItem> {
    const response = await fetchWithRetry(`${API_BASE}/menu-items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create menu item');
    invalidateCacheByPath('/menu-items');
    return result.data;
  },

  async update(id: string, item: MenuItem): Promise<MenuItem> {
    const response = await fetchWithRetry(`${API_BASE}/menu-items/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update menu item');
    invalidateCacheByPath('/menu-items');
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE}/menu-items/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete menu item');
    invalidateCacheByPath('/menu-items');
  },
};

// ============================================
// CATEGORIES API
// ============================================

export const categoriesApi = {
  async getAll(menuId?: string): Promise<Category[]> {
    const url = menuId ? `${API_BASE}/categories?menuId=${encodeURIComponent(menuId)}` : `${API_BASE}/categories`;
    return getCachedJson<Category[]>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch categories');
      return result.data;
    });
  },

  async getById(id: string): Promise<Category> {
    const url = `${API_BASE}/categories/${id}`;
    return getCachedJson<Category>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch category');
      return result.data;
    });
  },

  async create(category: Category): Promise<Category> {
    const response = await fetchWithRetry(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(category),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create category');
    invalidateCacheByPath('/categories');
    return result.data;
  },

  async update(id: string, category: Category): Promise<Category> {
    const response = await fetchWithRetry(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(category),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update category');
    invalidateCacheByPath('/categories');
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete category');
    invalidateCacheByPath('/categories');
  },
};

// ============================================
// GENERAL INFO API
// ============================================

export const generalInfoApi = {
  async get(): Promise<GeneralInfo> {
    const url = `${API_BASE}/general-info`;
    return getCachedJson<GeneralInfo>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch general info');
      return result.data;
    });
  },

  async update(info: GeneralInfo): Promise<GeneralInfo> {
    const response = await fetchWithRetry(`${API_BASE}/general-info`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(info),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update general info');
    invalidateCacheByPath('/general-info');
    return result.data;
  },
};

// ============================================
// ADDRESSES API
// ============================================

export const addressesApi = {
  async getAll(): Promise<BranchAddress[]> {
    const url = `${API_BASE}/addresses`;
    return getCachedJson<BranchAddress[]>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch addresses');
      return result.data;
    });
  },

  async create(address: Omit<BranchAddress, 'id'> & { id?: string }): Promise<BranchAddress> {
    const response = await fetchWithRetry(`${API_BASE}/addresses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(address),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create address');
    invalidateCacheByPath('/addresses');
    return result.data;
  },

  async update(id: string, address: Partial<BranchAddress>): Promise<BranchAddress> {
    const response = await fetchWithRetry(`${API_BASE}/addresses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(address),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update address');
    invalidateCacheByPath('/addresses');
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE}/addresses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete address');
    invalidateCacheByPath('/addresses');
  },

  async reorder(items: BranchAddress[]): Promise<BranchAddress[]> {
    const response = await fetchWithRetry(`${API_BASE}/addresses/reorder/items`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ items }),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to reorder addresses');
    invalidateCacheByPath('/addresses');
    return result.data;
  },
};

async function parseOffersJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty response');
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    if (response.status === 404) {
      throw new Error(
        'Offers API is not deployed yet. Run: supabase functions deploy make-server-47a828b2'
      );
    }
    throw new Error(`Invalid response: ${trimmed.slice(0, 100)}${trimmed.length > 100 ? '...' : ''}`);
  }
}

// ============================================
// OFFERS API
// ============================================

export const offersApi = {
  async getAll(): Promise<OfferWithItems[]> {
    const url = `${API_BASE}/offers`;
    return getCachedJson<OfferWithItems[]>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await parseOffersJson<{ success?: boolean; data?: OfferWithItems[]; error?: string }>(response);
      if (!result.success) throw new Error(result.error || 'Failed to fetch offers');
      return result.data ?? [];
    });
  },

  async create(payload: OfferUpsertInput): Promise<OfferWithItems> {
    const response = await fetchWithRetry(`${API_BASE}/offers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await parseOffersJson<{ success?: boolean; data?: OfferWithItems; error?: string }>(response);
    if (!result.success || !result.data) throw new Error(result.error || 'Failed to create offer');
    invalidateCacheByPath('/offers');
    return result.data;
  },

  async update(id: string, payload: OfferUpsertInput): Promise<OfferWithItems> {
    const response = await fetchWithRetry(`${API_BASE}/offers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await parseOffersJson<{ success?: boolean; data?: OfferWithItems; error?: string }>(response);
    if (!result.success || !result.data) throw new Error(result.error || 'Failed to update offer');
    invalidateCacheByPath('/offers');
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE}/offers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await parseOffersJson<{ success?: boolean; error?: string }>(response);
    if (!result.success) throw new Error(result.error || 'Failed to delete offer');
    invalidateCacheByPath('/offers');
  },
};

// ============================================
// LOYALTY API (Admin)
// ============================================

import type { LoyaltyProgram, LoyaltyProgramInput, LoyaltyStats, PublicLoyaltyProgram, CheckInResult } from '../types/loyalty';

export const loyaltyApi = {
  async getProgram(): Promise<LoyaltyProgram | null> {
    const url = `${API_BASE}/loyalty/program`;
    return getCachedJson<LoyaltyProgram | null>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch loyalty program');
      return result.data;
    });
  },

  async saveProgram(data: LoyaltyProgramInput): Promise<LoyaltyProgram> {
    const response = await fetchWithRetry(`${API_BASE}/loyalty/program`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to save loyalty program');
    invalidateCacheByPath('/loyalty');
    return result.data;
  },

  async getStats(): Promise<LoyaltyStats> {
    const url = `${API_BASE}/loyalty/stats`;
    return getCachedJson<LoyaltyStats>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch loyalty stats');
      return result.data;
    });
  },
};

// ============================================
// LOYALTY API (Public / Customer)
// ============================================

export const publicLoyaltyApi = {
  async getProgram(tenantSlug: string): Promise<PublicLoyaltyProgram | null> {
    const url = `${API_BASE}/public/loyalty/${encodeURIComponent(tenantSlug)}`;
    return getCachedJson<PublicLoyaltyProgram | null>(url, async () => {
      const response = await fetchWithRetry(url, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      }, 1, 300);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch loyalty program');
      return result.data;
    });
  },

  async checkIn(tenantSlug: string, phone: string): Promise<CheckInResult> {
    const response = await fetch(`${API_BASE}/public/loyalty/${encodeURIComponent(tenantSlug)}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ phone }),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Check-in failed');
    invalidateCacheByPath('/loyalty');
    return result.data;
  },
};

// ============================================
// CUSTOMER MENU BUNDLE API (single round-trip)
// ============================================

export type CustomerMenuBundle = {
  menu: Menu | null;
  menus: Menu[];
  categories: Category[];
  items: MenuItem[];
  generalInfo: GeneralInfo;
};

export const customerMenuApi = {
  async getPublicBundle(tenantSlug: string, slug?: string): Promise<CustomerMenuBundle> {
    const url = slug
      ? `${API_BASE}/public/menu-bundle/${encodeURIComponent(tenantSlug)}?slug=${encodeURIComponent(slug)}`
      : `${API_BASE}/public/menu-bundle/${encodeURIComponent(tenantSlug)}`;
    return getCachedJson<CustomerMenuBundle>(url, async () => {
      const response = await fetchWithRetry(url, {}, 1, 300);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch public menu bundle');
      return result.data;
    });
  },

  async getBundle(slug?: string): Promise<CustomerMenuBundle> {
    const url = slug
      ? `${API_BASE}/menu-bundle?slug=${encodeURIComponent(slug)}`
      : `${API_BASE}/menu-bundle`;
    return getCachedJson<CustomerMenuBundle>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() }, 1, 300);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch menu bundle');
      return result.data;
    });
  },
};

// ============================================
// IMAGE UPLOAD API
// ============================================

async function readImageDimensions(file: File): Promise<{ width: number; height: number; image: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, image: img });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    img.src = url;
  });
}

async function optimizeImageFile(
  file: File,
  opts: { maxWidth: number; maxHeight: number; quality: number; minQuality: number; targetMaxBytes?: number }
): Promise<File> {
  // Skip SVG and GIF to avoid breaking vector/animated formats.
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  const { width, height, image } = await readImageDimensions(file);
  if (width <= opts.maxWidth && height <= opts.maxHeight && file.size <= 600 * 1024) {
    return file;
  }

  const scale = Math.min(opts.maxWidth / width, opts.maxHeight / height, 1);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const encode = (quality: number) =>
    new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });

  let quality = opts.quality;
  let blob = await encode(quality);
  if (!blob) return file;

  // Adaptive quality step-down to reach target size without dropping below a safe floor.
  if (opts.targetMaxBytes && blob.size > opts.targetMaxBytes) {
    while (blob.size > opts.targetMaxBytes && quality > opts.minQuality) {
      quality = Math.max(opts.minQuality, quality - 0.06);
      const nextBlob = await encode(quality);
      if (!nextBlob) break;
      blob = nextBlob;
      if (quality === opts.minQuality) break;
    }
  }

  const originalName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${originalName}.webp`, { type: 'image/webp' });
}

export const imageApi = {
  async upload(
    file: File,
    options?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      minQuality?: number;
      targetMaxBytes?: number;
    }
  ): Promise<string> {
    const optimized = await optimizeImageFile(file, {
      maxWidth: options?.maxWidth ?? 1400,
      maxHeight: options?.maxHeight ?? 1400,
      quality: options?.quality ?? 0.82,
      minQuality: options?.minQuality ?? 0.72,
      targetMaxBytes: options?.targetMaxBytes,
    });
    const formData = new FormData();
    formData.append('file', optimized);

    const response = await fetchWithRetry(`${API_BASE}/upload-image`, {
      method: 'POST',
      headers: getHeaders({ forFormData: true }),
      body: formData,
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to upload image');
    return result.data.url;
  },
};

// ============================================
// INITIALIZATION API
// ============================================

export const initApi = {
  async initialize(data: {
    menuItems: MenuItem[];
    categories: Category[];
    generalInfo: GeneralInfo;
  }): Promise<{ alreadyInitialized: boolean }> {
    const response = await fetchWithRetry(`${API_BASE}/initialize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to initialize database');
    responseCache.clear();
    inFlightCache.clear();
    return { alreadyInitialized: result.alreadyInitialized };
  },

  async clearAll(): Promise<{ menuItems: number; categories: number }> {
    const response = await fetchWithRetry(`${API_BASE}/clear-all`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to clear database');
    responseCache.clear();
    inFlightCache.clear();
    return result.deleted;
  },
};

// ============================================
// TENANT SIGNUP (PUBLIC)
// ============================================

export const tenantSignupApi = {
  async signup(data: { name: string; adminEmail: string; adminPassword: string }): Promise<{ slug: string; name: string; adminEmail: string }> {
    const response = await fetch(`${API_BASE}/tenants/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
      body: JSON.stringify(data),
    });
    const result = await safeJsonParse<{ success?: boolean; data?: { slug: string; name: string; adminEmail: string }; error?: string }>(response);
    if (!result.success) throw new Error(result.error || 'Signup failed');
    return result.data!;
  },
};

// ============================================
// SUPER ADMIN API
// ============================================

export type TenantRecord = {
  slug: string;
  name?: string;
  createdAt?: string;
  adminEmail?: string;
  active?: boolean;
  featureFlags: FeatureFlags;
};

function safeJsonParse<T>(response: Response): Promise<T> {
  return response.text().then((text) => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Empty response');
    try {
      return JSON.parse(trimmed) as T;
    } catch (e) {
      throw new Error(`Invalid response: ${trimmed.slice(0, 100)}${trimmed.length > 100 ? '...' : ''}`);
    }
  });
}

export const superAdminApi = {
  async verifySuperAdmin(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/super-admin/verify`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}`, 'X-Super-Admin-Token': token },
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async getTenants(token: string): Promise<TenantRecord[]> {
    const response = await fetch(`${API_BASE}/super-admin/tenants`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}`, 'X-Super-Admin-Token': token },
    });
    const result = await safeJsonParse<{ success?: boolean; data?: Array<Omit<TenantRecord, 'featureFlags'> & { featureFlags?: Record<string, unknown> }>; error?: string }>(response);
    if (!result.success) throw new Error(result.error || 'Failed to fetch tenants');
    return (result.data ?? []).map((tenant) => ({
      ...tenant,
      featureFlags: resolveFeatureFlags(tenant.featureFlags),
    }));
  },

  async updateTenant(
    token: string,
    oldSlug: string,
    updates: {
      slug?: string;
      name?: string;
      active?: boolean;
      adminEmail?: string;
      adminPassword?: string;
      featureFlags?: FeatureFlags;
    }
  ): Promise<TenantRecord> {
    const response = await fetch(`${API_BASE}/super-admin/tenants/${encodeURIComponent(oldSlug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}`, 'X-Super-Admin-Token': token },
      body: JSON.stringify(updates),
    });
    const result = await safeJsonParse<{ success?: boolean; data?: Omit<TenantRecord, 'featureFlags'> & { featureFlags?: Record<string, unknown> }; error?: string }>(response);
    if (!result.success) throw new Error(result.error || 'Failed to update tenant');
    const tenant = result.data!;
    return { ...tenant, featureFlags: resolveFeatureFlags(tenant.featureFlags) };
  },

  async createTenant(
    token: string,
    slug: string,
    name?: string,
    adminEmail?: string,
    adminPassword?: string,
    active?: boolean,
    featureFlags?: FeatureFlags
  ): Promise<TenantRecord> {
    const response = await fetch(`${API_BASE}/super-admin/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}`, 'X-Super-Admin-Token': token },
      body: JSON.stringify({ slug, name, adminEmail, adminPassword, active, featureFlags }),
    });
    const result = await safeJsonParse<{ success?: boolean; data?: Omit<TenantRecord, 'featureFlags'> & { featureFlags?: Record<string, unknown> }; error?: string }>(response);
    if (!result.success) throw new Error(result.error || 'Failed to create tenant');
    const tenant = result.data!;
    return { ...tenant, featureFlags: resolveFeatureFlags(tenant.featureFlags) };
  },

  async tenantExists(slug: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/tenants/check/${encodeURIComponent(slug)}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (!response.ok) return false;
      const result = await safeJsonParse<{ exists?: boolean }>(response);
      return result.exists === true;
    } catch {
      return false;
    }
  },

  async getTenantInfo(slug: string): Promise<{ exists: boolean; name?: string; slug?: string }> {
    try {
      const response = await fetch(`${API_BASE}/tenants/info/${encodeURIComponent(slug)}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const result = await safeJsonParse<{ exists?: boolean; name?: string; slug?: string }>(response);
      return { exists: result.exists === true, name: result.name, slug: result.slug };
    } catch {
      return { exists: false };
    }
  },

  async deleteTenant(token: string, slug: string): Promise<void> {
    const response = await fetch(`${API_BASE}/super-admin/tenants/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'X-Super-Admin-Token': token },
    });
    const result = await safeJsonParse<{ success?: boolean; error?: string }>(response);
    if (!result.success) throw new Error(result.error || 'Failed to delete tenant');
  },
};

export const tenantFeaturesApi = {
  async getCurrent(): Promise<{ tenantSlug: string; featureFlags: FeatureFlags }> {
    const url = `${API_BASE}/tenant/features`;
    return getCachedJson<{ tenantSlug: string; featureFlags: FeatureFlags }>(url, async () => {
      const response = await fetchWithRetry(url, { headers: getHeaders() });
      const result = await safeJsonParse<{
        success?: boolean;
        data?: { tenantSlug?: string; featureFlags?: Record<string, unknown> };
        error?: string;
      }>(response);
      if (!result.success || !result.data?.tenantSlug) {
        throw new Error(result.error || 'Failed to fetch tenant features');
      }
      return {
        tenantSlug: result.data.tenantSlug,
        featureFlags: resolveFeatureFlags(result.data.featureFlags),
      };
    });
  },
};