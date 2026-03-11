import { useState, useEffect } from 'react';
import { X, Trash2, Plus, ChevronDown, ChevronLeft, Pencil } from 'lucide-react';
import { MenuItem, Category, OptionGroup, MatrixOption, PricingMatrix, PricingMatrixCell } from '../types/menu';
import { ImageUpload } from './ImageUpload';
import { useAdminLanguage } from '../context/AdminLanguageContext';
import { hasTwoLayerMatrix, hasLegacyPricing, normalizePricingModel } from '../lib/pricing';

interface MenuItemFormProps {
  item: MenuItem | null;
  onSubmit: (item: MenuItem) => void;
  onCancel: () => void;
  categories: Category[];
}

export function MenuItemForm({ item, onSubmit, onCancel, categories }: MenuItemFormProps) {
  const { t } = useAdminLanguage();
  const [formData, setFormData] = useState<MenuItem>({
    id: '',
    name: '',
    category: categories.length > 0 ? categories[0].name : '',
    description: '',
    price: 0,
    discountedPrice: undefined,
    priceVariants: [{ id: crypto.randomUUID(), name: '', price: 0 }],
    image: '',
    isAvailable: true,
    isPopular: false,
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
  });
  const [showOptional, setShowOptional] = useState(false);
  const [matrixOptionGroups, setMatrixOptionGroups] = useState<OptionGroup[]>([]);
  const [matrixCells, setMatrixCells] = useState<PricingMatrixCell[]>([]);

  const numberInputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  useEffect(() => {
    if (item) {
      let price = item.price || 0;
      let groups: OptionGroup[] = [];
      let cells: PricingMatrixCell[] = [];

      if (hasTwoLayerMatrix(item) && item.optionGroups && item.pricingMatrix) {
        groups = item.optionGroups.map((g) => ({
          ...g,
          options: g.options.map((o) => ({ ...o, id: o.id || crypto.randomUUID() })),
        }));
        cells = item.pricingMatrix.cells || [];
        const firstCell = cells[0];
        price = firstCell?.price ?? price;
      } else if (hasLegacyPricing(item)) {
        const model = normalizePricingModel(item);
        if (model.kind === 'matrix') {
          groups = model.optionGroups;
          cells = model.pricingMatrix.cells;
          const first = cells[0];
          price = first?.price ?? 0;
        }
      } else if (item.priceVariants && item.priceVariants.length > 0) {
        const v = item.priceVariants;
        const rowGroupId = 'rg-' + crypto.randomUUID().slice(0, 8);
        const colGroupId = 'cg-' + crypto.randomUUID().slice(0, 8);
        const colOptId = crypto.randomUUID();
        const rowOpts: MatrixOption[] = v.map((pv) => ({
          id: pv.id,
          nameEn: pv.nameEn ?? pv.name,
          nameAr: pv.nameAr,
          name: pv.nameEn ?? pv.name ?? '',
        }));
        groups = [
          { id: rowGroupId, labelEn: 'Option', labelAr: 'الخيار', label: 'Option', options: rowOpts },
          { id: colGroupId, labelEn: 'Type', labelAr: 'النوع', label: 'Type', options: [{ id: colOptId, nameEn: 'Default', nameAr: 'افتراضي', name: 'Default' }] },
        ];
        cells = v.map((pv) => ({ rowOptionId: pv.id, columnOptionId: colOptId, price: pv.price, discountedPrice: pv.discountedPrice }));
        price = v[0]?.price ?? 0;
      }

      if (groups.length < 2) {
        const g1 = crypto.randomUUID();
        const g2 = crypto.randomUUID();
        const o1 = crypto.randomUUID();
        const o2 = crypto.randomUUID();
        groups = [
          { id: g1, labelEn: 'Row', labelAr: 'الصف', label: 'Row', options: [{ id: o1, nameEn: '', nameAr: '', name: '' }] },
          { id: g2, labelEn: 'Column', labelAr: 'العمود', label: 'Column', options: [{ id: o2, nameEn: '', nameAr: '', name: '' }] },
        ];
        cells = [{ rowOptionId: o1, columnOptionId: o2, price: 0 }];
      }

      setMatrixOptionGroups(groups);
      setMatrixCells(cells);

      setFormData({
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description ?? '',
        price,
        discountedPrice: item.discountedPrice,
        priceVariants: [],
        image: item.image ?? '',
        isAvailable: item.isAvailable ?? true,
        isPopular: item.isPopular ?? false,
        order: item.order,
        nameEn: item.nameEn ?? item.name ?? '',
        nameAr: item.nameAr ?? '',
        descriptionEn: item.descriptionEn ?? item.description ?? '',
        descriptionAr: item.descriptionAr ?? '',
      });
      setShowOptional(false);
    } else {
      const g1 = crypto.randomUUID();
      const g2 = crypto.randomUUID();
      const o1 = crypto.randomUUID();
      const o2 = crypto.randomUUID();
      setFormData({
        id: '',
        name: '',
        category: categories.length > 0 ? categories[0].name : '',
        description: '',
        price: 0,
        discountedPrice: undefined,
        priceVariants: [],
        image: '',
        isAvailable: true,
        isPopular: false,
        nameEn: '',
        nameAr: '',
        descriptionEn: '',
        descriptionAr: '',
      });
      setMatrixOptionGroups([
        { id: g1, labelEn: 'Row', labelAr: 'الصف', label: 'Row', options: [{ id: o1, nameEn: '', nameAr: '', name: '' }] },
        { id: g2, labelEn: 'Column', labelAr: 'العمود', label: 'Column', options: [{ id: o2, nameEn: '', nameAr: '', name: '' }] },
      ]);
      setMatrixCells([{ rowOptionId: o1, columnOptionId: o2, price: 0 }]);
      setShowOptional(false);
    }
  }, [item, categories]);

  const handleChange = (field: keyof MenuItem, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const getCategoryLabel = (category: Category) => {
    const categoryWithLegacyArabic = category as Category & { name_ar?: string };
    const arabicName = (category.nameAr ?? categoryWithLegacyArabic.name_ar ?? '').trim();
    return arabicName ? `${category.name} - ${arabicName}` : category.name;
  };

  const rowGroup = matrixOptionGroups[0];
  const colGroup = matrixOptionGroups[1];
  const rowOptions = rowGroup?.options ?? [];
  const colOptions = colGroup?.options ?? [];

  const getCellPrice = (rowId: string, colId: string) => {
    const c = matrixCells.find((x) => x.rowOptionId === rowId && x.columnOptionId === colId);
    return c?.price ?? 0;
  };
  const setCellPrice = (rowId: string, colId: string, price: number) => {
    setMatrixCells((prev) => {
      const rest = prev.filter((x) => !(x.rowOptionId === rowId && x.columnOptionId === colId));
      return [...rest, { rowOptionId: rowId, columnOptionId: colId, price }];
    });
  };

  const updateMatrixGroup = (groupIndex: 0 | 1, updates: Partial<OptionGroup> | ((g: OptionGroup) => OptionGroup)) => {
    setMatrixOptionGroups((prev) => {
      const next = [...prev];
      const g = next[groupIndex];
      if (!g) return prev;
      next[groupIndex] = typeof updates === 'function' ? updates(g) : { ...g, ...updates };
      return next;
    });
  };
  const addMatrixOption = (groupIndex: 0 | 1) => {
    const id = crypto.randomUUID();
    updateMatrixGroup(groupIndex, (g) => ({
      ...g,
      options: [...(g.options || []), { id, nameEn: '', nameAr: '', name: '' }],
    }));
    setMatrixCells((prev) => {
      const next = [...prev];
      if (groupIndex === 0) {
        colOptions.forEach((co) => next.push({ rowOptionId: id, columnOptionId: co.id, price: 0 }));
      } else {
        rowOptions.forEach((ro) => next.push({ rowOptionId: ro.id, columnOptionId: id, price: 0 }));
      }
      return next;
    });
  };
  const updateMatrixOption = (groupIndex: 0 | 1, optionId: string, updates: Partial<MatrixOption>) => {
    updateMatrixGroup(groupIndex, (g) => ({
      ...g,
      options: (g.options || []).map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
    }));
  };
  const removeMatrixOption = (groupIndex: 0 | 1, optionId: string) => {
    setMatrixOptionGroups((prev) => {
      const next = [...prev];
      const g = next[groupIndex];
      if (!g) return prev;
      next[groupIndex] = { ...g, options: (g.options || []).filter((o) => o.id !== optionId) };
      return next;
    });
    setMatrixCells((prev) =>
      prev.filter((c) => (groupIndex === 0 ? c.rowOptionId !== optionId : c.columnOptionId !== optionId))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nameAr = (formData.nameAr ?? '').trim();
    const nameEn = (formData.nameEn ?? formData.name ?? '').trim();
    const primaryName = nameAr || nameEn;
    if (!primaryName || !formData.category) {
      alert(t('validation.fillCategoryAndName'));
      return;
    }

    const validRowOpts = rowOptions.filter((o) => ((o.nameEn ?? o.name ?? '').trim() || (o.nameAr ?? '').trim()));
    const validColOpts = colOptions.filter((o) => ((o.nameEn ?? o.name ?? '').trim() || (o.nameAr ?? '').trim()));
    const validRowIds = new Set(validRowOpts.map((o) => o.id));
    const validColIds = new Set(validColOpts.map((o) => o.id));
    const validCells = matrixCells.filter(
      (c) => c.price > 0 && validRowIds.has(c.rowOptionId) && validColIds.has(c.columnOptionId)
    );

    const useMatrix = validRowOpts.length > 0 && validColOpts.length > 0 && validCells.length > 0;

    if (useMatrix) {
      const price = Math.min(...validCells.map((c) => c.price));
      const optionGroups: OptionGroup[] = matrixOptionGroups.map((g) => ({
        ...g,
        options: g.options
          .filter((o) => ((o.nameEn ?? o.name ?? '').trim() || (o.nameAr ?? '').trim()))
          .map((o) => ({
            id: o.id,
            nameEn: (o.nameEn ?? o.name ?? '').trim() || undefined,
            nameAr: (o.nameAr ?? '').trim() || undefined,
            name: (o.nameEn ?? o.name ?? '').trim() || (o.nameAr ?? '').trim() || '',
          })),
      }));
      const pricingMatrix: PricingMatrix = {
        rowGroupId: rowGroup!.id,
        columnGroupId: colGroup!.id,
        cells: validCells,
      };
      onSubmit({
        ...formData,
        id: formData.id || `item-${Date.now()}`,
        name: primaryName,
        description: (formData.descriptionEn ?? formData.description ?? '').trim(),
        nameEn: nameEn || undefined,
        nameAr: nameAr || undefined,
        descriptionEn: (formData.descriptionEn ?? formData.description ?? '').trim(),
        descriptionAr: (formData.descriptionAr ?? '').trim(),
        price,
        discountedPrice: undefined,
        priceVariants: undefined,
        optionGroups,
        pricingMatrix,
        pricing: undefined,
      });
      return;
    }

    const price = Number(formData.price) ?? 0;
    if (price < 0 || !Number.isFinite(price)) {
      alert(t('validation.addOnePricingOption'));
      return;
    }
    onSubmit({
      ...formData,
      id: formData.id || `item-${Date.now()}`,
      name: primaryName,
      description: (formData.descriptionEn ?? formData.description ?? '').trim(),
      nameEn: nameEn || undefined,
      nameAr: nameAr || undefined,
      descriptionEn: (formData.descriptionEn ?? formData.description ?? '').trim(),
      descriptionAr: (formData.descriptionAr ?? '').trim(),
      price,
      discountedPrice: undefined,
      priceVariants: undefined,
      optionGroups: undefined,
      pricingMatrix: undefined,
      pricing: undefined,
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[80%] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shrink-0">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            {item ? t('itemForm.editItem') : t('itemForm.addNew')}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label={t('itemForm.cancel')}
          >
            <X size={24} />
          </button>
        </div>
        <div className="overflow-y-auto min-h-0 flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Required */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-1">Required</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('itemForm.category')} *
              </label>
              {categories.length === 0 ? (
                <input
                  type="text"
                  dir="rtl"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="اسم الفئة الجديدة"
                  required
                />
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name} dir="auto">
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('itemForm.nameAr')} *
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.nameAr ?? ''}
                onChange={(e) => handleChange('nameAr', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('itemForm.priceEgp')} *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price === 0 ? '' : formData.price}
                onChange={(e) => handleChange('price', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={numberInputClass}
              />
              <p className="text-xs text-gray-500 mt-1">For multiple prices (e.g. Single/Double × Sandwich/Combo), use the pricing matrix in optional fields below.</p>
            </div>
          </div>

          {/* Optional */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowOptional((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <span>إضافات اختيارية ←</span>
              {showOptional ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
            </button>

            {showOptional && (
              <div className="space-y-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('itemForm.nameEn')}
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn ?? formData.name ?? ''}
                    onChange={(e) => handleChange('nameEn', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('itemForm.descEn')}
                  </label>
                  <textarea
                    value={formData.descriptionEn ?? formData.description ?? ''}
                    onChange={(e) => handleChange('descriptionEn', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('itemForm.descAr')}
                  </label>
                  <textarea
                    dir="rtl"
                    value={formData.descriptionAr ?? ''}
                    onChange={(e) => handleChange('descriptionAr', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-800">{t('itemForm.pricingMatrix')}</h3>
                  <p className="text-xs text-gray-500">For items with multiple prices (e.g. burger count × addon). Leave empty to use the single price above.</p>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-700 w-28">
                            {t('itemForm.variationsLabel')}
                          </th>
                          {colOptions.map((co) => (
                            <th key={co.id} className="px-2 py-2 align-top">
                              <div className="flex items-center gap-1 min-w-[90px]">
                                <input
                                  type="text"
                                  value={co.nameEn ?? co.name ?? ''}
                                  onChange={(e) => updateMatrixOption(1, co.id, { nameEn: e.target.value, name: e.target.value })}
                                  placeholder="e.g. Sandwich"
                                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement)?.focus()}
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 shrink-0"
                                  aria-label={t('items.edit')}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeMatrixOption(1, co.id)}
                                  disabled={colOptions.length <= 1}
                                  className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-40 shrink-0"
                                  aria-label={t('items.delete')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </th>
                          ))}
                          <th className="px-2 py-2 w-12 align-top">
                            <button
                              type="button"
                              onClick={() => addMatrixOption(1)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                              aria-label={t('itemForm.addColumnOption')}
                            >
                              <Plus size={18} />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowOptions.map((ro) => (
                          <tr key={ro.id} className="border-t border-gray-200">
                            <td className="px-3 py-2 bg-gray-50/50">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={ro.nameEn ?? ro.name ?? ''}
                                  onChange={(e) => updateMatrixOption(0, ro.id, { nameEn: e.target.value, name: e.target.value })}
                                  placeholder="e.g. Single"
                                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement)?.focus()}
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 shrink-0"
                                  aria-label={t('items.edit')}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeMatrixOption(0, ro.id)}
                                  disabled={rowOptions.length <= 1}
                                  className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-40 shrink-0"
                                  aria-label={t('items.delete')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                            {colOptions.map((co) => (
                              <td key={co.id} className="px-2 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={getCellPrice(ro.id, co.id) || ''}
                                  onChange={(e) => setCellPrice(ro.id, co.id, parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className={`${numberInputClass} w-full px-2 py-1.5 text-center rounded-md border border-gray-300`}
                                />
                              </td>
                            ))}
                            <td className="w-12" />
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={(colOptions.length + 2) as number} className="px-3 py-2 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={() => addMatrixOption(0)}
                              className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-md text-sm font-medium"
                            >
                              <Plus size={16} />
                              {t('itemForm.addRowOption')}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('itemForm.itemImage')}
                  </label>
                  <ImageUpload
                    value={formData.image}
                    onChange={(url) => handleChange('image', url)}
                  />
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) => handleChange('isAvailable', e.target.checked)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('itemForm.available')}</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => handleChange('isPopular', e.target.checked)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('itemForm.popularItem')}</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t('itemForm.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              {item ? t('itemForm.updateItem') : t('itemForm.addItem')}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}