import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { Helmet } from 'react-helmet-async';
import { Star, AlertCircle, Gift, Phone, Share2 } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { MenuItem, Category, GeneralInfo } from '../types/menu';
import type { OfferWithItems } from '../types/offers';
import { customerMenuApi, menuItemsApi, categoriesApi, generalInfoApi, menusApi, offersApi, publicLoyaltyApi } from '../services/api';
import type { PublicLoyaltyProgram } from '../types/loyalty';
import { LoyaltyBottomSheet } from './LoyaltyBottomSheet';
import { ShareBottomSheet } from './ShareBottomSheet';
import { trackMenuItemClick } from '../lib/analytics';
import { optimizeImageUrl } from '/utils/imageCdn';
import { getActiveOfferForItem, getDiscountedPrice, hasActiveOfferForItem } from '../lib/offers';
import { hasTwoLayerMatrix, normalizePricingModel, getMatrixCellPrice } from '../lib/pricing';
import { toast } from 'sonner';
import svgPaths from '@/imports/svg-t21ykul132';

// All menu views use only General Info for branding and contact: color, logo, cover image, tagline/bio, phone, social links.
// Menu entities only define structure (name, slug, categories, items); they do not override branding.

// Translation dictionary
const translations = {
  ar: {
    allItems: 'جميع الأصناف',
    popular: 'مشهور',
    egp: 'ج.م',
    loading: 'جاري التحميل...',
    limitedTimeOffer: 'عرض لفترة محدودة',
    getYourGift: 'احصل على هديتك',
  },
  en: {
    allItems: 'All Items',
    popular: 'Popular',
    egp: 'EGP',
    loading: 'Loading...',
    limitedTimeOffer: 'Limited time offer',
    getYourGift: 'Get your Gift',
  },
};

interface CustomerMenuProps {
  slug?: string;
}

const CUSTOMER_MENU_CACHE_TTL_MS = 5 * 60 * 1000;

