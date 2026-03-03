/** Menu: structure only (name, slug, categories, items). Branding (color, logo, cover, bio, phone, social) comes from GeneralInfo. */
export interface Menu {
  id: string;
  name: string;
  slug?: string;
  order?: number;
}

/** A named price option in the pricing matrix (e.g. "Sandwich" 155, "Combo" 185). Names are dual-language. */
export interface PriceVariant {
  id: string;
  /** Primary/fallback name (often same as nameEn). */
  name: string;
  nameEn?: string;
  nameAr?: string;
  price: number;
  discountedPrice?: number;
}

export interface MenuItem {
  id: string;
  /** Primary/fallback name (often same as nameEn). Used when localized name is missing. */
  name: string;
  category: string;
  /** Primary/fallback description (often same as descriptionEn). */
  description: string;
  /** Original price (EGP). Fallback when no priceVariants; also set from first variant when using matrix. */
  price: number;
  /** Discounted price (EGP). Fallback when no priceVariants. */
  discountedPrice?: number;
  /** Pricing matrix: multiple named variants (e.g. Sandwich 155, Combo 185). When set, replaces single price on menu. */
  priceVariants?: PriceVariant[];
  image: string;
  isAvailable: boolean;
  isPopular: boolean;
  order?: number;
  menuId?: string;
  /** English name (dual-language). Shown when customer selects English. */
  nameEn?: string;
  /** Arabic name (dual-language). Shown when customer selects Arabic. */
  nameAr?: string;
  /** English description (dual-language). */
  descriptionEn?: string;
  /** Arabic description (dual-language). */
  descriptionAr?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  description: string;
  order?: number;
  menuId?: string;
  /** Arabic name (dual-language). */
  nameAr?: string;
  /** English description (optional, dual-language). */
  descriptionEn?: string;
}

/** Single source of truth for tenant branding and contact. All menu views use this for color, logo, cover, tagline/bio, phone, social. */
export interface GeneralInfo {
  phoneNumber: string;
  tagline: string;
  backgroundImage: string;
  logoImage: string;
  brandColor: string;
  defaultMenuId?: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    tiktok: string;
    messenger: string;
  };
}

export interface BranchAddress {
  id: string;
  name: string;
  mapUrl: string;
  order?: number;
}