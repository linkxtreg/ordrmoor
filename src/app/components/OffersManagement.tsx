import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { categoriesApi, menuItemsApi, offersApi } from '@/app/services/api';
import { useAdminLanguage } from '@/app/context/AdminLanguageContext';
import type { Category, MenuItem } from '@/app/types/menu';
import type { OfferUpsertInput, OfferWithItems } from '@/app/types/offers';
import { isOfferActive } from '@/app/lib/offers';
import { hasTwoLayerMatrix, getMatrixCellPrice } from '@/app/lib/pricing';

type OfferFormState = {
  name: string;
  discountPct: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  itemIds: string[];
};

const defaultForm = (): OfferFormState => ({
  name: '',
  discountPct: 20,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  isActive: true,
  itemIds: [],
});

function getStatus(offer: OfferWithItems): 'Paused' | 'Expired' | 'Upcoming' | 'Active' {
  if (!offer.isActive) return 'Paused';
  const now = new Date();
  const startDate = new Date(`${offer.startDate}T00:00:00`);
  if (!Number.isNaN(startDate.getTime()) && now < startDate) return 'Upcoming';
  if (offer.endDate) {
    const endDate = new Date(`${offer.endDate}T23:59:59`);
    if (!Number.isNaN(endDate.getTime()) && now > endDate) return 'Expired';
  }
  return 'Active';
}

function formatDateRange(startDate: string, endDate?: string | null): string {
  const start = startDate || '-';
  const end = endDate || 'No end date';
  return `${start} -> ${end}`;
}

