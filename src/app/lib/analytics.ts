type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

type PageViewPayload = {
  path: string;
  title?: string;
  tenantSlug?: string;
  menuSlug?: string;
  language?: string;
};

type MenuItemClickPayload = {
  itemId: string;
  itemName: string;
  categoryName?: string;
  tenantSlug?: string;
  menuSlug?: string;
  language?: string;
};

type LandingCtaClickPayload = {
  ctaName: string;
  ctaLocation?: string;
  targetPath?: string;
  tenantSlug?: string;
  menuSlug?: string;
  language?: string;
};

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const IS_GA_ENABLED = import.meta.env.PROD && Boolean(GA_MEASUREMENT_ID);
let hasInitialized = false;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function isAnalyticsEnabled(): boolean {
  return IS_GA_ENABLED;
}

export function initAnalytics(): void {
  if (!IS_GA_ENABLED || hasInitialized || typeof window === 'undefined') {
    return;
  }
  // GA bootstrap now lives in index.html to ensure it initializes before app code runs.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer.push(args));
  hasInitialized = true;
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (!IS_GA_ENABLED || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', eventName, params);
}

export function trackPageView(payload: PageViewPayload): void {
  trackEvent('page_view', {
    page_path: payload.path,
    page_title: payload.title,
    tenant_slug: payload.tenantSlug,
    menu_slug: payload.menuSlug,
    language: payload.language,
  });
}

export function trackMenuItemClick(payload: MenuItemClickPayload): void {
  trackEvent('menu_item_click', {
    item_id: payload.itemId,
    item_name: payload.itemName,
    category_name: payload.categoryName,
    tenant_slug: payload.tenantSlug,
    menu_slug: payload.menuSlug,
    language: payload.language,
  });
}

export function trackLandingCtaClick(payload: LandingCtaClickPayload): void {
  trackEvent('landing_cta_click', {
    cta_name: payload.ctaName,
    cta_location: payload.ctaLocation,
    target_path: payload.targetPath,
    tenant_slug: payload.tenantSlug,
    menu_slug: payload.menuSlug,
    language: payload.language,
  });
}
