/**
 * Netlify Edge Function: SSR menu data for /t/:restaurantSlug/menu and /t/:restaurantSlug/menu/:menuSlug.
 * Fetches menu bundle from Supabase KV, injects it as __MENU_DATA__ into the HTML <head> so the client
 * can render the hero image immediately (improves LCP).
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const KV_TABLE = "kv_store_47a828b2";
const TENANTS_KEY = "_meta:tenants";
const DEFAULT_GENERAL_INFO = {
  restaurantName: "My Restaurant",
  tagline: "Delicious food served daily",
  phoneNumber: "",
  logoImage: "",
  backgroundImage: "",
  brandColor: "#e7000b",
  defaultMenuId: "",
  socialMedia: { facebook: "", instagram: "", tiktok: "", messenger: "" },
};

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
function randomMenuSlug(length = 6): string {
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

/** In-memory ensureMenuSlugs (no KV writes). */
function ensureMenuSlugsInMemory(menus: { id: string; slug?: string; name?: string; order?: number }[]): typeof menus {
  const used = new Set<string>();
  return menus.map((m) => {
    const existing = m.slug && String(m.slug).trim() ? m.slug : null;
    const slug = existing && !used.has(existing) ? existing : ensureUniqueSlug(randomMenuSlug(), used);
    used.add(slug);
    return { ...m, slug };
  });
}

function tenantPrefix(tenantSlug: string | null | undefined): string {
  if (!tenantSlug || tenantSlug === "default") return "";
  return `tenant:${tenantSlug}:`;
}

export default async (
  request: Request,
  context: { next: () => Promise<Response> }
): Promise<Response> => {
  const url = new URL(request.url);
  if (request.method !== "GET" || !url.pathname.startsWith("/t/")) {
    return context.next();
  }

  const match = url.pathname.match(/^\/t\/([^/]+)\/menu(?:\/([^/]+))?\/?$/);
  if (!match) return context.next();

  const restaurantSlug = decodeURIComponent(match[1]);
  const menuSlug = match[2] ? decodeURIComponent(match[2]) : undefined;

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRoleKey || !supabaseUrl) {
    return context.next();
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const p = tenantPrefix(restaurantSlug);

  try {
    // Non-default tenants: ensure tenant exists and is active
    if (restaurantSlug && restaurantSlug !== "default") {
      const { data: tenantsData } = await supabase
        .from(KV_TABLE)
        .select("value")
        .eq("key", TENANTS_KEY)
        .maybeSingle();
      const tenants = (tenantsData?.value?.tenants ?? []) as { slug: string; active?: boolean }[];
      const tenant = tenants.find((t) => t.slug === restaurantSlug);
      if (!tenant || tenant.active === false) {
        return context.next();
      }
    }

    const keyPrefix = p;
    const generalInfoKey = keyPrefix + "general-info";
    const menuPrefix = keyPrefix + "menu:";
    const categoryPrefix = keyPrefix + "category:";
    const itemPrefix = keyPrefix + "menu-item:";

    const [
      { data: generalInfoRow },
      { data: menuRows },
      { data: categoryRows },
      { data: itemRows },
    ] = await Promise.all([
      supabase.from(KV_TABLE).select("value").eq("key", generalInfoKey).maybeSingle(),
      supabase.from(KV_TABLE).select("key, value").like("key", menuPrefix + "%"),
      supabase.from(KV_TABLE).select("key, value").like("key", categoryPrefix + "%"),
      supabase.from(KV_TABLE).select("key, value").like("key", itemPrefix + "%"),
    ]);

    let menus = (menuRows ?? []).map((r) => r.value);
    const allCategories = (categoryRows ?? []).map((r) => r.value);
    const allItems = (itemRows ?? []).map((r) => r.value);

    if (menus.length === 0 && (allCategories.length > 0 || allItems.length > 0)) {
      const defaultMenuId = crypto.randomUUID();
      const slug = ensureUniqueSlug(randomMenuSlug(), new Set());
      menus = [{ id: defaultMenuId, name: "Main Menu", slug, order: 0 }];
    }

    const migratedMenus = ensureMenuSlugsInMemory(menus);
    const generalInfo = generalInfoRow?.value ?? DEFAULT_GENERAL_INFO;

    let selectedMenu: (typeof migratedMenus)[0] | null = null;
    if (menuSlug) {
      selectedMenu =
        migratedMenus.find((m) => (m.slug || "").toLowerCase() === menuSlug.toLowerCase()) ?? null;
      if (!selectedMenu) return context.next();
    } else {
      const defaultMenuId = generalInfo.defaultMenuId;
      selectedMenu =
        migratedMenus.find((m) => m.id === defaultMenuId) ?? migratedMenus[0] ?? null;
    }

    const sortedMenus = [...migratedMenus].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const menuId = selectedMenu?.id ?? "";
    const categories = allCategories
      .filter((c: { menuId?: string }) => (c.menuId ?? "") === menuId)
      .sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));
    const items = allItems
      .filter((i: { menuId?: string }) => (i.menuId ?? "") === menuId)
      .sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0));

    const bundle = {
      menu: selectedMenu,
      menus: sortedMenus,
      categories,
      items,
      generalInfo,
    };

    const heroImageUrl =
      (generalInfo as { highlightImages?: string[] }).highlightImages?.[0] ??
      generalInfo.backgroundImage ??
      generalInfo.logoImage ??
      "";

    const response = await context.next();
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return response;

    let html = await response.text();

    if (heroImageUrl && typeof heroImageUrl === "string" && heroImageUrl.startsWith("http")) {
      const preloadTag = `<link rel="preload" as="image" href="${escapeHtmlAttr(heroImageUrl)}" fetchpriority="high">`;
      const firstLinkIdx = html.indexOf("<link");
      if (firstLinkIdx !== -1) {
        html = html.slice(0, firstLinkIdx) + preloadTag + html.slice(firstLinkIdx);
      }
    }

    const scriptTag = `<script id="__MENU_DATA__" type="application/json">${escapeJsonInScript(JSON.stringify(bundle))}</script>`;
    const headClose = "</head>";
    const idx = html.indexOf(headClose);
    if (idx !== -1) {
      html = html.slice(0, idx) + scriptTag + headClose + html.slice(idx);
    }

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": response.headers.get("Cache-Control") ?? "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
      }),
    });
  } catch (_) {
    return context.next();
  }
};

function escapeJsonInScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function escapeHtmlAttr(url: string): string {
  return url
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
