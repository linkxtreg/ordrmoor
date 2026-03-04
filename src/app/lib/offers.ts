import type { OfferWithItems } from '../types/offers';

function parseTargetId(targetId: string): { itemId: string; variantId?: string } {
  const [itemId, variantId] = targetId.split('::');
  return { itemId, variantId: variantId || undefined };
}

function parseDateBoundary(value?: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Date-only values from <input type="date"> are interpreted in local time.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const withTime = `${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`;
    const date = new Date(withTime);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isOfferActive(offer: OfferWithItems, at = new Date()): boolean {
  if (!offer.isActive) return false;
  const start = parseDateBoundary(offer.startDate, false);
  const end = parseDateBoundary(offer.endDate ?? null, true);
  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

export function getActiveOfferForItem(
  itemId: string,
  variantId: string | undefined,
  offers: OfferWithItems[],
  at = new Date()
): OfferWithItems | null {
  const variantTargetId = variantId ? `${itemId}::${variantId}` : null;
  return (
    offers.find(
      (offer) =>
        isOfferActive(offer, at) &&
        (
          (variantTargetId && offer.itemIds.includes(variantTargetId)) ||
          offer.itemIds.includes(itemId) ||
          offer.itemIds.some((targetId) => {
            const parsed = parseTargetId(targetId);
            return parsed.itemId === itemId && (!variantId || parsed.variantId === undefined || parsed.variantId === variantId);
          }) ||
          offer.items.some((item) =>
            item.menuItemId === itemId && (!variantId || !item.variantId || item.variantId === variantId)
          )
        )
    ) ?? null
  );
}

export function hasActiveOfferForItem(itemId: string, offers: OfferWithItems[], at = new Date()): boolean {
  return (
    offers.some(
      (offer) =>
        isOfferActive(offer, at) &&
        offer.itemIds.some((targetId) => parseTargetId(targetId).itemId === itemId)
    ) || false
  );
}

export function getDiscountedPrice(originalPrice: number, offer: OfferWithItems | null): number {
  if (!offer) return originalPrice;
  const clamped = Math.max(1, Math.min(99, offer.discountPct));
  return Number((originalPrice * (1 - clamped / 100)).toFixed(2));
}

