import { useState, useEffect } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { MenuItem, Category, PriceVariant } from '../types/menu';
import { ImageUpload } from './ImageUpload';
import { useAdminLanguage } from '../context/AdminLanguageContext';

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

  const numberInputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  useEffect(() => {
    if (item) {
      // Handle migration from old structure
      let price = item.price || 0;

      if (item.pricing && typeof item.pricing === 'object' && !item.price) {
        const variations = Object.values(item.pricing || {});
        if (variations.length > 0) {
          const mealTypes = Object.values(variations[0] || {});
          if (mealTypes.length > 0) {
            price = mealTypes[0] as number;
          }
        }
      }

      const variants = (item.priceVariants && item.priceVariants.length > 0)
        ? item.priceVariants.map((v) => ({
            ...v,
            id: v.id || crypto.randomUUID(),
            nameEn: v.nameEn ?? v.name ?? '',
            nameAr: v.nameAr ?? '',
          }))
        : [{ id: crypto.randomUUID(), name: 'Default', nameEn: 'Default', nameAr: '', price, discountedPrice: item.discountedPrice }];
      setFormData({
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description ?? '',
        price,
        discountedPrice: item.discountedPrice,
        priceVariants: variants,
        image: item.image ?? '',
        isAvailable: item.isAvailable ?? true,
        isPopular: item.isPopular ?? false,
        order: item.order,
        nameEn: item.nameEn ?? item.name ?? '',
        nameAr: item.nameAr ?? '',
        descriptionEn: item.descriptionEn ?? item.description ?? '',
        descriptionAr: item.descriptionAr ?? '',
      });
    } else {
      setFormData({
        id: '',
        name: '',
        category: categories.length > 0 ? categories[0].name : '',
        description: '',
        price: 0,
        discountedPrice: undefined,
        priceVariants: [{ id: crypto.randomUUID(), name: '', nameEn: '', nameAr: '', price: 0 }],
        image: '',
        isAvailable: true,
        isPopular: false,
        nameEn: '',
        nameAr: '',
        descriptionEn: '',
        descriptionAr: '',
      });
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

  const variants = formData.priceVariants ?? [];
  const setVariants = (next: PriceVariant[]) => handleChange('priceVariants', next);

  const updateVariant = (id: string, updates: Partial<PriceVariant>) => {
    setVariants(variants.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };
  const addVariant = () => {
    setVariants([...variants, { id: crypto.randomUUID(), name: '', nameEn: '', nameAr: '', price: 0 }]);
  };
  const removeVariant = (id: string) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((v) => v.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nameEn = (formData.nameEn ?? formData.name ?? '').trim();
    if (!nameEn || !formData.category) {
      alert(t('validation.fillCategoryAndName'));
      return;
    }
    const validVariants = variants.filter((v) => ((v.nameEn ?? v.name ?? '').trim() || (v.nameAr ?? '').trim()) && (v.price ?? 0) >= 0);
    if (validVariants.length === 0) {
      alert(t('validation.addOnePricingOption'));
      return;
    }
    const priceVariants = validVariants.map((v) => {
      const nameEn = (v.nameEn ?? v.name ?? '').trim();
      const nameAr = (v.nameAr ?? '').trim();
      return {
        id: v.id,
        name: nameEn || nameAr || '',
        nameEn: nameEn || undefined,
        nameAr: nameAr || undefined,
        price: Number(v.price) || 0,
        discountedPrice: v.discountedPrice != null && v.discountedPrice > 0 ? v.discountedPrice : undefined,
      };
    });
    const price = priceVariants[0]?.price ?? 0;
    const discountedPrice = priceVariants[0]?.discountedPrice;

    onSubmit({
      ...formData,
      id: formData.id || `item-${Date.now()}`,
      name: nameEn,
      description: (formData.descriptionEn ?? formData.description ?? '').trim(),
      nameEn,
      nameAr: (formData.nameAr ?? '').trim(),
      descriptionEn: (formData.descriptionEn ?? formData.description ?? '').trim(),
      descriptionAr: (formData.descriptionAr ?? '').trim(),
      price,
      discountedPrice,
      priceVariants,
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
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
          {/* Basic Information (dual-language) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-1">{t('itemForm.basicInfo')}</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('itemForm.category')} *
              </label>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('itemForm.nameEn')} *
              </label>
              <input
                type="text"
                value={formData.nameEn ?? formData.name ?? ''}
                onChange={(e) => handleChange('nameEn', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('itemForm.nameAr')}
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.nameAr ?? ''}
                onChange={(e) => handleChange('nameAr', e.target.value)}
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

          </div>

          {/* Pricing matrix - table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-1">{t('itemForm.pricingMatrix')}</h3>
            <p className="text-xs text-gray-500">{t('itemForm.pricingMatrixHint')}</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left font-semibold text-gray-700 px-4 py-3">{t('itemForm.optionNameEn')}</th>
                    <th className="text-left font-semibold text-gray-700 px-4 py-3">{t('itemForm.optionNameAr')}</th>
                    <th className="text-left font-semibold text-gray-700 px-4 py-3 w-32">{t('itemForm.priceEgp')}</th>
                    <th className="w-12 px-2 py-3" aria-label={t('items.actions')} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {variants.map((v) => (
                    <tr key={v.id} className="bg-white hover:bg-gray-50/50">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={v.nameEn ?? v.name ?? ''}
                          onChange={(e) => updateVariant(v.id, { nameEn: e.target.value })}
                          placeholder={t('itemForm.optionNamePlaceholder')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          dir="rtl"
                          value={v.nameAr ?? ''}
                          onChange={(e) => updateVariant(v.id, { nameAr: e.target.value })}
                          placeholder={t('itemForm.optionNameArPlaceholder')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.price === 0 ? '' : v.price}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateVariant(v.id, { price: val === '' ? 0 : parseFloat(val) || 0 });
                          }}
                          placeholder="0"
                          className={`${numberInputClass} w-full px-3 py-2`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeVariant(v.id)}
                          disabled={variants.length <= 1}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                          title={t('items.delete')}
                          aria-label={t('items.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 text-sm font-medium transition-colors"
              aria-label={t('itemForm.addOption')}
            >
              <Plus size={18} />
              {t('itemForm.addOption')}
            </button>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('itemForm.itemImage')}
            </label>
            <ImageUpload
              value={formData.image}
              onChange={(url) => handleChange('image', url)}
            />
          </div>

          {/* Availability & Popular */}
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
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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