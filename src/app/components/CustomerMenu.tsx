import { useState, useEffect, useRef, useMemo } from 'react';
import { Star, AlertCircle } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { MenuItem, Category, GeneralInfo } from '../types/menu';
import { customerMenuApi, menuItemsApi, categoriesApi, generalInfoApi, menusApi } from '../services/api';
import { trackMenuItemClick } from '../lib/analytics';
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
  },
  en: {
    allItems: 'All Items',
    popular: 'Popular',
    egp: 'EGP',
    loading: 'Loading...',
  },
};

interface CustomerMenuProps {
  slug?: string;
}

const CUSTOMER_MENU_CACHE_TTL_MS = 5 * 60 * 1000;

export function CustomerMenu({ slug }: CustomerMenuProps) {
  const { basePath, tenantSlug } = useTenant();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  /** Selected price variant id per item (when item has priceVariants). */
  const [selectedVariantByItemId, setSelectedVariantByItemId] = useState<Record<string, string>>({});

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
      
      const sortedCategories = (categoriesData || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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

  const getVariantName = (v: { name?: string; nameEn?: string; nameAr?: string }) =>
    language === 'en' ? (v.nameEn || v.name || '') : (v.nameAr || v.name || '');

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

  return (
    <div className="min-h-screen bg-white max-w-[600px] mx-auto shadow-lg" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header - all branding from General Info; height follows content */}
      <div className="relative">
        {/* Background: cover image from General Info, or solid brand color — fills header */}
        <div className="absolute inset-0 w-full overflow-hidden" style={{ backgroundColor: brandColor }}>
          {generalInfo.backgroundImage && (
            <img
              src={generalInfo.backgroundImage}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent"
            style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.5), ${brandColor})` }}
          />
        </div>

        {/* Logo and Info Card — in flow so header height = content */}
        <div className="relative w-full flex flex-col items-center pt-8">
          {/* Logo Circle */}
          {generalInfo.logoImage && (
            <div className="relative w-[250px] h-[250px] rounded-full mb-0 top-[130px]">
              <div className="absolute inset-0 rounded-full border-[6px] border-white overflow-hidden">
                <img 
                  src={generalInfo.logoImage} 
                  alt="Logo" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-white w-full rounded-none pt-[150px] pb-8 px-6 flex flex-col gap-6">
            {/* Phone and Tagline */}
            <div className="flex flex-col">
              {generalInfo.phoneNumber && (
                <p className="text-base text-black text-center leading-8">
                  ☎ {generalInfo.phoneNumber}
                </p>
              )}
              <p className="text-base text-black text-center leading-8">
                {generalInfo.tagline}
              </p>
            </div>

            {/* Social Media Icons - only show when the corresponding link is filled */}
            {(() => {
              const sm = generalInfo.socialMedia || {};
              const hasFacebook = sm.facebook?.trim?.();
              const hasInstagram = sm.instagram?.trim?.();
              const hasTiktok = sm.tiktok?.trim?.();
              const hasMessenger = sm.messenger?.trim?.();
              const hasAny = hasFacebook || hasInstagram || hasTiktok || hasMessenger;
              if (!hasAny) return null;
              return (
                <div className="flex flex-wrap gap-2.5 items-center justify-center">
                  {hasFacebook && (
                    <a
                      href={sm.facebook!.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#f2f2f2] p-2.5 rounded-full flex items-center justify-center size-9 max-h-9 shrink-0"
                      aria-label="Facebook"
                    >
                      <svg className="size-full max-h-9 max-w-9 shrink-0" fill="none" preserveAspectRatio="xMidYMid meet" viewBox="0 0 12 22">
                        <path d={svgPaths.p1471f500} fill="black" />
                      </svg>
                    </a>
                  )}
                  {hasInstagram && (
                    <a
                      href={sm.instagram!.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#f2f2f2] p-2.5 rounded-full flex items-center justify-center size-9 max-h-9 shrink-0 text-black"
                      aria-label="Instagram"
                    >
                      <img src="/icons/instagram.svg" alt="" className="size-full max-h-9 max-w-9 object-contain" aria-hidden />
                    </a>
                  )}
                  {hasTiktok && (
                    <a
                      href={sm.tiktok!.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#f2f2f2] p-2.5 rounded-full flex items-center justify-center size-9 max-h-9 shrink-0 text-black"
                      aria-label="TikTok"
                    >
                      <img src="/icons/tiktok.svg" alt="" className="size-full max-h-9 max-w-9 object-contain" aria-hidden />
                    </a>
                  )}
                  {hasMessenger && (
                    <a
                      href={sm.messenger!.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#f2f2f2] p-2.5 rounded-full flex items-center justify-center size-9 max-h-9 shrink-0"
                      aria-label="Messenger"
                    >
                      <svg className="size-full max-h-9 max-w-9 shrink-0" fill="none" preserveAspectRatio="xMidYMid meet" viewBox="0 0 21.9948 22">
                        <path d={svgPaths.p30c89400} fill="black" />
                      </svg>
                    </a>
                  )}
                </div>
              );
            })()}

          </div>
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

      {/* Menu Items - Continuous List */}
      <div className="flex flex-col pb-6">
        {/* Category Sections - All categories shown in sequence */}
        {categories.map((category) => {
          const categoryItems = itemsByCategory[category.name] || [];
          if (categoryItems.length === 0) return null;

          return (
            <div
              key={category.id}
              ref={(el) => (categoryRefs.current[category.name] = el)}
              data-category={category.name}
              className="scroll-mt-[100px]"
            >
              {categoryItems.map((item) => (
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
                    </div>

                    {/* Item Name (by language) */}
                    <h3 className={`font-semibold text-xl text-[#18181b] uppercase tracking-tight ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      {getItemName(item)}
                    </h3>

                    {/* Description (by language) */}
                    <p className={`font-normal text-sm text-[#52525c] leading-[22.75px] tracking-tight ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      {getItemDescription(item)}
                    </p>

                    {/* Pricing matrix: variant pills when multiple options */}
                    {item.priceVariants && item.priceVariants.length > 1 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.priceVariants.map((v) => {
                          const selected = getSelectedVariant(item);
                          const isSelected = selected?.id === v.id;
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

                    {/* Price: show only the price set in admin (matrix variant or single item price). No discounted/crossed-out unless we add it in admin. */}
                    <div className="mt-2 mb-2 flex flex-wrap items-baseline gap-1.5">
                      {(() => {
                        const variant = getSelectedVariant(item);
                        const displayPrice = variant ? variant.price : item.price ?? 0;
                        return (
                          <p className="flex items-baseline gap-1.5">
                            <span className="font-bold text-2xl tracking-tight text-[#000]">{displayPrice}</span>
                            <span className="text-sm font-normal text-gray-500">{t.egp}</span>
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Item Divider */}
                  <div className="h-px mx-6 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
              ))}
            </div>
          );
        })}
      </div>

    </div>
  );
}