export function OffersManagement() {
  const { lang } = useAdminLanguage();
  const [offers, setOffers] = useState<OfferWithItems[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OfferFormState>(defaultForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const sortedMenuItems = useMemo(
    () => [...menuItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [menuItems]
  );

  const loadData = async () => {
    let hadError = false;
    try {
      setIsLoading(true);
      const [offersResult, itemsResult, categoriesResult] = await Promise.allSettled([
        offersApi.getAll(),
        menuItemsApi.getAll(),
        categoriesApi.getAll(),
      ]);

      if (itemsResult.status === 'fulfilled') {
        setMenuItems(itemsResult.value);
      } else {
        hadError = true;
        setMenuItems([]);
      }

      if (offersResult.status === 'fulfilled') {
        setOffers(offersResult.value);
      } else {
        // Keep UI usable even if offers endpoint is temporarily unavailable.
        setOffers([]);
        hadError = true;
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value);
      } else {
        setCategories([]);
      }
    } catch (error) {
      hadError = true;
      toast.error(error instanceof Error ? error.message : 'Failed to load offers');
    } finally {
      setIsLoading(false);
      if (hadError) {
        toast.error('Some offers data could not be loaded. You can still select menu items.');
      }
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setForm(defaultForm());
    setEditingId(null);
    setIsFormOpen(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
    setSearchQuery('');
    setSelectedCategory('all');
    setIsFormOpen(true);
  };

  const openEdit = (offer: OfferWithItems) => {
    setEditingId(offer.id);
    setForm({
      name: offer.name,
      discountPct: offer.discountPct,
      startDate: offer.startDate,
      endDate: offer.endDate ?? '',
      isActive: offer.isActive,
      itemIds: [...offer.itemIds],
    });
    setSearchQuery('');
    setSelectedCategory('all');
    setIsFormOpen(true);
  };

  const validateForm = (): OfferUpsertInput | null => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Offer name is required');
      return null;
    }
    if (!(form.discountPct >= 1 && form.discountPct <= 99)) {
      toast.error('Discount must be between 1 and 99');
      return null;
    }
    if (!form.startDate) {
      toast.error('Start date is required');
      return null;
    }
    if (form.endDate && form.endDate < form.startDate) {
      toast.error('End date cannot be before start date');
      return null;
    }
    if (form.itemIds.length === 0) {
      toast.error('Select at least one item');
      return null;
    }
    return {
      name,
      discountPct: form.discountPct,
      startDate: form.startDate,
      endDate: form.endDate || null,
      isActive: form.isActive,
      itemIds: form.itemIds,
    };
  };

  const handleSave = async () => {
    const payload = validateForm();
    if (!payload) return;
    try {
      setIsSaving(true);
      if (editingId) {
        await offersApi.update(editingId, payload);
        toast.success('Offer updated');
      } else {
        await offersApi.create(payload);
        toast.success('Offer created');
      }
      await loadData();
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save offer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    try {
      await offersApi.delete(id);
      setOffers((prev) => prev.filter((offer) => offer.id !== id));
      toast.success('Offer deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete offer');
    }
  };

  const handleToggleActive = async (offer: OfferWithItems) => {
    try {
      await offersApi.update(offer.id, {
        name: offer.name,
        discountPct: offer.discountPct,
        startDate: offer.startDate,
        endDate: offer.endDate ?? null,
        isActive: !offer.isActive,
        itemIds: offer.itemIds,
      });
      setOffers((prev) =>
        prev.map((row) => (row.id === offer.id ? { ...row, isActive: !row.isActive } : row))
      );
      toast.success(!offer.isActive ? 'Offer activated' : 'Offer paused');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update offer');
    }
  };

  const toggleItem = (itemId: string) => {
    const baseItemId = itemId.includes('::') ? itemId.split('::')[0] : itemId;
    setForm((prev) => ({
      ...prev,
      itemIds: prev.itemIds.includes(itemId)
        ? prev.itemIds.filter((id) => id !== itemId)
        : [...prev.itemIds.filter((id) => id !== baseItemId), itemId],
    }));
  };

  const getItemName = (item: MenuItem) =>
    lang === 'en' ? item.nameEn || item.name || item.id : item.nameAr || item.name || item.id;

  const getItemNameEn = (item: MenuItem) => item.nameEn || item.name || item.id;
  const getItemNameAr = (item: MenuItem) => item.nameAr || item.name || item.id;

  const categoryLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      const en = category.name || '';
      const ar = category.nameAr || category.name || '';
      map.set(category.name, en === ar ? en : `${en} / ${ar}`);
    }
    return map;
  }, [categories]);

  const selectorRows = useMemo(() => {
    const rows: Array<{
      targetId: string;
      menuItemId: string;
      categoryKey: string;
      categoryLabel: string;
      itemNameEn: string;
      itemNameAr: string;
      variantNameEn?: string;
      variantNameAr?: string;
      price?: number;
    }> = [];

    for (const item of sortedMenuItems) {
      const categoryKey = item.category || '';
      const categoryLabel = categoryLabelByKey.get(categoryKey) || categoryKey || '-';
      const itemNameEn = getItemNameEn(item);
      const itemNameAr = getItemNameAr(item);

      if (hasTwoLayerMatrix(item) && item.optionGroups && item.pricingMatrix) {
        const rowGroup = item.optionGroups.find((g) => g.id === item.pricingMatrix!.rowGroupId);
        const colGroup = item.optionGroups.find((g) => g.id === item.pricingMatrix!.columnGroupId);
        const rowOpts = rowGroup?.options ?? [];
        const colOpts = colGroup?.options ?? [];
        for (const ro of rowOpts) {
          for (const co of colOpts) {
            const price = getMatrixCellPrice(item, ro.id, co.id) ?? 0;
            const rowLabel = ro.nameEn || ro.name || ro.nameAr || '';
            const colLabel = co.nameEn || co.name || co.nameAr || '';
            const comboLabel = rowLabel && colLabel ? `${rowLabel} × ${colLabel}` : rowLabel || colLabel || '-';
            rows.push({
              targetId: `${item.id}::${ro.id}::${co.id}`,
              menuItemId: item.id,
              categoryKey,
              categoryLabel,
              itemNameEn,
              itemNameAr,
              variantNameEn: comboLabel,
              variantNameAr: comboLabel,
              price,
            });
          }
        }
      } else if (Array.isArray(item.priceVariants) && item.priceVariants.length > 0) {
        for (const variant of item.priceVariants) {
          rows.push({
            targetId: `${item.id}::${variant.id}`,
            menuItemId: item.id,
            categoryKey,
            categoryLabel,
            itemNameEn,
            itemNameAr,
            variantNameEn: variant.nameEn || variant.name || '',
            variantNameAr: variant.nameAr || variant.name || variant.nameEn || '',
            price: variant.price,
          });
        }
      } else {
        rows.push({
          targetId: item.id,
          menuItemId: item.id,
          categoryKey,
          categoryLabel,
          itemNameEn,
          itemNameAr,
          price: item.price,
        });
      }
    }

    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (selectedCategory !== 'all' && row.categoryKey !== selectedCategory) return false;
      if (!q) return true;
      const haystack = [
        row.itemNameEn,
        row.itemNameAr,
        row.variantNameEn || '',
        row.variantNameAr || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedMenuItems, categoryLabelByKey, searchQuery, selectedCategory]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Offers</h2>
          <p className="text-sm text-gray-600">Manage percentage discounts for specific menu items.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101010] text-[#cfff5e] hover:bg-[#cfff5e] hover:text-[#101010] transition-colors"
        >
          <Plus size={16} />
          Create Offer
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading offers...</div>
      ) : offers.length === 0 ? (
        <div className="py-10 text-center text-gray-500">No offers yet. Create your first offer.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-600">
                <th className="py-2 pr-3">Offer Name</th>
                <th className="py-2 pr-3">Discount %</th>
                <th className="py-2 pr-3">Applies To</th>
                <th className="py-2 pr-3">Date Range</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const status = getStatus(offer);
                const names = offer.items.map((item) =>
                  item.variantName ? `${item.menuItemName} - ${item.variantName}` : item.menuItemName
                );
                const visible = names.slice(0, 2).join(', ');
                const hiddenCount = Math.max(0, names.length - 2);
                return (
                  <tr key={offer.id} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-3 font-medium text-gray-900">{offer.name}</td>
                    <td className="py-3 pr-3">{offer.discountPct}%</td>
                    <td className="py-3 pr-3 text-gray-700">
                      {visible || '-'}
                      {hiddenCount > 0 ? ` +${hiddenCount} more` : ''}
                    </td>
                    <td className="py-3 pr-3 text-gray-700">{formatDateRange(offer.startDate, offer.endDate)}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : status === 'Paused'
                            ? 'bg-stone-100 text-stone-600'
                            : status === 'Upcoming'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(offer)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(offer)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
                        >
                          <Power size={14} />
                          {offer.isActive ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(offer.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 text-rose-600"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? 'Edit Offer' : 'Create Offer'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Weekend Special"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={form.discountPct}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, discountPct: Number(event.target.value || 0) }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Items</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by item name (EN/AR)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => {
                      const en = category.name || '';
                      const ar = category.nameAr || category.name || '';
                      const label = en === ar ? en : `${en} / ${ar}`;
                      return (
                        <option key={category.id} value={category.name}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3 space-y-2">
                  {sortedMenuItems.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No menu items found for this tenant yet. Create menu items first, then come back to link them to offers.
                    </p>
                  ) : selectorRows.length === 0 ? (
                    <p className="text-sm text-gray-500">No matching items for current search/filter.</p>
                  ) : selectorRows.map((row) => {
                    const checked =
                      form.itemIds.includes(row.targetId) ||
                      (row.targetId.includes('::') && form.itemIds.includes(row.menuItemId));
                    return (
                      <label key={row.targetId} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(row.targetId)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <span className="text-sm">
                          <span className="font-medium text-gray-900">
                            {row.itemNameEn}
                            {row.itemNameAr && row.itemNameAr !== row.itemNameEn ? ` / ${row.itemNameAr}` : ''}
                          </span>
                          {(row.variantNameEn || row.variantNameAr) ? (
                            <span className="text-gray-600">
                              {' '} - {(row.variantNameEn || '').trim()}
                              {row.variantNameAr && row.variantNameAr !== row.variantNameEn ? ` / ${row.variantNameAr}` : ''}
                            </span>
                          ) : null}
                          <span className="text-gray-500"> ({row.categoryLabel})</span>
                          {typeof row.price === 'number' ? (
                            <span className="text-gray-500"> - {row.price} EGP</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-[#101010] text-[#cfff5e] hover:bg-[#cfff5e] hover:text-[#101010] disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {offers.some((offer) => isOfferActive(offer)) ? (
        <p className="text-xs text-gray-500 mt-4">Active offers are immediately reflected on the customer menu.</p>
      ) : null}
    </div>
  );
}

