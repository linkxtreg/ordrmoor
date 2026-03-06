import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { tenantKv } from "./tenant_kv.ts";

const app = new Hono();

// Initialize Supabase client with service role key for storage operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ============================================
// RETRY HELPER FOR DATABASE OPERATIONS
// ============================================

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`${operationName} attempt ${attempt + 1} failed:`, error);

      const errorMsg = String(error).toLowerCase();
      const isRetryable = 
        errorMsg.includes('connection') ||
        errorMsg.includes('reset by peer') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('econnreset') ||
        errorMsg.includes('network');

      if (!isRetryable) throw error;

      if (attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(2, attempt);
        console.log(`Retrying ${operationName} in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(`${operationName} failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

app.use('*', logger(console.log));
app.use("/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization", "X-Tenant-Id", "X-Super-Admin-Token"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], exposeHeaders: ["Content-Length"], maxAge: 600 }));

async function initializeStorage() {
  const bucketName = 'make-47a828b2-menu-images';
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 5242880 });
      if (error) console.error('Error creating bucket:', error);
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}
initializeStorage();

// Menu slug: unique random key (short alphanumeric) so Arabic/long names don't produce hard URLs.
const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
function randomMenuSlug(length = 10): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < length; i++) s += SLUG_CHARS[arr[i] % SLUG_CHARS.length];
  return s;
}
function ensureUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
  let slug = baseSlug;
  let n = 1;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${n}`;
    n++;
  }
  return slug;
}

function getTenant(c: any): string | null {
  return c.req.header("X-Tenant-Id") || null;
}

type TenantFeatureFlags = Record<string, boolean>;
type BranchAddress = {
  id: string;
  name: string;
  mapUrl: string;
  order?: number;
};

type OfferRecord = {
  id: string;
  name: string;
  discountPct: number;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  itemIds: string[];
  createdAt: string;
  updatedAt?: string;
};

type TenantRecord = {
  slug: string;
  name?: string;
  createdAt?: string;
  adminEmail?: string;
  adminUserId?: string;
  active?: boolean;
  featureFlags?: TenantFeatureFlags;
};

function normalizeFeatureFlags(input: unknown): TenantFeatureFlags {
  if (!input || typeof input !== "object") return {};
  const entries = Object.entries(input as Record<string, unknown>);
  const out: TenantFeatureFlags = {};
  for (const [key, value] of entries) {
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

function normalizeTenantRecord(input: unknown): TenantRecord | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const slug = typeof record.slug === "string" ? record.slug.trim() : "";
  if (!slug) return null;

  return {
    slug,
    name: typeof record.name === "string" ? record.name : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    adminEmail: typeof record.adminEmail === "string" ? record.adminEmail : undefined,
    adminUserId: typeof record.adminUserId === "string" ? record.adminUserId : undefined,
    active: typeof record.active === "boolean" ? record.active : undefined,
    featureFlags: normalizeFeatureFlags(record.featureFlags),
  };
}

function getTenantSlugOrDefault(c: any): string {
  return getTenant(c) || "default";
}

function normalizeAddress(input: unknown): BranchAddress | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const id = typeof data.id === "string" && data.id.trim() ? data.id : crypto.randomUUID();
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const mapUrl = typeof data.mapUrl === "string" ? data.mapUrl.trim() : "";
  const order = typeof data.order === "number" ? data.order : undefined;
  if (!name) return null;
  return { id, name, mapUrl, order };
}

function normalizeOffer(input: unknown): OfferRecord | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const id = typeof data.id === "string" && data.id.trim() ? data.id.trim() : crypto.randomUUID();
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const discountRaw = Number(data.discountPct);
  const discountPct = Number.isFinite(discountRaw) ? Math.max(1, Math.min(99, Math.round(discountRaw * 100) / 100)) : NaN;
  const startDate = typeof data.startDate === "string" ? data.startDate.trim() : "";
  const endDateRaw = typeof data.endDate === "string" ? data.endDate.trim() : "";
  const endDate = endDateRaw ? endDateRaw : null;
  const isActive = typeof data.isActive === "boolean" ? data.isActive : true;
  const targetIdsRaw = Array.isArray(data.itemIds) ? data.itemIds : [];
  const itemIds = Array.from(
    new Set(
      targetIdsRaw
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((targetId) => {
          if (!targetId) return false;
          const parsed = parseOfferTargetId(targetId);
          return !!parsed.menuItemId;
        })
    )
  );
  const createdAt =
    typeof data.createdAt === "string" && data.createdAt.trim()
      ? data.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof data.updatedAt === "string" && data.updatedAt.trim()
      ? data.updatedAt
      : undefined;

  if (!name) return null;
  if (!Number.isFinite(discountPct) || discountPct < 1 || discountPct > 99) return null;
  if (!startDate) return null;
  if (endDate && endDate < startDate) return null;
  if (itemIds.length === 0) return null;

  return {
    id,
    name,
    discountPct,
    startDate,
    endDate,
    isActive,
    itemIds,
    createdAt,
    updatedAt,
  };
}

function parseOfferTargetId(targetId: string): { menuItemId: string; variantId?: string } {
  const [menuItemId, variantId] = targetId.split("::");
  return { menuItemId, variantId: variantId || undefined };
}

const DEFAULT_GENERAL_INFO = {
  restaurantName: 'My Restaurant',
  tagline: 'Delicious food served daily',
  phoneNumber: '',
  logoImage: '',
  backgroundImage: '',
  brandColor: '#e7000b',
  defaultMenuId: '',
  socialMedia: { facebook: '', instagram: '', tiktok: '', messenger: '' },
};

async function getMenuBundle(tkv: ReturnType<typeof tenantKv>, slug?: string | null) {
  let menus = await tkv.getByPrefix("menu:");
  if (menus.length === 0) {
    const [categories, items] = await Promise.all([
      tkv.getByPrefix("category:"),
      tkv.getByPrefix("menu-item:"),
    ]);
    if (categories.length > 0 || items.length > 0) {
      const defaultMenuId = crypto.randomUUID();
      const newSlug = ensureUniqueSlug(randomMenuSlug(), new Set());
      await tkv.set(`menu:${defaultMenuId}`, { id: defaultMenuId, name: "Main Menu", slug: newSlug, order: 0 });
      await Promise.all([
        ...categories.map((cat) => tkv.set(`category:${cat.id}`, { ...cat, menuId: defaultMenuId })),
        ...items.map((item) => tkv.set(`menu-item:${item.id}`, { ...item, menuId: defaultMenuId })),
      ]);
      menus = await tkv.getByPrefix("menu:");
    }
  }

  const [migratedMenus, generalInfoRaw, allCategories, allItems] = await Promise.all([
    ensureMenuSlugs(tkv, menus),
    tkv.get("general-info"),
    tkv.getByPrefix("category:"),
    tkv.getByPrefix("menu-item:"),
  ]);

  const generalInfo = generalInfoRaw || DEFAULT_GENERAL_INFO;
  let selectedMenu: any | null = null;

  if (slug) {
    selectedMenu = migratedMenus.find((m) => (m.slug || '').toLowerCase() === slug.toLowerCase()) || null;
    if (!selectedMenu) {
      return { success: false as const, error: 'Menu not found' };
    }
  } else {
    const defaultMenuId = generalInfo.defaultMenuId;
    selectedMenu = migratedMenus.find((m) => m.id === defaultMenuId) || migratedMenus[0] || null;
  }

  if (!selectedMenu) {
    return {
      success: true as const,
      data: {
        menu: null,
        menus: migratedMenus.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        categories: [],
        items: [],
        generalInfo,
      },
    };
  }

  const menuId = selectedMenu.id;
  const categories = allCategories
    .filter((cat) => (cat.menuId ?? '') === menuId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const items = allItems
    .filter((item) => (item.menuId ?? '') === menuId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    success: true as const,
    data: {
      menu: selectedMenu,
      menus: migratedMenus.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      categories,
      items,
      generalInfo,
    },
  };
}

// Health
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/make-server-47a828b2/health", (c) => c.json({ status: "ok" }));

app.get("/menu-bundle", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const slug = c.req.query("slug");
    const result = await getMenuBundle(tkv, slug);
    if (!result.success) return c.json({ success: false, error: result.error }, 404);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error fetching menu bundle:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.get("/make-server-47a828b2/menu-bundle", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const slug = c.req.query("slug");
    const result = await getMenuBundle(tkv, slug);
    if (!result.success) return c.json({ success: false, error: result.error }, 404);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error fetching menu bundle:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

function setPublicMenuCacheHeaders(c: any) {
  // Keep cache very short so menu edits appear quickly while still speeding QR first-open.
  c.header("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=120");
}

async function getPublicMenuBundleResponse(c: any) {
  try {
    const tenantSlug = c.req.param("tenantSlug");
    const slug = c.req.query("slug");

    // Non-default tenants must exist and be active.
    if (tenantSlug && tenantSlug !== "default") {
      const tenants = await getTenantsList();
      const tenant = tenants.find((t) => t.slug === tenantSlug);
      if (!tenant || tenant.active === false) {
        c.header("Cache-Control", "public, max-age=5, s-maxage=5");
        return c.json({ success: false, error: "Tenant not found" }, 404);
      }
    }

    const tkv = tenantKv(tenantSlug || "default");
    const result = await getMenuBundle(tkv, slug);
    if (!result.success) {
      c.header("Cache-Control", "public, max-age=5, s-maxage=5");
      return c.json({ success: false, error: result.error }, 404);
    }

    setPublicMenuCacheHeaders(c);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error fetching public menu bundle:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
}

app.get("/public/menu-bundle/:tenantSlug", getPublicMenuBundleResponse);
app.get("/make-server-47a828b2/public/menu-bundle/:tenantSlug", getPublicMenuBundleResponse);

// Public: Check if tenant exists and is active (inactive tenants return false)
app.get("/tenants/check/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    if (!slug) return c.json({ exists: false }, 404);
    const tenants = await getTenantsList();
    const tenant = tenants.find((t) => t.slug === slug);
    const exists = tenant && tenant.active !== false;
    return c.json({ exists: !!exists });
  } catch {
    return c.json({ exists: false }, 404);
  }
});
app.get("/make-server-47a828b2/tenants/check/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    if (!slug) return c.json({ exists: false }, 404);
    const tenants = await getTenantsList();
    const tenant = tenants.find((t) => t.slug === slug);
    const exists = tenant && tenant.active !== false;
    return c.json({ exists: !!exists });
  } catch {
    return c.json({ exists: false }, 404);
  }
});

// Public: Get tenant info (name, slug) for active tenants only
app.get("/tenants/info/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    if (!slug) return c.json({ exists: false }, 404);
    const tenants = await getTenantsList();
    const tenant = tenants.find((t) => t.slug === slug);
    const exists = tenant && tenant.active !== false;
    if (!exists) return c.json({ exists: false }, 404);
    return c.json({ exists: true, name: tenant.name || tenant.slug, slug: tenant.slug });
  } catch {
    return c.json({ exists: false }, 404);
  }
});
app.get("/make-server-47a828b2/tenants/info/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    if (!slug) return c.json({ exists: false }, 404);
    const tenants = await getTenantsList();
    const tenant = tenants.find((t) => t.slug === slug);
    const exists = tenant && tenant.active !== false;
    if (!exists) return c.json({ exists: false }, 404);
    return c.json({ exists: true, name: tenant.name || tenant.slug, slug: tenant.slug });
  } catch {
    return c.json({ exists: false }, 404);
  }
});

async function tenantFeatures(c: any) {
  try {
    const tenantSlug = getTenant(c) || "default";
    if (tenantSlug !== "default") {
      const tenants = await getTenantsList();
      const tenant = tenants.find((t) => t.slug === tenantSlug);
      if (!tenant || tenant.active === false) {
        return c.json({ success: false, error: "Tenant not found" }, 404);
      }
    }
    const featureFlags = await getTenantFeatureFlags(tenantSlug);
    return c.json({ success: true, data: { tenantSlug, featureFlags } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.get("/tenant/features", tenantFeatures);
app.get("/make-server-47a828b2/tenant/features", tenantFeatures);

// Public: Self-signup for new tenants (no auth required)
async function tenantSignup(c: any) {
  try {
    const body = await c.req.json();
    const name = (body.name ?? "").toString().trim();
    const rawSlug = (body.slug ?? body.name ?? "").toString().trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
    const slug = rawSlug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "") || "restaurant";
    const adminEmail = (body.adminEmail ?? "").toString().trim();
    const adminPassword = (body.adminPassword ?? "").toString();
    if (!name || name.length < 2) {
      return c.json({ success: false, error: "Restaurant name is required (at least 2 characters)" }, 400);
    }
    if (!adminEmail || !adminEmail.includes("@")) {
      return c.json({ success: false, error: "Valid admin email is required" }, 400);
    }
    if (!adminPassword || adminPassword.length < 6) {
      return c.json({ success: false, error: "Password must be at least 6 characters" }, 400);
    }
    const tenants = await getTenantsList();
    const existingSlugs = new Set(tenants.map((t) => t.slug));
    let finalSlug = slug;
    let n = 1;
    while (existingSlugs.has(finalSlug)) {
      finalSlug = `${slug}-${n}`;
      n++;
    }
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { tenant_slug: finalSlug },
    });
    if (authError) {
      const msg = authError.message ?? String(authError);
      return c.json({ success: false, error: msg.includes("already") ? "Email already registered" : msg }, 400);
    }
    const active = true;
    const newTenant: TenantRecord = {
      slug: finalSlug,
      name: name || finalSlug,
      adminEmail,
      adminUserId: authUser?.user?.id,
      active,
      createdAt: new Date().toISOString(),
      featureFlags: {},
    };
    await kv.set(TENANTS_KEY, { tenants: [...tenants, newTenant] });
    return c.json({ success: true, data: { slug: finalSlug, name: name || finalSlug, adminEmail } });
  } catch (error) {
    console.error("Error in tenant signup:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.post("/tenants/signup", tenantSignup);
app.post("/make-server-47a828b2/tenants/signup", tenantSignup);

// Menus: keep existing slug or assign new unique random slug (never derived from name).
async function ensureMenuSlugs(kvStore: ReturnType<typeof tenantKv>, menus: any[]): Promise<any[]> {
  const used = new Set<string>();
  const out = menus.map((m) => {
    const existing = (m.slug && String(m.slug).trim()) ? m.slug : null;
    const slug = existing && !used.has(existing)
      ? existing
      : ensureUniqueSlug(randomMenuSlug(), used);
    used.add(slug);
    return { ...m, slug };
  });
  for (const m of out) {
    if (m.slug !== (menus.find((x) => x.id === m.id)?.slug)) {
      await kvStore.set(`menu:${m.id}`, m);
    }
  }
  return out;
}

app.get("/menus", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    let menus = await tkv.getByPrefix("menu:");
    if (menus.length === 0) {
      const categories = await tkv.getByPrefix("category:");
      const items = await tkv.getByPrefix("menu-item:");
      if (categories.length > 0 || items.length > 0) {
        const defaultMenuId = crypto.randomUUID();
        const slug = ensureUniqueSlug(randomMenuSlug(), new Set());
        await tkv.set(`menu:${defaultMenuId}`, { id: defaultMenuId, name: "Main Menu", slug, order: 0 });
        for (const cat of categories) await tkv.set(`category:${cat.id}`, { ...cat, menuId: defaultMenuId });
        for (const item of items) await tkv.set(`menu-item:${item.id}`, { ...item, menuId: defaultMenuId });
        menus = await tkv.getByPrefix("menu:");
      }
    }
    menus = await ensureMenuSlugs(tkv, menus);
    return c.json({ success: true, data: menus.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.get("/make-server-47a828b2/menus", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    let menus = await tkv.getByPrefix("menu:");
    if (menus.length === 0) {
      const categories = await tkv.getByPrefix("category:");
      const items = await tkv.getByPrefix("menu-item:");
      if (categories.length > 0 || items.length > 0) {
        const defaultMenuId = crypto.randomUUID();
        const slug = ensureUniqueSlug(randomMenuSlug(), new Set());
        await tkv.set(`menu:${defaultMenuId}`, { id: defaultMenuId, name: "Main Menu", slug, order: 0 });
        for (const cat of categories) await tkv.set(`category:${cat.id}`, { ...cat, menuId: defaultMenuId });
        for (const item of items) await tkv.set(`menu-item:${item.id}`, { ...item, menuId: defaultMenuId });
        menus = await tkv.getByPrefix("menu:");
      }
    }
    menus = await ensureMenuSlugs(tkv, menus);
    return c.json({ success: true, data: menus.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get("/menus/by-slug/:slug", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const slug = c.req.param('slug');
    const menus = await tkv.getByPrefix("menu:");
    const migrated = await ensureMenuSlugs(tkv, menus);
    const menu = migrated.find((m) => (m.slug || '').toLowerCase() === slug.toLowerCase());
    if (!menu) return c.json({ success: false, error: 'Menu not found' }, 404);
    return c.json({ success: true, data: menu });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.get("/make-server-47a828b2/menus/by-slug/:slug", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const slug = c.req.param('slug');
    const menus = await tkv.getByPrefix("menu:");
    const migrated = await ensureMenuSlugs(tkv, menus);
    const menu = migrated.find((m) => (m.slug || '').toLowerCase() === slug.toLowerCase());
    if (!menu) return c.json({ success: false, error: 'Menu not found' }, 404);
    return c.json({ success: true, data: menu });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post("/menus", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const name = body.name || "New Menu";
    const menus = await tkv.getByPrefix("menu:");
    const migrated = await ensureMenuSlugs(tkv, menus);
    const existingSlugs = new Set(migrated.map((m) => m.slug).filter(Boolean));
    const slug = ensureUniqueSlug(randomMenuSlug(), existingSlugs);
    const menu = { id, name, slug, order: body.order ?? 0 };
    await withRetry(() => tkv.set(`menu:${id}`, menu), 'Create menu');
    return c.json({ success: true, data: menu });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.post("/make-server-47a828b2/menus", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const name = body.name || "New Menu";
    const menus = await tkv.getByPrefix("menu:");
    const migrated = await ensureMenuSlugs(tkv, menus);
    const existingSlugs = new Set(migrated.map((m) => m.slug).filter(Boolean));
    const slug = ensureUniqueSlug(randomMenuSlug(), existingSlugs);
    const menu = { id, name, slug, order: body.order ?? 0 };
    await withRetry(() => tkv.set(`menu:${id}`, menu), 'Create menu');
    return c.json({ success: true, data: menu });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put("/menus/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await tkv.get(`menu:${id}`);
    const name = body.name ?? existing?.name ?? 'menu';
    const menus = await tkv.getByPrefix("menu:");
    const others = menus.filter((m) => m.id !== id);
    const used = new Set(others.map((m) => m.slug).filter(Boolean));
    const existingSlug = (existing?.slug && String(existing.slug).trim()) ? existing.slug : null;
    const slug = existingSlug ?? ensureUniqueSlug(randomMenuSlug(), used);
    const menu = { ...existing, ...body, id, name, slug };
    await withRetry(() => tkv.set(`menu:${id}`, menu), 'Update menu');
    return c.json({ success: true, data: menu });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.put("/make-server-47a828b2/menus/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await tkv.get(`menu:${id}`);
    const name = body.name ?? existing?.name ?? 'menu';
    const menus = await tkv.getByPrefix("menu:");
    const others = menus.filter((m) => m.id !== id);
    const used = new Set(others.map((m) => m.slug).filter(Boolean));
    const existingSlug = (existing?.slug && String(existing.slug).trim()) ? existing.slug : null;
    const slug = existingSlug ?? ensureUniqueSlug(randomMenuSlug(), used);
    const menu = { ...existing, ...body, id, name, slug };
    await withRetry(() => tkv.set(`menu:${id}`, menu), 'Update menu');
    return c.json({ success: true, data: menu });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

async function deleteMenuById(tkv: ReturnType<typeof tenantKv>, menuId: string) {
  const [menus, categories, items] = await Promise.all([
    tkv.getByPrefix("menu:"),
    tkv.getByPrefix("category:"),
    tkv.getByPrefix("menu-item:"),
  ]);
  let catsToDelete = categories.filter((cat) => (cat.menuId ?? '') === menuId);
  let itemsToDelete = items.filter((item) => (item.menuId ?? '') === menuId);
  if (menus.length === 1 && (catsToDelete.length === 0 || itemsToDelete.length === 0) && (categories.length > 0 || items.length > 0)) {
    catsToDelete = categories;
    itemsToDelete = items;
  }
  const keysToDelete = [
    `menu:${menuId}`,
    ...itemsToDelete.map((i) => `menu-item:${i.id}`),
    ...catsToDelete.map((c) => `category:${c.id}`),
  ].filter(Boolean);
  if (keysToDelete.length > 0) await tkv.mdel(keysToDelete);
  return { menus: 1, categories: catsToDelete.length, menuItems: itemsToDelete.length };
}

app.delete("/menus/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const menuId = c.req.param('id');
    const deleted = await deleteMenuById(tkv, menuId);
    return c.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.delete("/make-server-47a828b2/menus/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const menuId = c.req.param('id');
    const deleted = await deleteMenuById(tkv, menuId);
    return c.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post("/menus/:id/duplicate", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const sourceMenuId = c.req.param('id');
    const sourceMenu = await tkv.get(`menu:${sourceMenuId}`);
    if (!sourceMenu) return c.json({ success: false, error: 'Menu not found' }, 404);
    const newMenuId = crypto.randomUUID();
    const menus = await tkv.getByPrefix("menu:");
    const used = new Set(menus.map((m) => m.slug).filter(Boolean));
    const copySlug = ensureUniqueSlug(randomMenuSlug(), used);
    const newMenu = { id: newMenuId, name: `${sourceMenu.name} (Copy)`, slug: copySlug, order: (sourceMenu.order ?? 0) + 1 };
    await tkv.set(`menu:${newMenuId}`, newMenu);
    const categories = (await tkv.getByPrefix("category:")).filter((cat) => cat.menuId === sourceMenuId);
    const items = (await tkv.getByPrefix("menu-item:")).filter((item) => item.menuId === sourceMenuId);
    for (const cat of categories) await tkv.set(`category:${crypto.randomUUID()}`, { ...cat, id: crypto.randomUUID(), menuId: newMenuId });
    for (const item of items) await tkv.set(`menu-item:${crypto.randomUUID()}`, { ...item, id: crypto.randomUUID(), menuId: newMenuId, category: categories.find((c) => c.id === item.category)?.name ?? item.category });
    return c.json({ success: true, data: newMenu, duplicated: { categories: categories.length, menuItems: items.length } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.post("/make-server-47a828b2/menus/:id/duplicate", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const sourceMenuId = c.req.param('id');
    const sourceMenu = await tkv.get(`menu:${sourceMenuId}`);
    if (!sourceMenu) return c.json({ success: false, error: 'Menu not found' }, 404);
    const newMenuId = crypto.randomUUID();
    const menus = await tkv.getByPrefix("menu:");
    const used = new Set(menus.map((m) => m.slug).filter(Boolean));
    const copySlug = ensureUniqueSlug(randomMenuSlug(), used);
    const newMenu = { id: newMenuId, name: `${sourceMenu.name} (Copy)`, slug: copySlug, order: (sourceMenu.order ?? 0) + 1 };
    await tkv.set(`menu:${newMenuId}`, newMenu);
    const categories = (await tkv.getByPrefix("category:")).filter((cat) => cat.menuId === sourceMenuId);
    const items = (await tkv.getByPrefix("menu-item:")).filter((item) => item.menuId === sourceMenuId);
    for (const cat of categories) {
      const newId = crypto.randomUUID();
      await tkv.set(`category:${newId}`, { ...cat, id: newId, menuId: newMenuId });
    }
    for (const item of items) {
      await tkv.set(`menu-item:${crypto.randomUUID()}`, { ...item, id: crypto.randomUUID(), menuId: newMenuId, category: categories.find((c) => c.id === item.category)?.name ?? item.category });
    }
    return c.json({ success: true, data: newMenu, duplicated: { categories: categories.length, menuItems: items.length } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Menu items
app.get("/menu-items", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const menuId = c.req.query('menuId');
    let items = await tkv.getByPrefix("menu-item:");
    if (menuId) items = items.filter((item) => (item.menuId ?? '') === menuId);
    return c.json({ success: true, data: items });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.get("/make-server-47a828b2/menu-items", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const menuId = c.req.query('menuId');
    let items = await tkv.getByPrefix("menu-item:");
    if (menuId) items = items.filter((item) => (item.menuId ?? '') === menuId);
    return c.json({ success: true, data: items });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get("/menu-items/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const item = await tkv.get(`menu-item:${c.req.param('id')}`);
    if (!item) return c.json({ success: false, error: 'Menu item not found' }, 404);
    return c.json({ success: true, data: item });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.get("/make-server-47a828b2/menu-items/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const item = await tkv.get(`menu-item:${c.req.param('id')}`);
    if (!item) return c.json({ success: false, error: 'Menu item not found' }, 404);
    return c.json({ success: true, data: item });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post("/menu-items", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const item = { ...body, id };
    await withRetry(() => tkv.set(`menu-item:${id}`, item), 'Create menu item');
    return c.json({ success: true, data: item });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.post("/make-server-47a828b2/menu-items", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const item = { ...body, id };
    await withRetry(() => tkv.set(`menu-item:${id}`, item), 'Create menu item');
    return c.json({ success: true, data: item });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put("/menu-items/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const id = c.req.param('id');
    const body = await c.req.json();
    const item = { ...body, id };
    await withRetry(() => tkv.set(`menu-item:${id}`, item), 'Update menu item');
    return c.json({ success: true, data: item });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.put("/make-server-47a828b2/menu-items/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const id = c.req.param('id');
    const body = await c.req.json();
    const item = { ...body, id };
    await withRetry(() => tkv.set(`menu-item:${id}`, item), 'Update menu item');
    return c.json({ success: true, data: item });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.delete("/menu-items/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    await tkv.del(`menu-item:${c.req.param('id')}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.delete("/make-server-47a828b2/menu-items/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    await tkv.del(`menu-item:${c.req.param('id')}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Categories
app.get("/categories", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const menuId = c.req.query('menuId');
    let categories = await tkv.getByPrefix("category:");
    if (menuId) categories = categories.filter((cat) => (cat.menuId ?? '') === menuId);
    return c.json({ success: true, data: categories });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.get("/make-server-47a828b2/categories", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const menuId = c.req.query('menuId');
    let categories = await tkv.getByPrefix("category:");
    if (menuId) categories = categories.filter((cat) => (cat.menuId ?? '') === menuId);
    return c.json({ success: true, data: categories });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get("/categories/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const category = await tkv.get(`category:${c.req.param('id')}`);
    if (!category) return c.json({ success: false, error: 'Category not found' }, 404);
    return c.json({ success: true, data: category });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.get("/make-server-47a828b2/categories/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const category = await tkv.get(`category:${c.req.param('id')}`);
    if (!category) return c.json({ success: false, error: 'Category not found' }, 404);
    return c.json({ success: true, data: category });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post("/categories", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const category = { ...body, id };
    await withRetry(() => tkv.set(`category:${id}`, category), 'Create category');
    return c.json({ success: true, data: category });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.post("/make-server-47a828b2/categories", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const category = { ...body, id };
    await withRetry(() => tkv.set(`category:${id}`, category), 'Create category');
    return c.json({ success: true, data: category });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put("/categories/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const id = c.req.param('id');
    const body = await c.req.json();
    const category = { ...body, id };
    await withRetry(() => tkv.set(`category:${id}`, category), 'Update category');
    return c.json({ success: true, data: category });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.put("/make-server-47a828b2/categories/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const id = c.req.param('id');
    const body = await c.req.json();
    const category = { ...body, id };
    await withRetry(() => tkv.set(`category:${id}`, category), 'Update category');
    return c.json({ success: true, data: category });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.delete("/categories/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    await tkv.del(`category:${c.req.param('id')}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.delete("/make-server-47a828b2/categories/:id", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    await tkv.del(`category:${c.req.param('id')}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// General info
app.get("/general-info", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const info = await tkv.get("general-info");
    if (!info) return c.json({ success: true, data: { restaurantName: 'My Restaurant', tagline: 'Delicious food served daily', phoneNumber: '', logoImage: '', backgroundImage: '', brandColor: '#e7000b', defaultMenuId: '', socialMedia: { facebook: '', instagram: '', tiktok: '', messenger: '' } } });
    return c.json({ success: true, data: info });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.get("/make-server-47a828b2/general-info", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const info = await tkv.get("general-info");
    if (!info) return c.json({ success: true, data: { restaurantName: 'My Restaurant', tagline: 'Delicious food served daily', phoneNumber: '', logoImage: '', backgroundImage: '', brandColor: '#e7000b', defaultMenuId: '', socialMedia: { facebook: '', instagram: '', tiktok: '', messenger: '' } } });
    return c.json({ success: true, data: info });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put("/general-info", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const body = await c.req.json();
    await tkv.set("general-info", body);
    return c.json({ success: true, data: body });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.put("/make-server-47a828b2/general-info", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const body = await c.req.json();
    await tkv.set("general-info", body);
    return c.json({ success: true, data: body });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Addresses (tenant branches)
async function listAddresses(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "addresses");
    if (!featureCheck.ok) return featureCheck.res;
    const tkv = tenantKv(tenantSlug);
    const addresses = (await tkv.getByPrefix("address:"))
      .map((item) => normalizeAddress(item))
      .filter((item): item is BranchAddress => item !== null)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return c.json({ success: true, data: addresses });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.get("/addresses", listAddresses);
app.get("/make-server-47a828b2/addresses", listAddresses);

async function createAddress(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "addresses");
    if (!featureCheck.ok) return featureCheck.res;
    const tkv = tenantKv(tenantSlug);
    const body = await c.req.json();
    const current = await tkv.getByPrefix("address:");
    const normalized = normalizeAddress({
      ...body,
      id: body?.id || crypto.randomUUID(),
      order: body?.order ?? current.length,
    });
    if (!normalized) {
      return c.json({ success: false, error: "Address name is required" }, 400);
    }
    await tkv.set(`address:${normalized.id}`, normalized);
    return c.json({ success: true, data: normalized });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.post("/addresses", createAddress);
app.post("/make-server-47a828b2/addresses", createAddress);

async function updateAddress(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "addresses");
    if (!featureCheck.ok) return featureCheck.res;
    const tkv = tenantKv(tenantSlug);
    const id = c.req.param("id");
    const existing = await tkv.get(`address:${id}`);
    if (!existing) return c.json({ success: false, error: "Address not found" }, 404);
    const body = await c.req.json();
    const normalized = normalizeAddress({
      ...existing,
      ...body,
      id,
      order: body?.order ?? existing.order ?? 0,
    });
    if (!normalized) {
      return c.json({ success: false, error: "Address name is required" }, 400);
    }
    await tkv.set(`address:${id}`, normalized);
    return c.json({ success: true, data: normalized });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.put("/addresses/:id", updateAddress);
app.put("/make-server-47a828b2/addresses/:id", updateAddress);

async function deleteAddress(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "addresses");
    if (!featureCheck.ok) return featureCheck.res;
    const tkv = tenantKv(tenantSlug);
    const id = c.req.param("id");
    await tkv.del(`address:${id}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.delete("/addresses/:id", deleteAddress);
app.delete("/make-server-47a828b2/addresses/:id", deleteAddress);

async function reorderAddresses(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "addresses");
    if (!featureCheck.ok) return featureCheck.res;
    const tkv = tenantKv(tenantSlug);
    const body = await c.req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const normalized = items
      .map((item: unknown) => normalizeAddress(item))
      .filter((item: BranchAddress | null): item is BranchAddress => item !== null)
      .map((item, index) => ({ ...item, order: index }));
    await Promise.all(
      normalized.map((item) => tkv.set(`address:${item.id}`, item))
    );
    return c.json({ success: true, data: normalized });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.put("/addresses/reorder/items", reorderAddresses);
app.put("/make-server-47a828b2/addresses/reorder/items", reorderAddresses);
app.put("/addresses/reorder", reorderAddresses);
app.put("/make-server-47a828b2/addresses/reorder", reorderAddresses);

// Offers
function toOfferView(offer: OfferRecord, menuItemById: Map<string, any>) {
  return {
    ...offer,
    items: offer.itemIds.map((targetId) => {
      const { menuItemId, variantId } = parseOfferTargetId(targetId);
      const item = menuItemById.get(menuItemId);
      const variant =
        variantId && Array.isArray(item?.priceVariants)
          ? item.priceVariants.find((entry: any) => entry?.id === variantId)
          : null;
      const name =
        typeof item?.nameEn === "string" && item.nameEn.trim()
          ? item.nameEn
          : typeof item?.name === "string" && item.name.trim()
          ? item.name
          : menuItemId || targetId;
      const variantName =
        variant && (variant.nameEn || variant.name || variant.nameAr)
          ? (variant.nameEn || variant.name || variant.nameAr)
          : undefined;
      const price =
        typeof variant?.price === "number"
          ? variant.price
          : typeof item?.price === "number"
          ? item.price
          : Array.isArray(item?.priceVariants) && item.priceVariants[0] && typeof item.priceVariants[0].price === "number"
          ? item.priceVariants[0].price
          : undefined;
      return { targetId, menuItemId, variantId, menuItemName: name, variantName, menuItemPrice: price };
    }),
  };
}

async function listOffers(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "offers");
    if (!featureCheck.ok) return featureCheck.res;

    const tkv = tenantKv(tenantSlug);
    const [offersRaw, menuItems] = await Promise.all([
      tkv.getByPrefix("offer:"),
      tkv.getByPrefix("menu-item:"),
    ]);

    const menuItemById = new Map<string, any>();
    for (const item of menuItems) {
      if (item?.id && typeof item.id === "string") {
        menuItemById.set(item.id, item);
      }
    }

    const offers = offersRaw
      .map((row) => normalizeOffer(row))
      .filter((row): row is OfferRecord => row !== null)
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      })
      .map((offer) => toOfferView(offer, menuItemById));

    return c.json({ success: true, data: offers });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.get("/offers", listOffers);
app.get("/make-server-47a828b2/offers", listOffers);

async function createOffer(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "offers");
    if (!featureCheck.ok) return featureCheck.res;

    const tkv = tenantKv(tenantSlug);
    const body = await c.req.json();
    const normalized = normalizeOffer({
      ...body,
      id: body?.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (!normalized) {
      return c.json({ success: false, error: "Invalid offer payload" }, 400);
    }

    await tkv.set(`offer:${normalized.id}`, normalized);
    const menuItems = await tkv.getByPrefix("menu-item:");
    const menuItemById = new Map<string, any>();
    for (const item of menuItems) {
      if (item?.id && typeof item.id === "string") menuItemById.set(item.id, item);
    }
    return c.json({ success: true, data: toOfferView(normalized, menuItemById) });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.post("/offers", createOffer);
app.post("/make-server-47a828b2/offers", createOffer);

async function updateOffer(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "offers");
    if (!featureCheck.ok) return featureCheck.res;

    const tkv = tenantKv(tenantSlug);
    const id = c.req.param("id");
    const existing = await tkv.get(`offer:${id}`);
    if (!existing) return c.json({ success: false, error: "Offer not found" }, 404);
    const body = await c.req.json();
    const normalized = normalizeOffer({
      ...(existing || {}),
      ...body,
      id,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (!normalized) {
      return c.json({ success: false, error: "Invalid offer payload" }, 400);
    }

    await tkv.set(`offer:${id}`, normalized);
    const menuItems = await tkv.getByPrefix("menu-item:");
    const menuItemById = new Map<string, any>();
    for (const item of menuItems) {
      if (item?.id && typeof item.id === "string") menuItemById.set(item.id, item);
    }
    return c.json({ success: true, data: toOfferView(normalized, menuItemById) });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.put("/offers/:id", updateOffer);
app.put("/make-server-47a828b2/offers/:id", updateOffer);

async function deleteOffer(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "offers");
    if (!featureCheck.ok) return featureCheck.res;

    const tkv = tenantKv(tenantSlug);
    const id = c.req.param("id");
    await tkv.del(`offer:${id}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.delete("/offers/:id", deleteOffer);
app.delete("/make-server-47a828b2/offers/:id", deleteOffer);

// ============================================
// LOYALTY STAMP CARD
// ============================================

function generateStampSvg(restaurantName: string, seed: number, brandColor?: string): string {
  const rng = (s: number) => {
    let x = s;
    return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
  };
  const rand = rng(seed);

  const colors = [
    "#B8860B", "#8B0000", "#2F4F4F", "#191970", "#4B0082",
    "#006400", "#8B4513", "#800020", "#36454F", "#704214",
  ];
  const primary = brandColor || colors[Math.floor(rand() * colors.length)];

  const initials = restaurantName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");

  const teethCount = 28 + Math.floor(rand() * 20);
  const innerRingStyle = Math.floor(rand() * 4);
  const outerDecoStyle = Math.floor(rand() * 3);

  let teethPath = "";
  for (let i = 0; i < teethCount; i++) {
    const angle = (2 * Math.PI * i) / teethCount;
    const nextAngle = (2 * Math.PI * (i + 0.5)) / teethCount;
    const outerR = 118;
    const innerR = 112;
    const x1 = 130 + outerR * Math.cos(angle);
    const y1 = 130 + outerR * Math.sin(angle);
    const x2 = 130 + innerR * Math.cos(nextAngle);
    const y2 = 130 + innerR * Math.sin(nextAngle);
    teethPath += `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} `;
  }

  let innerRing = "";
  if (innerRingStyle === 0) {
    innerRing = `<circle cx="130" cy="130" r="90" fill="none" stroke="${primary}" stroke-width="2"/>
      <circle cx="130" cy="130" r="86" fill="none" stroke="${primary}" stroke-width="0.5"/>`;
  } else if (innerRingStyle === 1) {
    const dashCount = 40 + Math.floor(rand() * 20);
    innerRing = `<circle cx="130" cy="130" r="88" fill="none" stroke="${primary}" stroke-width="2" stroke-dasharray="${(2 * Math.PI * 88 / dashCount * 0.6).toFixed(1)} ${(2 * Math.PI * 88 / dashCount * 0.4).toFixed(1)}"/>`;
  } else if (innerRingStyle === 2) {
    let dots = "";
    const dotCount = 24 + Math.floor(rand() * 12);
    for (let i = 0; i < dotCount; i++) {
      const a = (2 * Math.PI * i) / dotCount;
      dots += `<circle cx="${(130 + 88 * Math.cos(a)).toFixed(1)}" cy="${(130 + 88 * Math.sin(a)).toFixed(1)}" r="1.5" fill="${primary}"/>`;
    }
    innerRing = dots;
  } else {
    innerRing = `<circle cx="130" cy="130" r="90" fill="none" stroke="${primary}" stroke-width="1.5"/>
      <circle cx="130" cy="130" r="87" fill="none" stroke="${primary}" stroke-width="1.5"/>`;
  }

  let outerDeco = "";
  if (outerDecoStyle === 0) {
    outerDeco = `<circle cx="130" cy="130" r="105" fill="none" stroke="${primary}" stroke-width="3"/>
      <circle cx="130" cy="130" r="100" fill="none" stroke="${primary}" stroke-width="1"/>`;
  } else if (outerDecoStyle === 1) {
    let stars = "";
    const starCount = 8 + Math.floor(rand() * 6);
    for (let i = 0; i < starCount; i++) {
      const a = (2 * Math.PI * i) / starCount;
      const cx = 130 + 102 * Math.cos(a);
      const cy = 130 + 102 * Math.sin(a);
      stars += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2" fill="${primary}"/>`;
    }
    outerDeco = `<circle cx="130" cy="130" r="105" fill="none" stroke="${primary}" stroke-width="2"/>${stars}`;
  } else {
    outerDeco = `<circle cx="130" cy="130" r="106" fill="none" stroke="${primary}" stroke-width="1.5" stroke-dasharray="6 3"/>
      <circle cx="130" cy="130" r="100" fill="none" stroke="${primary}" stroke-width="2"/>`;
  }

  const fontSize = initials.length > 2 ? 32 : 40;
  const nameDisplay = restaurantName.length <= 20 ? restaurantName : initials;
  const nameFontSize = nameDisplay.length > 12 ? 9 : nameDisplay.length > 8 ? 10 : 12;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" width="260" height="260">
  <circle cx="130" cy="130" r="120" fill="none" stroke="${primary}" stroke-width="2"/>
  <path d="${teethPath}" stroke="${primary}" stroke-width="1.5" fill="none"/>
  ${outerDeco}
  ${innerRing}
  <circle cx="130" cy="130" r="75" fill="none" stroke="${primary}" stroke-width="1"/>
  <text x="130" y="125" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="bold" fill="${primary}" letter-spacing="3">${initials}</text>
  <text x="130" y="155" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${nameFontSize}" fill="${primary}" letter-spacing="1">${nameDisplay}</text>
  <path id="stampArcTop" d="M 40,130 A 90,90 0 0,1 220,130" fill="none"/>
  <text font-family="Georgia, 'Times New Roman', serif" font-size="10" fill="${primary}" letter-spacing="2">
    <textPath href="#stampArcTop" startOffset="50%" text-anchor="middle">★ REWARD EARNED ★</textPath>
  </text>
  <path id="stampArcBot" d="M 220,130 A 90,90 0 0,1 40,130" fill="none"/>
  <text font-family="Georgia, 'Times New Roman', serif" font-size="10" fill="${primary}" letter-spacing="2">
    <textPath href="#stampArcBot" startOffset="50%" text-anchor="middle">✦ LOYALTY STAMP ✦</textPath>
  </text>
</svg>`;
}

type LoyaltyCustomer = {
  phone: string;
  visitCount: number;
  lastVisitDate: string;
  rewardUnlocked: boolean;
  rewardUnlockedAt: string | null;
  createdAt: string;
};

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

function phoneToKey(phone: string): string {
  return `loyalty-customer:${normalizePhone(phone)}`;
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Admin: Get loyalty program
async function getLoyaltyProgram(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "loyalty");
    if (!featureCheck.ok) return featureCheck.res;
    const tkv = tenantKv(tenantSlug);
    const program = await tkv.get("loyalty-program");
    return c.json({ success: true, data: program || null });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.get("/loyalty/program", getLoyaltyProgram);
app.get("/make-server-47a828b2/loyalty/program", getLoyaltyProgram);

// Admin: Save loyalty program
async function saveLoyaltyProgram(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "loyalty");
    if (!featureCheck.ok) return featureCheck.res;
    const tkv = tenantKv(tenantSlug);
    const body = await c.req.json();
    const { name, rewardDescription, visitsNeeded, active } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return c.json({ success: false, error: "Program name is required" }, 400);
    }
    if (!rewardDescription || typeof rewardDescription !== "string" || !rewardDescription.trim()) {
      return c.json({ success: false, error: "Reward description is required" }, 400);
    }
    const goal = Number(visitsNeeded);
    if (!Number.isFinite(goal) || goal < 1 || goal > 100) {
      return c.json({ success: false, error: "Visits needed must be between 1 and 100" }, 400);
    }

    const existing = await tkv.get("loyalty-program");
    let stampSvg = existing?.stampSvg || "";
    let stampSeed = existing?.stampSeed ?? 0;
    const createdAt = existing?.createdAt || new Date().toISOString();

    if (!stampSvg) {
      stampSeed = Math.floor(Math.random() * 2147483647);
      let brandColor: string | undefined;
      try {
        const gi = await tkv.get("general-info");
        if (gi?.brandColor) brandColor = gi.brandColor;
      } catch { /* ignore */ }
      const tenants = await getTenantsList();
      const tenant = tenants.find((t) => t.slug === tenantSlug);
      const displayName = tenant?.name || name.trim();
      stampSvg = generateStampSvg(displayName, stampSeed, brandColor);
    }

    const program = {
      name: name.trim(),
      rewardDescription: rewardDescription.trim(),
      visitsNeeded: goal,
      active: active !== false,
      stampSvg,
      stampSeed,
      createdAt,
    };
    await tkv.set("loyalty-program", program);
    return c.json({ success: true, data: program });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.put("/loyalty/program", saveLoyaltyProgram);
app.put("/make-server-47a828b2/loyalty/program", saveLoyaltyProgram);

// Admin: Get loyalty stats
async function getLoyaltyStats(c: any) {
  try {
    const tenantSlug = getTenantSlugOrDefault(c);
    const featureCheck = await requireFeature(c, tenantSlug, "loyalty");
    if (!featureCheck.ok) return featureCheck.res;
    const tkv = tenantKv(tenantSlug);
    const customers: LoyaltyCustomer[] = await tkv.getByPrefix("loyalty-customer:");

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    let visitsThisMonth = 0;
    let rewardsThisMonth = 0;
    for (const cust of customers) {
      if (cust.lastVisitDate >= monthStart) {
        visitsThisMonth += cust.visitCount;
      }
      if (cust.rewardUnlocked && cust.rewardUnlockedAt && cust.rewardUnlockedAt >= monthStart) {
        rewardsThisMonth++;
      }
    }

    return c.json({
      success: true,
      data: {
        totalEnrolled: customers.length,
        visitsThisMonth,
        rewardsThisMonth,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.get("/loyalty/stats", getLoyaltyStats);
app.get("/make-server-47a828b2/loyalty/stats", getLoyaltyStats);

// Public: Get loyalty program info
async function getPublicLoyaltyProgram(c: any) {
  try {
    const tenantSlug = c.req.param("tenantSlug");
    if (!tenantSlug) return c.json({ success: false, error: "Tenant required" }, 400);
    const enabled = await isFeatureEnabled(tenantSlug, "loyalty");
    if (!enabled) return c.json({ success: false, error: "Loyalty not enabled" }, 404);
    const tkv = tenantKv(tenantSlug);
    const program = await tkv.get("loyalty-program");
    if (!program) return c.json({ success: true, data: null });
    return c.json({
      success: true,
      data: {
        name: program.name,
        rewardDescription: program.rewardDescription,
        visitsNeeded: program.visitsNeeded,
        active: program.active,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.get("/public/loyalty/:tenantSlug", getPublicLoyaltyProgram);
app.get("/make-server-47a828b2/public/loyalty/:tenantSlug", getPublicLoyaltyProgram);

// Public: Customer check-in
async function loyaltyCheckIn(c: any) {
  try {
    const tenantSlug = c.req.param("tenantSlug");
    if (!tenantSlug) return c.json({ success: false, error: "Tenant required" }, 400);
    const enabled = await isFeatureEnabled(tenantSlug, "loyalty");
    if (!enabled) return c.json({ success: false, error: "Loyalty not enabled" }, 404);
    const tkv = tenantKv(tenantSlug);
    const program = await tkv.get("loyalty-program");
    if (!program || !program.active) {
      return c.json({ success: false, error: "Loyalty program is not active" }, 404);
    }

    const body = await c.req.json();
    const rawPhone = body?.phone;
    if (!rawPhone || typeof rawPhone !== "string" || normalizePhone(rawPhone).length < 6) {
      return c.json({ success: false, error: "Valid phone number required" }, 400);
    }
    const phone = normalizePhone(rawPhone);
    const key = phoneToKey(phone);
    const today = todayDateStr();
    let customer: LoyaltyCustomer | null = await tkv.get(key);
    let isNewCustomer = false;

    if (!customer) {
      isNewCustomer = true;
      customer = {
        phone,
        visitCount: 0,
        lastVisitDate: "",
        rewardUnlocked: false,
        rewardUnlockedAt: null,
        createdAt: new Date().toISOString(),
      };
    }

    // If reward was previously unlocked and this is a new day, reset the cycle
    if (customer.rewardUnlocked && customer.lastVisitDate !== today) {
      customer.visitCount = 0;
      customer.rewardUnlocked = false;
      customer.rewardUnlockedAt = null;
    }

    let alreadyCheckedInToday = false;

    if (customer.lastVisitDate === today && !isNewCustomer) {
      alreadyCheckedInToday = true;
    } else {
      customer.visitCount += 1;
      customer.lastVisitDate = today;

      if (customer.visitCount >= program.visitsNeeded && !customer.rewardUnlocked) {
        customer.rewardUnlocked = true;
        customer.rewardUnlockedAt = new Date().toISOString();
      }
    }

    await tkv.set(key, customer);

    return c.json({
      success: true,
      data: {
        visitCount: customer.visitCount,
        visitsNeeded: program.visitsNeeded,
        rewardUnlocked: customer.rewardUnlocked,
        rewardUnlockedAt: customer.rewardUnlockedAt,
        stampSvg: customer.rewardUnlocked ? program.stampSvg : null,
        alreadyCheckedInToday,
        isNewCustomer,
        programName: program.name,
        rewardDescription: program.rewardDescription,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.post("/public/loyalty/:tenantSlug/checkin", loyaltyCheckIn);
app.post("/make-server-47a828b2/public/loyalty/:tenantSlug/checkin", loyaltyCheckIn);

// Image upload
app.post("/upload-image", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ success: false, error: 'No file provided' }, 400);
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const bucketName = 'make-47a828b2-menu-images';
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) return c.json({ success: false, error: `Upload error: ${uploadError.message}` }, 500);
    const { data: urlData, error: urlError } = await supabase.storage.from(bucketName).createSignedUrl(fileName, 315360000);
    if (urlError || !urlData) return c.json({ success: false, error: 'Failed to create signed URL' }, 500);
    return c.json({ success: true, data: { url: urlData.signedUrl, fileName } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.post("/make-server-47a828b2/upload-image", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ success: false, error: 'No file provided' }, 400);
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const bucketName = 'make-47a828b2-menu-images';
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) return c.json({ success: false, error: `Upload error: ${uploadError.message}` }, 500);
    const { data: urlData, error: urlError } = await supabase.storage.from(bucketName).createSignedUrl(fileName, 315360000);
    if (urlError || !urlData) return c.json({ success: false, error: 'Failed to create signed URL' }, 500);
    return c.json({ success: true, data: { url: urlData.signedUrl, fileName } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Initialize database with default data (only if empty)
app.post("/initialize", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const existingMenus = await tkv.getByPrefix("menu:");
    if (existingMenus.length > 0) return c.json({ success: true, message: 'Database already initialized', alreadyInitialized: true });
    const { menuItems, categories, generalInfo } = await c.req.json();
    const menuId = crypto.randomUUID();
    const promises = [];
    promises.push(tkv.set(`menu:${menuId}`, { id: menuId, name: "Main Menu", order: 0 }));
    for (const item of menuItems) promises.push(tkv.set(`menu-item:${item.id}`, { ...item, menuId }));
    for (const category of categories) promises.push(tkv.set(`category:${category.id}`, { ...category, menuId }));
    promises.push(tkv.set("general-info", { ...generalInfo, defaultMenuId: generalInfo.defaultMenuId ?? menuId }));
    await Promise.all(promises);
    return c.json({ success: true, message: 'Database initialized successfully', alreadyInitialized: false });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.post("/make-server-47a828b2/initialize", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const existingMenus = await tkv.getByPrefix("menu:");
    if (existingMenus.length > 0) return c.json({ success: true, message: 'Database already initialized', alreadyInitialized: true });
    const { menuItems, categories, generalInfo } = await c.req.json();
    const menuId = crypto.randomUUID();
    const promises = [];
    promises.push(tkv.set(`menu:${menuId}`, { id: menuId, name: "Main Menu", order: 0 }));
    for (const item of menuItems) promises.push(tkv.set(`menu-item:${item.id}`, { ...item, menuId }));
    for (const category of categories) promises.push(tkv.set(`category:${category.id}`, { ...category, menuId }));
    promises.push(tkv.set("general-info", { ...generalInfo, defaultMenuId: generalInfo.defaultMenuId ?? menuId }));
    await Promise.all(promises);
    return c.json({ success: true, message: 'Database initialized successfully', alreadyInitialized: false });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clear all menus, menu items and categories from database
app.delete("/clear-all", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const menuItems = await tkv.getByPrefix("menu-item:");
    const categories = await tkv.getByPrefix("category:");
    const menus = await tkv.getByPrefix("menu:");
    const deletePromises = [];
    for (const item of menuItems) deletePromises.push(tkv.del(`menu-item:${item.id}`));
    for (const category of categories) deletePromises.push(tkv.del(`category:${category.id}`));
    for (const menu of menus) deletePromises.push(tkv.del(`menu:${menu.id}`));
    await Promise.all(deletePromises);
    return c.json({ success: true, message: `Deleted ${menus.length} menus, ${menuItems.length} menu items and ${categories.length} categories`, deleted: { menus: menus.length, menuItems: menuItems.length, categories: categories.length } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
app.delete("/make-server-47a828b2/clear-all", async (c) => {
  try {
    const tkv = tenantKv(getTenant(c));
    const menuItems = await tkv.getByPrefix("menu-item:");
    const categories = await tkv.getByPrefix("category:");
    const menus = await tkv.getByPrefix("menu:");
    const deletePromises = [];
    for (const item of menuItems) deletePromises.push(tkv.del(`menu-item:${item.id}`));
    for (const category of categories) deletePromises.push(tkv.del(`category:${category.id}`));
    for (const menu of menus) deletePromises.push(tkv.del(`menu:${menu.id}`));
    await Promise.all(deletePromises);
    return c.json({ success: true, message: `Deleted ${menus.length} menus, ${menuItems.length} menu items and ${categories.length} categories`, deleted: { menus: menus.length, menuItems: menuItems.length, categories: categories.length } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// SUPER ADMIN - Tenant Management
// ============================================
// Super Admin auth: verify Supabase Auth JWT and check email against SUPER_ADMIN_EMAILS (comma-separated)
function getSuperAdminEmails(): string[] {
  return (Deno.env.get("SUPER_ADMIN_EMAILS") ?? "").split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
}

async function requireSuperAdmin(c: any): Promise<{ ok: false; res: Response } | { ok: true }> {
  const allowedEmails = getSuperAdminEmails();
  if (allowedEmails.length === 0) {
    return { ok: false, res: c.json({ success: false, error: "Super Admin not configured. Set SUPER_ADMIN_EMAILS (comma-separated emails) in Edge Function secrets." }, 503) };
  }
  const token = c.req.header("X-Super-Admin-Token");
  if (!token) {
    return { ok: false, res: c.json({ success: false, error: "Unauthorized" }, 401) };
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { ok: false, res: c.json({ success: false, error: "Invalid or expired token" }, 401) };
    }
    const email = (user.email ?? "").trim().toLowerCase();
    if (!email || !allowedEmails.includes(email)) {
      return { ok: false, res: c.json({ success: false, error: "Not authorized as Super Admin. Ensure your email is in SUPER_ADMIN_EMAILS." }, 403) };
    }
    return { ok: true };
  } catch (err) {
    console.error("Super Admin auth error:", err);
    return { ok: false, res: c.json({ success: false, error: "Unauthorized" }, 401) };
  }
}

const TENANTS_KEY = "_meta:tenants";

async function getTenantsList(): Promise<TenantRecord[]> {
  const data = await kv.get(TENANTS_KEY);
  let list = (data?.tenants ?? [])
    .map((tenant: unknown) => normalizeTenantRecord(tenant))
    .filter((tenant: TenantRecord | null): tenant is TenantRecord => tenant !== null);
  // Include "default" if missing and legacy unprefixed data exists
  if (!list.some((t) => t.slug === "default")) {
    const menus = await kv.getByPrefix("menu:");
    const hasLegacy = menus.length > 0;
    if (hasLegacy) {
      const defaultTenant: TenantRecord = {
        slug: "default",
        name: "Default",
        createdAt: new Date().toISOString(),
        featureFlags: {},
      };
      list = [defaultTenant, ...list];
      await kv.set(TENANTS_KEY, { tenants: list });
    }
  }
  return list;
}

async function getTenantFeatureFlags(tenantSlug: string): Promise<TenantFeatureFlags> {
  const tenants = await getTenantsList();
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) return {};
  return normalizeFeatureFlags(tenant.featureFlags);
}

async function isFeatureEnabled(tenantSlug: string, featureKey: string): Promise<boolean> {
  const flags = await getTenantFeatureFlags(tenantSlug);
  return flags[featureKey] === true;
}

async function requireFeature(
  c: any,
  tenantSlug: string,
  featureKey: string
): Promise<{ ok: false; res: Response } | { ok: true }> {
  const enabled = await isFeatureEnabled(tenantSlug, featureKey);
  if (enabled) return { ok: true };
  return {
    ok: false,
    res: c.json(
      {
        success: false,
        error: "Feature is disabled for this tenant",
        code: "feature_disabled",
        featureKey,
      },
      403
    ),
  };
}

async function superAdminGetTenants(c: any) {
  try {
    const auth = await requireSuperAdmin(c);
    if (!auth.ok) return auth.res;
    const tenants = await getTenantsList();
    const data = tenants.map(({ adminUserId, ...t }) => ({
      ...t,
      featureFlags: normalizeFeatureFlags(t.featureFlags),
    }));
    return c.json({ success: true, data });
  } catch (error) {
    console.error("Error listing tenants:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.get("/super-admin/tenants", superAdminGetTenants);
app.get("/make-server-47a828b2/super-admin/tenants", superAdminGetTenants);

async function superAdminVerify(c: any) {
  const auth = await requireSuperAdmin(c);
  if (!auth.ok) return auth.res;
  return c.json({ success: true });
}
app.get("/super-admin/verify", superAdminVerify);
app.get("/make-server-47a828b2/super-admin/verify", superAdminVerify);

async function superAdminCreateTenant(c: any) {
  try {
    const auth = await requireSuperAdmin(c);
    if (!auth.ok) return auth.res;
    const body = await c.req.json();
    const slug = (body.slug ?? body.name ?? "").toString().trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "") || "tenant";
    const name = (body.name ?? slug).toString().trim() || slug;
    const adminEmail = (body.adminEmail ?? "").toString().trim();
    const adminPassword = (body.adminPassword ?? "").toString();
    const featureFlags = normalizeFeatureFlags(body.featureFlags);
    if (!adminEmail || !adminPassword) {
      return c.json({ success: false, error: "Admin email and password are required" }, 400);
    }
    if (adminPassword.length < 6) {
      return c.json({ success: false, error: "Password must be at least 6 characters" }, 400);
    }
    const tenants = await getTenantsList();
    if (tenants.some((t) => t.slug === slug)) {
      return c.json({ success: false, error: "Tenant slug already exists" }, 400);
    }
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { tenant_slug: slug },
    });
    if (authError) {
      const msg = authError.message ?? String(authError);
      return c.json({ success: false, error: msg.includes("already") ? "Email already registered" : msg }, 400);
    }
    const active = body.active !== false;
    const newTenant: TenantRecord = {
      slug,
      name,
      adminEmail,
      adminUserId: authUser?.user?.id,
      active,
      createdAt: new Date().toISOString(),
      featureFlags,
    };
    await kv.set(TENANTS_KEY, { tenants: [...tenants, newTenant] });
    return c.json({ success: true, data: { ...newTenant, adminUserId: undefined } });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.post("/super-admin/tenants", superAdminCreateTenant);
app.post("/make-server-47a828b2/super-admin/tenants", superAdminCreateTenant);

async function superAdminUpdateTenant(c: any) {
  try {
    const auth = await requireSuperAdmin(c);
    if (!auth.ok) return auth.res;
    const oldSlug = c.req.param("slug");
    const body = await c.req.json();
    let newSlug = (body.slug ?? body.url ?? "").toString().trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
    const newName = (body.name ?? "").toString().trim();
    const active = body.active;
    const newAdminEmail = (body.adminEmail ?? "").toString().trim();
    const newAdminPassword = (body.adminPassword ?? "").toString();
    const hasFeatureFlagsUpdate = Object.prototype.hasOwnProperty.call(body, "featureFlags");
    const featureFlagsUpdate = hasFeatureFlagsUpdate ? normalizeFeatureFlags(body.featureFlags) : null;
    if (!newSlug) newSlug = oldSlug;
    const tenants = await getTenantsList();
    const tenant = tenants.find((t) => t.slug === oldSlug);
    if (!tenant) return c.json({ success: false, error: "Tenant not found" }, 404);
    if (newAdminEmail && !newAdminEmail.includes("@")) {
      return c.json({ success: false, error: "Valid admin email required" }, 400);
    }
    if (newAdminPassword && newAdminPassword.length < 6) {
      return c.json({ success: false, error: "Password must be at least 6 characters" }, 400);
    }
    const adminUserId = tenant.adminUserId;
    const slugChange = newSlug !== oldSlug;
    if ((newAdminEmail || newAdminPassword || slugChange) && adminUserId) {
      const updateData: { email?: string; password?: string; user_metadata?: Record<string, unknown> } = {};
      if (newAdminEmail) updateData.email = newAdminEmail;
      if (newAdminPassword) updateData.password = newAdminPassword;
      if (slugChange) updateData.user_metadata = { tenant_slug: newSlug };
      const { error: updateError } = await supabase.auth.admin.updateUserById(adminUserId, updateData);
      if (updateError) {
        const msg = updateError.message ?? String(updateError);
        return c.json({ success: false, error: msg.includes("already") ? "Email already registered" : msg }, 400);
      }
    }
    if (newSlug !== oldSlug && tenants.some((t) => t.slug === newSlug)) {
      return c.json({ success: false, error: "Slug already exists" }, 400);
    }
    if (newSlug !== oldSlug) {
      const prefix = `tenant:${oldSlug}:`;
      const { data: rows } = await supabase.from("kv_store_47a828b2").select("key, value").like("key", prefix + "%");
      for (const row of rows ?? []) {
        const suffix = (row.key as string).slice(prefix.length);
        await kv.set(`tenant:${newSlug}:${suffix}`, row.value);
        await kv.del(row.key as string);
      }
    }
    const updatedTenants = tenants.map((t) => {
      if (t.slug !== oldSlug) return t;
      const updated: TenantRecord = { ...t, slug: newSlug, name: newName || newSlug };
      if (typeof active === "boolean") updated.active = active;
      if (newAdminEmail) updated.adminEmail = newAdminEmail;
      if (hasFeatureFlagsUpdate && featureFlagsUpdate) updated.featureFlags = featureFlagsUpdate;
      return updated;
    });
    await kv.set(TENANTS_KEY, { tenants: updatedTenants });
    const updatedRecord = updatedTenants.find((t) => t.slug === newSlug)!;
    return c.json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error("Error updating tenant:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.put("/super-admin/tenants/:slug", superAdminUpdateTenant);
app.put("/make-server-47a828b2/super-admin/tenants/:slug", superAdminUpdateTenant);

async function deleteAllTenantData(slug: string): Promise<void> {
  if (slug === "default") {
    const prefixes = ["menu:", "category:", "menu-item:"];
    const keysToDelete: string[] = [];
    for (const p of prefixes) {
      const { data: rows } = await supabase.from("kv_store_47a828b2").select("key").like("key", p + "%");
      for (const r of rows ?? []) keysToDelete.push(r.key as string);
    }
    const info = await kv.get("general-info");
    if (info) keysToDelete.push("general-info");
    if (keysToDelete.length > 0) await kv.mdel(keysToDelete);
  } else {
    const prefix = `tenant:${slug}:`;
    const { data: rows } = await supabase.from("kv_store_47a828b2").select("key").like("key", prefix + "%");
    const keysToDelete = (rows ?? []).map((r) => r.key as string);
    if (keysToDelete.length > 0) await kv.mdel(keysToDelete);
  }
}

async function superAdminDeleteTenant(c: any) {
  try {
    const auth = await requireSuperAdmin(c);
    if (!auth.ok) return auth.res;
    const slug = c.req.param("slug");
    const tenants = await getTenantsList();
    const tenant = tenants.find((t) => t.slug === slug);
    if (!tenant) {
      return c.json({ success: false, error: "Tenant not found" }, 404);
    }
    const adminUserId = tenant.adminUserId;
    if (adminUserId) {
      try {
        await supabase.auth.admin.deleteUser(adminUserId);
      } catch (delErr) {
        console.warn("Could not delete tenant auth user:", delErr);
      }
    }
    await deleteAllTenantData(slug);
    const updated = tenants.filter((t) => t.slug !== slug);
    await kv.set(TENANTS_KEY, { tenants: updated });
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
}
app.delete("/super-admin/tenants/:slug", superAdminDeleteTenant);
app.delete("/make-server-47a828b2/super-admin/tenants/:slug", superAdminDeleteTenant);

Deno.serve(app.fetch);