export function CustomerMenu({ slug }: CustomerMenuProps) {
  const { basePath, tenantSlug, tenantName } = useTenant();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null);
  const [offers, setOffers] = useState<OfferWithItems[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  /** Selected price variant id per item (when item has priceVariants). */
  const [selectedVariantByItemId, setSelectedVariantByItemId] = useState<Record<string, string>>({});
  /** Selected row+column combination per item (when item has two-layer matrix). */
  const [selectedMatrixByItemId, setSelectedMatrixByItemId] = useState<Record<string, { rowOptionId: string; columnOptionId: string }>>({});
  const [loyaltyProgram, setLoyaltyProgram] = useState<PublicLoyaltyProgram | null>(null);
  const [loyaltySheetOpen, setLoyaltySheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [highlightTrackIndex, setHighlightTrackIndex] = useState(1); // 1 = first real slide when infinite
  const [highlightSnapping, setHighlightSnapping] = useState(false);
  const [highlightDragPx, setHighlightDragPx] = useState(0);
  const highlightsTouchStartX = useRef<number | null>(null);
  const highlightViewportRef = useRef<HTMLDivElement | null>(null);
  const highlightTrackIndexRef = useRef(1);
  const highlightSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightIsDraggingRef = useRef(false);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(true);

  const t = translations[language];

  const getCacheKey = () => `customer-menu:${tenantSlug}:${slug ?? '__default__'}`;

  const hydrateFromCache = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(getCacheKey());
      if (!raw) return false;
      const parsed = JSON.parse(raw) as {
        cachedAt: number;
        menuItems: MenuItem[];
        categories: Category[];
        generalInfo: GeneralInfo;
      };
      if (!parsed.cachedAt || Date.now() - parsed.cachedAt > CUSTOMER_MENU_CACHE_TTL_MS) {
        localStorage.removeItem(getCacheKey());
        return false;
      }
      setMenuItems(parsed.menuItems || []);
      setCategories(parsed.categories || []);
      setGeneralInfo(parsed.generalInfo || null);
      setIsLoading(false);
      return true;
    } catch {
      return false;
    }
  };

  const persistCache = (payload: {
    menuItems: MenuItem[];
    categories: Category[];
    generalInfo: GeneralInfo;
  }) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        getCacheKey(),
        JSON.stringify({
          cachedAt: Date.now(),
          ...payload,
        })
      );
    } catch {
      // Ignore cache write failures.
    }
  };

  useEffect(() => {
    const hasCache = hydrateFromCache();
    loadMenuData({ showLoader: !hasCache });
  }, [slug, tenantSlug]);

  const loadMenuData = async ({ showLoader = true }: { showLoader?: boolean } = {}) => {
    try {
      if (showLoader) setIsLoading(true);
      let infoData: GeneralInfo;
      let menuData: MenuItem[];
      let categoriesData: Category[];

      try {
        const bundle = await customerMenuApi.getPublicBundle(tenantSlug, slug);
        infoData = bundle.generalInfo;
        menuData = bundle.items || [];
        categoriesData = bundle.categories || [];
      } catch {
        // Fallback for old backend versions before public bundle exists.
        try {
          const bundle = await customerMenuApi.getBundle(slug);
          infoData = bundle.generalInfo;
          menuData = bundle.items || [];
          categoriesData = bundle.categories || [];
        } catch {
          // Final fallback for very old backend versions before /menu-bundle exists.
        let menuId: string | undefined;
        if (slug) {
          try {
            const [info, menu] = await Promise.all([
              generalInfoApi.get(),
              menusApi.getBySlug(slug),
            ]);
            infoData = info;
            menuId = menu.id;
          } catch {
            setMenuItems([]);
            setCategories([]);
            setLoadError('Menu not found');
            return;
          }
        } else {
          const [info, menusData] = await Promise.all([
            generalInfoApi.get(),
            menusApi.getAll(),
          ]);
          infoData = info;
          menuId = infoData.defaultMenuId || menusData[0]?.id;
        }
        if (!menuId) {
          setMenuItems([]);
          setCategories([]);
          setGeneralInfo(infoData);
          return;
        }
        [menuData, categoriesData] = await Promise.all([
          menuItemsApi.getAll(menuId),
          categoriesApi.getAll(menuId),
        ]);
        }
      }
      setGeneralInfo(infoData);
      // Load offers and loyalty in parallel, non-blocking — menu shows immediately when bundle is ready
      offersApi.getAll().then(setOffers).catch((error) => {
        if (
          !(error instanceof Error) ||
          (!error.message.includes('feature_disabled') && !error.message.includes('Feature is disabled'))
        ) {
          console.warn('Could not load offers:', error);
        }
        setOffers([]);
      });
      publicLoyaltyApi.getProgram(tenantSlug).then((lp) => {
        if (lp?.active) setLoyaltyProgram(lp);
      }).catch(() => {});

      // Migrate old data structure to new structure
      const migratedMenuItems = menuData.map(item => {
        // If item has old structure (pricing object), migrate to new structure
        if (item.pricing && typeof item.pricing === 'object' && !item.price) {
          // Extract first price from old pricing matrix
          let price = 0;
          const variations = Object.values(item.pricing || {});
          if (variations.length > 0) {
            const mealTypes = Object.values(variations[0] || {});
            if (mealTypes.length > 0) {
              price = mealTypes[0] as number;
            }
          }
          
          return {
            ...item,
            id: item.id,
            name: item.name,
            category: item.category,
            description: item.description ?? '',
            price,
            image: item.image,
            isAvailable: item.isAvailable,
            isPopular: item.isPopular,
            order: item.order,
          };
        }
        
        // Return item as-is (keep dual-language fields if present)
        return {
          ...item,
          id: item.id,
          name: item.name,
          category: item.category,
          description: item.description ?? '',
          price: item.price || 0,
          image: item.image,
          isAvailable: item.isAvailable,
          isPopular: item.isPopular,
          order: item.order,
        };
      });

      // Remove duplicates - check by both ID and content (name + category + price)
      const seen = new Set<string>();
      const uniqueItems = migratedMenuItems.filter(item => {
        const idKey = item.id;
        const contentKey = `${item.name}_${item.category}_${item.price}`;
        
        // Skip if we've seen this exact ID or content before
        if (seen.has(idKey) || seen.has(contentKey)) {
          return false;
        }
        
        seen.add(idKey);
        seen.add(contentKey);
        return true;
      });

      // Sort items and categories by order
      const sortedMenuItems = uniqueItems
        .filter(item => item.isAvailable)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      
      const sortedCategories = (categoriesData || [])
        .filter((c) => c.isAvailable !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      setMenuItems(sortedMenuItems);
      setCategories(sortedCategories);
      persistCache({
        menuItems: sortedMenuItems,
        categories: sortedCategories,
        generalInfo: infoData,
      });
    } catch (error) {
      console.error('Error loading menu data:', error);
      // Show more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to load menu';
      toast.error(`Menu loading error: ${errorMessage}`);
      setLoadError(errorMessage);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // Scroll spy effect
  useEffect(() => {
    if (!isUserScrolling.current) return;

    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px',
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (!isUserScrolling.current) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const categoryId = entry.target.getAttribute('data-category');
          if (categoryId) {
            setActiveCategory(categoryId);
            centerActiveTab(categoryId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all category sections
    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [categories, menuItems]);

  const highlightImages = generalInfo?.highlightImages ?? [];

  // Infinite slides: [clone last, ...real, clone first] so we can scroll endlessly
  const highlightInfiniteSlides = useMemo(() => {
    if (highlightImages.length <= 1) return highlightImages;
    const first = highlightImages[0];
    const last = highlightImages[highlightImages.length - 1];
    return [last, ...highlightImages, first];
  }, [highlightImages]);

  const highlightSlideCount = highlightInfiniteSlides.length;
  const highlightRealCount = highlightImages.length;
  const effectiveTrackIndex = highlightRealCount <= 1 ? 0 : highlightTrackIndex;

  // Keep ref in sync for transition-end and autoplay
  highlightTrackIndexRef.current = highlightTrackIndex;

  // After transition ends: snap from clone back to real slide (use ref so we see current index)
  const handleHighlightTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.target !== e.currentTarget || highlightRealCount <= 1) return;
      if (highlightSnapTimeoutRef.current) {
        clearTimeout(highlightSnapTimeoutRef.current);
        highlightSnapTimeoutRef.current = null;
      }
      const i = highlightTrackIndexRef.current;
      if (i === 0) {
        setHighlightSnapping(true);
        setHighlightTrackIndex(highlightRealCount);
      } else if (i === highlightSlideCount - 1) {
        setHighlightSnapping(true);
        setHighlightTrackIndex(1);
      }
    },
    [highlightRealCount, highlightSlideCount]
  );

  // Fallback: snap if transitionend didn't fire when we're on a clone
  useEffect(() => {
    if (highlightRealCount <= 1) return;
    if (highlightTrackIndex === 0 || highlightTrackIndex === highlightSlideCount - 1) {
      highlightSnapTimeoutRef.current = setTimeout(() => {
        highlightSnapTimeoutRef.current = null;
        const i = highlightTrackIndexRef.current;
        if (i === 0) {
          setHighlightSnapping(true);
          setHighlightTrackIndex(highlightRealCount);
        } else if (i === highlightSlideCount - 1) {
          setHighlightSnapping(true);
          setHighlightTrackIndex(1);
        }
      }, 400);
    }
    return () => {
      if (highlightSnapTimeoutRef.current) {
        clearTimeout(highlightSnapTimeoutRef.current);
        highlightSnapTimeoutRef.current = null;
      }
    };
  }, [highlightTrackIndex, highlightRealCount, highlightSlideCount]);

  useEffect(() => {
    if (!highlightSnapping) return;
    const id = setTimeout(() => setHighlightSnapping(false), 50);
    return () => clearTimeout(id);
  }, [highlightSnapping]);

  // Autoplay: always advance to the right (first → second → third → first …)
  useEffect(() => {
    if (highlightRealCount <= 1) return;
    const interval = setInterval(() => {
      if (highlightIsDraggingRef.current) return;
      setHighlightTrackIndex((i) => {
        if (i >= highlightSlideCount - 1) return highlightSlideCount - 1; // show clone, then snap to 1
        return i + 1;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [highlightRealCount, highlightSlideCount]);

  // Default to first category when categories load
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
  }, [categories]);

  const centerActiveTab = (categoryId: string) => {
    const tabElement = tabRefs.current[categoryId];
    const containerElement = tabContainerRef.current;

    if (tabElement && containerElement) {
      const tabRect = tabElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      
      const tabCenter = tabRect.left + tabRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const scrollOffset = tabCenter - containerCenter;

      containerElement.scrollBy({
        left: scrollOffset,
        behavior: 'smooth',
      });
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    isUserScrolling.current = false;
    setActiveCategory(categoryId);
    
    const targetCategoryId = categoryId;
    const element = categoryRefs.current[targetCategoryId];
    
    if (element) {
      // Scroll to category section with offset for sticky header
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      centerActiveTab(categoryId);

      // Re-enable scroll spy after scrolling completes
      setTimeout(() => {
        isUserScrolling.current = true;
      }, 1000);
    }
  };

  // Group items by category once per categories/menuItems change.
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};
    categories.forEach((category) => {
      grouped[category.name] = [];
    });
    menuItems.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [categories, menuItems]);

  const activeOfferByItemId = useMemo(() => {
    const map = new Map<string, OfferWithItems>();
    for (const item of menuItems) {
      let defaultVariantId: string | undefined;
      if (hasTwoLayerMatrix(item) && item.optionGroups && item.pricingMatrix) {
        const rowGroup = item.optionGroups.find((g) => g.id === item.pricingMatrix!.rowGroupId);
        const colGroup = item.optionGroups.find((g) => g.id === item.pricingMatrix!.columnGroupId);
        const rowId = rowGroup?.options?.[0]?.id;
        const colId = colGroup?.options?.[0]?.id;
        if (rowId && colId) defaultVariantId = `${rowId}::${colId}`;
      } else if (Array.isArray(item.priceVariants) && item.priceVariants.length > 0) {
        defaultVariantId = item.priceVariants[0]?.id;
      }
      const offer = getActiveOfferForItem(item.id, defaultVariantId, offers);
      if (offer) map.set(item.id, offer);
    }
    return map;
  }, [menuItems, offers]);

  const featuredOfferItems = useMemo(
    () => menuItems.filter((item) => hasActiveOfferForItem(item.id, offers)),
    [menuItems, offers]
  );

  // Dual-language: show name/description by customer's selected language
  const getItemName = (item: MenuItem) =>
    language === 'en' ? (item.nameEn || item.name || '') : (item.nameAr || item.name || '');
  const getItemDescription = (item: MenuItem) =>
    language === 'en' ? (item.descriptionEn ?? item.description ?? '') : (item.descriptionAr ?? item.description ?? '');

  // Category name by selected language (same as item name/description)
  const getCategoryName = (category: Category) =>
    language === 'en' ? (category.name || '') : (category.nameAr || category.name || '');
  const categoryDisplayNameByName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      map[cat.name] = getCategoryName(cat);
    });
    return map;
  }, [categories, language]);

  const getCategoryDisplayName = (categoryName: string) =>
    categoryDisplayNameByName[categoryName] ?? categoryName;

  const getSelectedVariant = (item: MenuItem) => {
    const variants = item.priceVariants && item.priceVariants.length > 0 ? item.priceVariants : null;
    if (!variants) return null;
    const selectedId = selectedVariantByItemId[item.id];
    const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
    return selected;
  };
  const setSelectedVariant = (itemId: string, variantId: string) => {
    setSelectedVariantByItemId((prev) => ({ ...prev, [itemId]: variantId }));
  };

  const getSelectedMatrixCombination = (item: MenuItem) => {
    if (!hasTwoLayerMatrix(item) || !item.optionGroups || !item.pricingMatrix) return null;
    const rowGroup = item.optionGroups.find((g) => g.id === item.pricingMatrix!.rowGroupId);
    const colGroup = item.optionGroups.find((g) => g.id === item.pricingMatrix!.columnGroupId);
    if (!rowGroup || !colGroup || rowGroup.options.length === 0 || colGroup.options.length === 0) return null;
    const sel = selectedMatrixByItemId[item.id];
    const rowOpt = rowGroup.options.find((o) => o.id === sel?.rowOptionId) ?? rowGroup.options[0];
    const colOpt = colGroup.options.find((o) => o.id === sel?.columnOptionId) ?? colGroup.options[0];
    return { rowOptionId: rowOpt.id, columnOptionId: colOpt.id };
  };
  const setSelectedMatrix = (itemId: string, rowOptionId: string, columnOptionId: string) => {
    setSelectedMatrixByItemId((prev) => ({ ...prev, [itemId]: { rowOptionId, columnOptionId } }));
  };

  const getOptionName = (o: { name?: string; nameEn?: string; nameAr?: string }) =>
    language === 'en' ? (o.nameEn || o.name || '') : (o.nameAr || o.name || '');

  const getVariantName = (v: { name?: string; nameEn?: string; nameAr?: string }) =>
    language === 'en' ? (v.nameEn || v.name || '') : (v.nameAr || v.name || '');

  const getItemBasePrice = (item: MenuItem): number => {
    if (hasTwoLayerMatrix(item)) {
      const combo = getSelectedMatrixCombination(item);
      if (combo) {
        const p = getMatrixCellPrice(item, combo.rowOptionId, combo.columnOptionId);
        if (p != null) return p;
      }
      const model = normalizePricingModel(item);
      if (model.kind === 'matrix' && model.pricingMatrix.cells.length > 0) {
        return Math.min(...model.pricingMatrix.cells.map((c) => c.price));
      }
    }
    const variant = getSelectedVariant(item);
    return variant ? (variant.discountedPrice != null && variant.discountedPrice > 0 ? variant.discountedPrice : variant.price) : item.price ?? 0;
  };

  const handleMenuItemClick = (item: MenuItem) => {
    trackMenuItemClick({
      itemId: item.id,
      itemName: getItemName(item),
      categoryName: item.category,
      tenantSlug,
      menuSlug: slug,
      language,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            viewBox="0 0 200 200"
            className="w-12 h-12 animate-spin mx-auto mb-4"
            fill="none"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M153.666 65.0996L135.777 100.1L153.666 135.1H117.889L99.999 100.1L117.889 65.0996H153.666ZM99.666 100L81.7773 135H46L63.8887 100L46 65H81.7773L99.666 100Z"
              fill="black"
            />
          </svg>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!generalInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Menu Unavailable</h2>
          <p className="text-gray-600 mb-4">
            {loadError || 'Failed to load menu data. Please check that the server is running.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm text-blue-900 font-semibold mb-2">For Administrators:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure Supabase Edge Functions are deployed</li>
              <li>• Check server logs in Supabase dashboard</li>
              <li>• Verify database has been initialized</li>
              <li>• Go to <a href="/login" className="underline">Admin login</a> to set up the menu</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const brandColor = generalInfo.brandColor || '#e7000b';

  const displayName = tenantName || generalInfo.restaurantName || '';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'BR';

  const lcpImageUrl = highlightImages[0] ?? generalInfo.backgroundImage ?? generalInfo.logoImage;
  const lcpPreloadUrl = lcpImageUrl ? optimizeImageUrl(lcpImageUrl) : null;

  return (
    <div className="relative min-h-screen bg-white max-w-[600px] mx-auto shadow-lg" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {lcpPreloadUrl && (
        <Helmet>
          <link rel="preload" as="image" href={lcpPreloadUrl} />
        </Helmet>
      )}
      {/* Header: hero / highlights slider + restaurant info block */}
      <div className="w-full">
        {highlightImages.length > 0 ? (
          /* Slider highlights: one card at a time, infinite (loop right), drag-to-swipe + autoplay */
          <div className="w-full p-4 pt-4 pb-0">
            <div className="group" role="group" dir="ltr">
              <div
                ref={highlightViewportRef}
                className="w-full overflow-hidden rounded-2xl touch-pan-y"
              >
                <div
                  className={`flex select-none ${highlightSnapping || highlightDragPx !== 0 ? '' : 'transition-transform duration-300 ease-out'}`}
                  style={{
                    width: `${highlightSlideCount * 100}%`,
                    transform: `translateX(calc(-${effectiveTrackIndex * (100 / highlightSlideCount)}% + ${highlightDragPx}px))`,
                  }}
                  onTransitionEnd={handleHighlightTransitionEnd}
                  onTouchStart={(e) => {
                    highlightIsDraggingRef.current = true;
                    highlightsTouchStartX.current = e.targetTouches[0].clientX;
                    setHighlightDragPx(0);
                  }}
                  onTouchMove={(e) => {
                    const start = highlightsTouchStartX.current;
                    if (start == null) return;
                    const x = e.targetTouches[0].clientX;
                    setHighlightDragPx(x - start);
                  }}
                  onTouchEnd={(e) => {
                    highlightIsDraggingRef.current = false;
                    const start = highlightsTouchStartX.current;
                    if (start == null) return;
                    highlightsTouchStartX.current = null;
                    const end = e.changedTouches[0].clientX;
                    const delta = start - end;
                    const viewportW = highlightViewportRef.current?.clientWidth ?? 300;
                    const threshold = Math.min(viewportW * 0.2, 60);
                    if (delta > threshold) {
                      setHighlightTrackIndex((i) => Math.min(i + 1, highlightSlideCount - 1));
                    } else if (delta < -threshold) {
                      setHighlightTrackIndex((i) => Math.max(i - 1, 0));
                    }
                    setHighlightDragPx(0);
                  }}
                >
                  {highlightInfiniteSlides.map((src, i) => (
                    <div
                      key={i}
                      className="flex shrink-0 min-w-0"
                      style={{ flexBasis: `${100 / highlightSlideCount}%` }}
                    >
                      <div className="relative w-full aspect-video bg-gray-100 rounded-2xl overflow-hidden">
                        <img
                          src={optimizeImageUrl(src)}
                          alt=""
                          className="w-full h-full object-cover rounded-2xl pointer-events-none select-none"
                          draggable={false}
                          fetchPriority={i === (highlightRealCount <= 1 ? 0 : 1) ? 'high' : 'auto'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Single hero image (legacy) */
          <div
            className="w-full overflow-hidden rounded-t-2xl"
            style={{ backgroundColor: brandColor, minHeight: 200 }}
          >
            {generalInfo.backgroundImage ? (
              <img
                src={optimizeImageUrl(generalInfo.backgroundImage)}
                alt=""
                className="w-full h-[220px] object-cover"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-[220px]" />
            )}
          </div>
        )}

        {/* Restaurant info block - white, logo left (no padding) / name + phone + slogan + social right, share opposite logo */}
        <div className="bg-white w-full px-6 py-5 flex gap-2 items-start">
          {/* Left: logo / brand square - no padding, fills box */}
          <div
            className="shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: brandColor }}
          >
            {generalInfo.logoImage ? (
              <img
                src={generalInfo.logoImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-white text-center leading-tight py-0.5 px-1">
                <p className="text-[9px] font-bold uppercase" style={{ lineHeight: 1.2 }}>
                  {displayName.split(/\s+/).slice(0, 2).join(' ').toUpperCase() || 'MENU'}
                </p>
                <p className="text-base font-bold mt-0.5">{initials}</p>
              </div>
            )}
          </div>

          {/* Right: name, phone, slogan with arrow, social - left-aligned */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h1 className="font-bold text-xl text-black leading-tight">
              {tenantName || generalInfo.restaurantName || generalInfo.tagline || 'Menu'}
            </h1>
            {generalInfo.phoneNumber && (
              <a
                href={`tel:${generalInfo.phoneNumber.replace(/\s/g, '')}`}
                className="flex items-center gap-1.5 text-black text-sm"
              >
                <Phone size={14} style={{ color: brandColor }} />
                <span>{generalInfo.phoneNumber}</span>
              </a>
            )}
            {generalInfo.tagline && (
              <p className="text-sm text-black">
                {generalInfo.tagline}
              </p>
            )}
            {(() => {
              const sm = generalInfo.socialMedia || {};
              const hasFacebook = sm.facebook?.trim?.();
              const hasInstagram = sm.instagram?.trim?.();
              const hasTiktok = sm.tiktok?.trim?.();
              const hasMessenger = sm.messenger?.trim?.();
              const hasAny = hasFacebook || hasInstagram || hasTiktok || hasMessenger;
              if (!hasAny) return null;
              return (
                <div className="flex gap-2.5 items-center mt-1.5">
                  {hasFacebook && (
                    <a
                      href={sm.facebook!.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-9 rounded-full bg-white border border-black flex items-center justify-center shrink-0"
                      aria-label="Facebook"
                    >
                      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 12 22">
                        <path d={svgPaths.p1471f500} fill="black" />
                      </svg>
                    </a>
                  )}
                  {hasTiktok && (
                    <a
                      href={sm.tiktok!.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-9 rounded-full bg-white border border-black flex items-center justify-center shrink-0"
                      aria-label="TikTok"
                    >
                      <img src="/icons/tiktok.svg" alt="" className="size-5 object-contain" aria-hidden />
                    </a>
                  )}
                  {hasInstagram && (
                    <a
                      href={sm.instagram!.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-9 rounded-full bg-white border border-black flex items-center justify-center shrink-0"
                      aria-label="Instagram"
                    >
                      <img src="/icons/instagram.svg" alt="" className="size-5 object-contain" aria-hidden />
                    </a>
                  )}
                  {hasMessenger && (
                    <a
                      href={sm.messenger!.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-9 rounded-full bg-white border border-black flex items-center justify-center shrink-0"
                      aria-label="Messenger"
                    >
                      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 21.9948 22">
                        <path d={svgPaths.p30c89400} fill="black" />
                      </svg>
                    </a>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right: share button - opposite of logo */}
          <button
            onClick={() => setShareSheetOpen(true)}
            className="shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: brandColor }}
            aria-label={language === 'ar' ? 'مشاركة' : 'Share'}
          >
            <Share2 className="size-6" />
          </button>
        </div>
      </div>

      {/* Category Tabs - Sticky */}
      <div className="bg-white/95 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 shadow-sm">
        <div className="min-h-[64px] flex items-center">
          {/* Language Switcher - Fixed, doesn't scroll */}
          <div className={`flex items-center gap-3 shrink-0 py-4 ${language === 'ar' ? 'pl-0 pr-[10px]' : 'pl-[10px] pr-0'}`}>
            <button
              onClick={() => setLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
              className="px-6 py-2.5 rounded-full font-bold text-xs uppercase whitespace-nowrap transition-all text-white border shadow-md"
              style={{ backgroundColor: brandColor, borderColor: brandColor }}
              aria-label="Switch language"
            >
              {language === 'ar' ? 'ع' : 'EN'}
            </button>
            <div className="h-8 w-px bg-gray-300" />
          </div>
          {/* Category tabs - Scrollable */}
          <div ref={tabContainerRef} className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide flex items-center gap-3 py-4 pl-[10px] pr-3">
            {categories.map((category) => (
              <button
                key={category.id}
                ref={(el) => (tabRefs.current[category.name] = el)}
                onClick={() => handleCategoryClick(category.name)}
                className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase whitespace-nowrap shrink-0 transition-all ${
                  activeCategory === category.name
                    ? 'text-white border shadow-md scale-105'
                    : 'bg-[#f4f4f5] text-[#3f3f46] border'
                }`}
                style={activeCategory === category.name ? { 
                  backgroundColor: brandColor, 
                  borderColor: brandColor 
                } : { 
                  borderColor: `${brandColor}33` 
                }}
              >
                {getCategoryName(category)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active offers strip: right under tabs */}
      {featuredOfferItems.length > 0 && (
        <div style={{ backgroundColor: `${brandColor}1A`, contentVisibility: 'auto' }}>
          {/* Big centered title with % icons */}
          <div className="text-center py-6 px-4">
            <h2 className="font-bold text-2xl sm:text-3xl text-[#18181b] uppercase tracking-tight">
              <span className="text-[#52525c] font-normal" aria-hidden>%</span>
              {' '}{t.limitedTimeOffer}{' '}
              <span className="text-[#52525c] font-normal" aria-hidden>%</span>
            </h2>
          </div>
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-3 w-max p-5 pt-0">
              {featuredOfferItems.map((item) => {
                const offer = activeOfferByItemId.get(item.id) ?? null;
                const basePrice = hasTwoLayerMatrix(item)
                  ? (() => {
                      const model = normalizePricingModel(item);
                      if (model.kind === 'matrix' && model.pricingMatrix.cells.length > 0) {
                        return Math.min(...model.pricingMatrix.cells.map((c) => c.price));
                      }
                      return item.price ?? 0;
                    })()
                  : (Array.isArray(item.priceVariants) && item.priceVariants.length > 0
                    ? item.priceVariants[0].price
                    : item.price ?? 0);
                const discounted = getDiscountedPrice(basePrice, offer);
                return (
                  <div
                    key={`offer-strip-${item.id}`}
                    className="w-[220px] rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0"
                  >
                    <div className="relative">
                      {item.image ? (
                        <img src={item.image} alt={getItemName(item)} className="h-[220px] w-full object-cover" />
                      ) : (
                        <div className="h-[220px] w-full bg-gray-100" />
                      )}
                      {offer && (
                        <span className="absolute top-2 right-2 rounded-full px-3 py-1.5 text-sm font-bold text-black shadow-md bg-[#cfff5e]">
                          {offer.discountPct}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className={`font-semibold text-xl text-[#18181b] uppercase tracking-tight line-clamp-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
                        {getItemName(item)}
                      </p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 line-through">{basePrice} {t.egp}</span>
                        <span className="font-bold text-2xl tracking-tight text-black px-2 py-0.5 rounded-md bg-[#cfff5e]">
                          {discounted}
                        </span>
                        <span className="text-sm font-normal text-gray-500">{t.egp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items - Continuous List */}
      <div className="flex flex-col pb-6">
        {/* Category Sections - All categories shown in sequence; loyalty banner after middle category */}
        {categories.map((category, index) => {
          const categoryItems = itemsByCategory[category.name] || [];
          if (categoryItems.length === 0) return null;
          const showLoyaltyAfterThis = index === Math.floor(categories.length / 2);

          return (
            <Fragment key={category.id}>
            <div
              ref={(el) => (categoryRefs.current[category.name] = el)}
              data-category={category.name}
              className="scroll-mt-[100px]"
              style={{ contentVisibility: 'auto' }}
            >
              {categoryItems.map((item) => {
                const isMatrix = hasTwoLayerMatrix(item);
                const selectedVariant = getSelectedVariant(item);
                const selectedMatrix = getSelectedMatrixCombination(item);
                const variantIdForOffer = isMatrix && selectedMatrix
                  ? `${selectedMatrix.rowOptionId}::${selectedMatrix.columnOptionId}`
                  : selectedVariant?.id;
                const activeOffer = getActiveOfferForItem(item.id, variantIdForOffer, offers);
                return (
                  <div
                    key={item.id}
                    className="bg-white overflow-hidden mb-4 cursor-pointer"
                    onClick={() => handleMenuItemClick(item)}
                  >
                  {/* Item Image - hidden when no image or when image fails to load */}
                  {item.image && !failedImageIds.has(item.id) && (
                    <div className="w-full flex justify-center overflow-hidden">
                      <img 
                        src={item.image} 
                        alt={getItemName(item)} 
                        loading="lazy"
                        decoding="async"
                        className="max-w-full w-full h-auto max-h-[420px] sm:max-h-[420px] md:max-h-[420px] object-contain"
                        onError={() => setFailedImageIds(prev => new Set(prev).add(item.id))}
                      />
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="px-6 pt-4 pb-4 flex flex-col gap-2">
                    {/* Category and Popular Badge */}
                    <div className="flex items-start justify-between">
                      <p 
                        className="font-bold text-xs uppercase"
                        style={{ color: brandColor }}
                      >
                        {getCategoryDisplayName(item.category)}
                      </p>
                      <div className="flex items-center gap-2">
                        {item.isPopular && (
                          <div 
                            className="px-2 py-1 rounded-lg flex items-center gap-1.5"
                            style={{ backgroundColor: brandColor }}
                          >
                            <Star size={12} fill="white" stroke="white" />
                            <p className="font-bold text-[10px] text-white uppercase tracking-wider">
                              {t.popular}
                            </p>
                          </div>
                        )}
                        {activeOffer && (
                          <div className="px-2 py-1 rounded-lg bg-[#cfff5e] text-black">
                            <p className="font-bold text-[10px] uppercase tracking-wider">{activeOffer.discountPct}% OFF</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item Name (by language) */}
                    <h3 className={`font-semibold text-xl text-[#18181b] uppercase tracking-tight ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      {getItemName(item)}
                    </h3>

                    {/* Description (by language) */}
                    <p className={`font-normal text-sm text-[#52525c] leading-[22.75px] tracking-tight ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      {getItemDescription(item)}
                    </p>

                    {/* Two-layer matrix: row group then column group */}
                    {isMatrix && item.optionGroups && item.pricingMatrix && item.optionGroups.length >= 2 && (() => {
                      const rowGroup = item.optionGroups.find((g) => g.id === item.pricingMatrix!.rowGroupId);
                      const colGroup = item.optionGroups.find((g) => g.id === item.pricingMatrix!.columnGroupId);
                      if (!rowGroup || !colGroup) return null;
                      const rowOpts = rowGroup.options || [];
                      const colOpts = colGroup.options || [];
                      const sel = selectedMatrix;
                      return (
                        <div className="space-y-2 mt-2">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              {rowOpts.map((o) => {
                                const isSelected = sel?.rowOptionId === o.id;
                                return (
                                  <button
                                    key={o.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const colId = sel?.columnOptionId ?? colOpts[0]?.id ?? '';
                                      setSelectedMatrix(item.id, o.id, colId);
                                    }}
                                    className={`px-4 py-2 rounded-full font-bold text-xs uppercase whitespace-nowrap transition-all border ${
                                      isSelected ? 'text-white border-transparent shadow-md' : 'bg-[#f4f4f5] text-[#3f3f46] border-gray-200'
                                    }`}
                                    style={isSelected ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                                  >
                                    {getOptionName(o)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="flex flex-wrap gap-2">
                              {colOpts.map((o) => {
                                const isSelected = sel?.columnOptionId === o.id;
                                return (
                                  <button
                                    key={o.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rowId = sel?.rowOptionId ?? rowOpts[0]?.id ?? '';
                                      setSelectedMatrix(item.id, rowId, o.id);
                                    }}
                                    className={`px-4 py-2 rounded-full font-bold text-xs uppercase whitespace-nowrap transition-all border ${
                                      isSelected ? 'text-white border-transparent shadow-md' : 'bg-[#f4f4f5] text-[#3f3f46] border-gray-200'
                                    }`}
                                    style={isSelected ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                                  >
                                    {getOptionName(o)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Flat variants: single row of pills */}
                    {!isMatrix && item.priceVariants && item.priceVariants.length > 1 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.priceVariants.map((v) => {
                          const isSelected = selectedVariant?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVariant(item.id, v.id);
                              }}
                              className={`px-4 py-2 rounded-full font-bold text-xs uppercase whitespace-nowrap transition-all border ${
                                isSelected ? 'text-white border-transparent shadow-md' : 'bg-[#f4f4f5] text-[#3f3f46] border-gray-200'
                              }`}
                              style={isSelected ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                            >
                              {getVariantName(v)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Price with active offer support */}
                    <div className="mt-2 mb-2 flex flex-wrap items-baseline gap-1.5">
                      {(() => {
                        const basePrice = getItemBasePrice(item);
                        const discountedPrice = getDiscountedPrice(basePrice, activeOffer);
                        if (!activeOffer) {
                          return (
                            <p className="flex items-baseline gap-1.5">
                              <span className="font-bold text-2xl tracking-tight text-[#000]">{basePrice}</span>
                              <span className="text-sm font-normal text-gray-500">{t.egp}</span>
                            </p>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-500 line-through">{basePrice} {t.egp}</span>
                            <span className="font-bold text-2xl tracking-tight text-black px-2 py-0.5 rounded-md bg-[#cfff5e]">
                              {discountedPrice}
                            </span>
                            <span className="text-sm font-normal text-gray-500">{t.egp}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Item Divider */}
                  <div className="h-px mx-6 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
                );
              })}
            </div>
            {showLoyaltyAfterThis && loyaltyProgram && (
              <div className="px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setLoyaltySheetOpen(true)}
                  className="w-full rounded-[28px] overflow-hidden text-left cursor-pointer block shadow-lg transition-transform active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(180deg, ${brandColor} 0%, ${brandColor}E6 100%)`,
                    boxShadow: `0 4px 14px ${brandColor}40`,
                  }}
                >
                  <div className="relative py-8 px-6">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
                      <Gift className="absolute top-3 left-4 w-10 h-10 opacity-20" style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />
                      <Gift className="absolute top-2 right-6 w-8 h-8 opacity-20" style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />
                      <Gift className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 opacity-15" style={{ color: 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
                    </div>
                    <div className="relative">
                      <h3 className="font-bold text-lg sm:text-xl text-white text-center uppercase tracking-tight">
                        {loyaltyProgram.name}
                      </h3>
                      <p className="font-normal text-sm text-white/95 text-center mt-1 line-clamp-2">
                        {loyaltyProgram.rewardDescription}
                      </p>
                    </div>
                    <div className="relative mt-6 flex justify-center">
                      <span
                        className="inline-flex items-center justify-center gap-2 w-full max-w-[280px] py-3.5 px-6 rounded-full bg-white shadow-md"
                        style={{ color: brandColor }}
                      >
                        <Gift className="w-5 h-5 shrink-0" strokeWidth={2} />
                        <span className="font-semibold text-base">{t.getYourGift}</span>
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            )}
            </Fragment>
          );
        })}
      </div>

      {/* Loyalty bottom sheet (rendered once, opened by banner) */}
      {loyaltyProgram && (
        <LoyaltyBottomSheet
          open={loyaltySheetOpen}
          onOpenChange={setLoyaltySheetOpen}
          program={loyaltyProgram}
          tenantSlug={tenantSlug}
          language={language}
          brandColor={brandColor}
        />
      )}

      {/* Share bottom sheet */}
      <ShareBottomSheet
        open={shareSheetOpen}
        onOpenChange={setShareSheetOpen}
        shareUrl={typeof window !== 'undefined' ? `${window.location.origin}${basePath}/menu${slug ? `/${slug}` : ''}` : ''}
        language={language}
        brandColor={brandColor}
      />
    </div>
  );
}