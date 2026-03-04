export type OfferItemRef = {
  targetId: string;
  menuItemId: string;
  variantId?: string;
  menuItemName: string;
  variantName?: string;
  menuItemPrice?: number;
};

export type Offer = {
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

export type OfferWithItems = Offer & {
  items: OfferItemRef[];
};

export type OfferUpsertInput = {
  name: string;
  discountPct: number;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  itemIds: string[];
};
