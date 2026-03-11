import type {
  MenuItem,
  PriceVariant,
  OptionGroup,
  MatrixOption,
  PricingMatrix,
  PricingMatrixCell,
  LegacyPricing,
} from '../types/menu';

/** Normalized read model: either flat variants or two-layer matrix. */
export type PricingModel =
  | { kind: 'flat'; variants: PriceVariant[] }
  | { kind: 'matrix'; optionGroups: OptionGroup[]; pricingMatrix: PricingMatrix };

/** Check if item uses the two-layer matrix model. */
export function hasTwoLayerMatrix(item: MenuItem): boolean {
  const groups = item.optionGroups;
  const matrix = item.pricingMatrix;
  return (
    Array.isArray(groups) &&
    groups.length >= 2 &&
    matrix != null &&
    typeof matrix === 'object' &&
    Array.isArray(matrix.cells) &&
    matrix.cells.length > 0
  );
}

/** Check if item uses flat priceVariants. */
export function hasFlatVariants(item: MenuItem): boolean {
  const v = item.priceVariants;
  return Array.isArray(v) && v.length > 0;
}

/** Check if item has legacy nested pricing (variation -> mealType -> price). */
export function hasLegacyPricing(item: MenuItem): boolean {
  const p = item.pricing;
  if (!p || typeof p !== 'object') return false;
  const variations = Object.keys(p);
  if (variations.length === 0) return false;
  const first = p[variations[0]];
  return first != null && typeof first === 'object';
}

/** Convert legacy pricing to option groups + matrix. */
function legacyToMatrix(item: MenuItem): { optionGroups: OptionGroup[]; pricingMatrix: PricingMatrix } | null {
  const p = item.pricing as LegacyPricing | undefined;
  if (!p || typeof p !== 'object') return null;

  const rowKeys = Object.keys(p).filter(Boolean);
  if (rowKeys.length === 0) return null;

  const firstRow = p[rowKeys[0]];
  const colKeys =
    firstRow && typeof firstRow === 'object'
      ? Object.keys(firstRow).filter(Boolean)
      : [];

  if (colKeys.length === 0) return null;

  const rowGroupId = 'group1';
  const colGroupId = 'group2';

  const rowOptions: MatrixOption[] = rowKeys.map((k, i) => ({
    id: `row-${i}-${k.replace(/\s/g, '_')}`,
    nameEn: k,
    nameAr: k,
    name: k,
  }));

  const colOptions: MatrixOption[] = colKeys.map((k, i) => ({
    id: `col-${i}-${k.replace(/\s/g, '_')}`,
    nameEn: k,
    nameAr: k,
    name: k,
  }));

  const cells: PricingMatrixCell[] = [];
  for (let ri = 0; ri < rowKeys.length; ri++) {
    const rowKey = rowKeys[ri];
    const rowOpt = rowOptions[ri];
    const rowData = p[rowKey];
    if (!rowOpt || !rowData || typeof rowData !== 'object') continue;
    for (let ci = 0; ci < colKeys.length; ci++) {
      const colKey = colKeys[ci];
      const colOpt = colOptions[ci];
      const price = rowData[colKey];
      if (!colOpt || typeof price !== 'number') continue;
      cells.push({
        rowOptionId: rowOpt.id,
        columnOptionId: colOpt.id,
        price,
      });
    }
  }

  const optionGroups: OptionGroup[] = [
    { id: rowGroupId, labelEn: 'Variation', labelAr: 'النوع', label: 'Variation', options: rowOptions },
    { id: colGroupId, labelEn: 'Addon', labelAr: 'الإضافة', label: 'Addon', options: colOptions },
  ];

  return {
    optionGroups,
    pricingMatrix: { rowGroupId, columnGroupId: colGroupId, cells },
  };
}

/** Normalize any item into a single read model. Prefers matrix if present, else legacy, else flat. */
export function normalizePricingModel(item: MenuItem): PricingModel {
  if (hasTwoLayerMatrix(item)) {
    return {
      kind: 'matrix',
      optionGroups: item.optionGroups!,
      pricingMatrix: item.pricingMatrix!,
    };
  }

  if (hasLegacyPricing(item)) {
    const converted = legacyToMatrix(item);
    if (converted) {
      return {
        kind: 'matrix',
        optionGroups: converted.optionGroups,
        pricingMatrix: converted.pricingMatrix,
      };
    }
  }

  if (hasFlatVariants(item)) {
    return {
      kind: 'flat',
      variants: item.priceVariants!,
    };
  }

  return {
    kind: 'flat',
    variants: [{ id: 'default', name: 'Default', price: item.price ?? 0, discountedPrice: item.discountedPrice }],
  };
}

/** Get price for a flat variant by id. */
export function getFlatVariantPrice(item: MenuItem, variantId: string): number | null {
  const v = item.priceVariants?.find((x) => x.id === variantId);
  return v ? (v.discountedPrice != null && v.discountedPrice > 0 ? v.discountedPrice : v.price) : null;
}

/** Get price for a matrix combination (rowOptionId, columnOptionId). */
export function getMatrixCellPrice(
  item: MenuItem,
  rowOptionId: string,
  columnOptionId: string
): number | null {
  const matrix = item.pricingMatrix;
  if (!matrix || !Array.isArray(matrix.cells)) return null;
  const cell = matrix.cells.find(
    (c) => c.rowOptionId === rowOptionId && c.columnOptionId === columnOptionId
  );
  return cell ? (cell.discountedPrice != null && cell.discountedPrice > 0 ? cell.discountedPrice : cell.price) : null;
}

/** Get min and max prices from an item (supports flat, matrix, legacy). */
export function getItemPriceRange(item: MenuItem): { min: number; max: number } {
  const model = normalizePricingModel(item);

  if (model.kind === 'flat') {
    const prices = model.variants.map((v) =>
      v.discountedPrice != null && v.discountedPrice > 0 ? v.discountedPrice : v.price
    );
    if (prices.length === 0) return { min: item.price ?? 0, max: item.price ?? 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }

  const prices = model.pricingMatrix.cells.map((c) =>
    c.discountedPrice != null && c.discountedPrice > 0 ? c.discountedPrice : c.price
  );
  if (prices.length === 0) return { min: item.price ?? 0, max: item.price ?? 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Build a stable combination target id for offers: itemId::rowOptionId::columnOptionId. */
export function buildMatrixTargetId(itemId: string, rowOptionId: string, columnOptionId: string): string {
  return `${itemId}::${rowOptionId}::${columnOptionId}`;
}

/** Parse target id into itemId, rowOptionId, columnOptionId. Returns null if not a matrix target. */
export function parseMatrixTargetId(
  targetId: string
): { itemId: string; rowOptionId: string; columnOptionId: string } | null {
  const parts = targetId.split('::');
  if (parts.length !== 3) return null;
  return { itemId: parts[0], rowOptionId: parts[1], columnOptionId: parts[2] };
}
