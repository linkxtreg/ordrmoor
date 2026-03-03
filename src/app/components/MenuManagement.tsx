import { memo, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, EyeOff, Eye, Star, FolderTree, Search, Filter, GripVertical, X } from 'lucide-react';
import { Logo } from './Logo';
import { MenuItem, Category } from '../types/menu';
import { MenuItemForm } from './MenuItemForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { CategoriesManagement } from './CategoriesManagement';
import { SheetImporter } from './SheetImporter';
import { useAdminLanguage } from '../context/AdminLanguageContext';
interface MenuManagementProps {
  menuItems: MenuItem[];
  categories: Category[];
  onAdd: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (id: string) => void;
  onTogglePopular: (id: string) => void;
  onAddCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  menuItemsCount: Record<string, number>;
  onBulkImportItems: (upsert: { toAdd: MenuItem[]; toUpdate: MenuItem[] }) => Promise<void>;
  onBulkImportCategories: (categories: Category[]) => Promise<void>;
  onReorderItems: (orderedItems: MenuItem[]) => void | Promise<void>;
  onReorderCategories: (orderedCategories: Category[]) => void | Promise<void>;
}

export const MenuManagement = memo(function MenuManagement({
  menuItems,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onToggleAvailability,
  onTogglePopular,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  menuItemsCount,
  onBulkImportItems,
  onBulkImportCategories,
  onReorderItems,
  onReorderCategories,
}: MenuManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [categoriesPageOpen, setCategoriesPageOpen] = useState(false);
  const [importerDialogOpen, setImporterDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const { t, isRtl } = useAdminLanguage();

  const sortedMenuItems = useMemo(() => [...menuItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [menuItems]);

  const handleItemDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggingItemId(itemId);
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleItemDragOver = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingItemId && draggingItemId !== dropTargetId) setDragOverItemId(dropTargetId);
  };
  const handleItemDragLeave = () => setDragOverItemId(null);
  const handleItemDragEnd = () => {
    setDraggingItemId(null);
    setDragOverItemId(null);
  };
  const handleItemDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    setDragOverItemId(null);
    const dragId = e.dataTransfer.getData('text/plain');
    if (!dragId || dragId === dropTargetId) return;
    const fromIndex = sortedMenuItems.findIndex((i) => i.id === dragId);
    const toIndex = sortedMenuItems.findIndex((i) => i.id === dropTargetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...sortedMenuItems];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    onReorderItems(reordered.map((item, i) => ({ ...item, order: i })));
    setDraggingItemId(null);
  };

  const filteredItems = useMemo(() => {
    let result = menuItems;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const name = item.name || '';
        const nameEn = item.nameEn || '';
        const nameAr = item.nameAr || '';
        return (
          name.toLowerCase().includes(q) ||
          nameEn.toLowerCase().includes(q) ||
          nameAr.toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q)
        );
      });
    }
    if (categoryFilter) {
      result = result.filter((item) => (item.category || '') === categoryFilter);
    }
    return result;
  }, [menuItems, searchQuery, categoryFilter]);

  const primaryName = (item: MenuItem) => item.nameEn || item.name || '';
  const primaryDescription = (item: MenuItem) => item.descriptionEn ?? item.description ?? '';
  const getCategoryLabel = (category: Category) => {
    const categoryWithLegacyArabic = category as Category & { name_ar?: string };
    const arabicName = (category.nameAr ?? categoryWithLegacyArabic.name_ar ?? '').trim();
    return arabicName ? `${category.name} - ${arabicName}` : category.name;
  };

  const handleAddClick = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleFormSubmit = (item: MenuItem) => {
    if (editingItem) {
      onEdit(item);
    } else {
      onAdd(item);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.name === category);
    if (cat) {
      return `text-[${cat.color}] bg-[${cat.color}20]`;
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getPriceRange = (item: MenuItem) => {
    if (item.pricing && typeof item.pricing === 'object' && !item.price) {
      const prices: number[] = [];
      Object.values(item.pricing).forEach(mealTypes => {
        Object.values(mealTypes).forEach(price => {
          if (typeof price === 'number') prices.push(price);
        });
      });
      if (prices.length === 0) return 'N/A';
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max ? `${min} EGP` : `${min} - ${max} EGP`;
    }
    const variants = item.priceVariants && item.priceVariants.length > 0 ? item.priceVariants : null;
    if (variants) {
      const prices = variants.map((v) => (v.discountedPrice != null && v.discountedPrice > 0 ? v.discountedPrice : v.price));
      if (prices.length === 0) return 'N/A';
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max ? `${min} EGP` : `${min} - ${max} EGP`;
    }
    const effective = item.discountedPrice != null && item.discountedPrice > 0 ? item.discountedPrice : item.price ?? 0;
    if (item.discountedPrice != null && item.discountedPrice > 0 && item.price != null) {
      return `${item.price} → ${effective} EGP`;
    }
    return `${effective} EGP`;
  };

  return (
    <div className="space-y-6">
      {/* Categories page - full inside view */}
      {categoriesPageOpen ? (
        <CategoriesManagement
          categories={categories}
          onAdd={onAddCategory}
          onEdit={onEditCategory}
          onDelete={onDeleteCategory}
          onReorder={onReorderCategories}
          menuItemsCount={menuItemsCount}
          onCancel={() => setCategoriesPageOpen(false)}
          variant="page"
        />
      ) : (
        <>
      {/* All Items header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('items.allItems')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-gray-700">{filteredItems.length}</span>
              {searchQuery || categoryFilter ? (
                <span> {t('items.of')} <span className="font-medium">{menuItems.length}</span> {t('items.itemsCount')}</span>
              ) : (
                <span> {t('items.itemsCount')}</span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setCategoriesPageOpen(true)}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 sm:px-5 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
            >
              <FolderTree size={18} className="text-gray-500" />
              {t('items.manageCategories')}
            </button>
            <button
              onClick={handleAddClick}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-sm hover:shadow"
            >
              <Plus size={18} />
              {t('items.addItem')}
            </button>
            <button
              onClick={() => setImporterDialogOpen(true)}
              className="flex items-center justify-center gap-2 bg-gray-700 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-all font-medium"
            >
              <FolderTree size={18} />
              {t('items.importFromSheet')}
            </button>
          </div>
        </div>

        {/* Search and Filter - inside same card */}
        <div className="flex flex-col sm:flex-row gap-4 px-6 pb-6 pt-0">
          <div className="relative flex-1 sm:flex-[1.35] min-w-0 sm:min-w-[360px]">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`}
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('items.searchPlaceholder')}
              className={`w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-sm transition-colors ${
                isRtl ? 'pr-10 pl-12 text-right' : 'pl-10 pr-12 text-left'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${
                  isRtl ? 'left-2.5' : 'right-2.5'
                }`}
                title={t('items.clearSearch')}
                aria-label={t('items.clearSearch')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:min-w-[460px]">
            <div className="flex items-center gap-2 w-full">
              <Filter className="text-gray-400 shrink-0" size={18} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 w-full min-w-[420px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-sm transition-colors cursor-pointer"
              >
                <option value="">{t('items.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} dir="auto">
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
              }}
              disabled={!searchQuery && !categoryFilter}
              className="shrink-0 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('items.resetFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table View - Hidden on Mobile */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-2 py-3" aria-label={t('items.dragToReorder')} />
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('items.item')}
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('items.category')}
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('items.priceRange')}
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('items.status')}
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('items.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, item.id)}
                  onDragOver={(e) => handleItemDragOver(e, item.id)}
                  onDragLeave={handleItemDragLeave}
                  onDragEnd={handleItemDragEnd}
                  onDrop={(e) => handleItemDrop(e, item.id)}
                  className={`hover:bg-gray-50 transition-colors ${
                    !item.isAvailable ? 'opacity-60' : ''
                  } ${draggingItemId === item.id ? 'opacity-50' : ''} ${dragOverItemId === item.id ? 'ring-1 ring-indigo-400 bg-indigo-50/50' : ''}`}
                >
                  <td className="w-10 px-2 py-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600" title={t('items.dragToReorder')}>
                    <GripVertical size={18} className="touch-none" />
                  </td>
                  {/* Item Details */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {item.image && !failedImageIds.has(item.id) && (
                        <img
                          src={item.image}
                          alt={primaryName(item)}
                          className="w-16 h-16 object-cover rounded-lg ring-1 ring-gray-200"
                          onError={() => setFailedImageIds(prev => new Set(prev).add(item.id))}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {primaryName(item)}
                            {(item.nameAr) && (
                              <span className="text-gray-400 font-normal"> - </span>
                            )}
                            {item.nameAr && (
                              <span dir="rtl">{item.nameAr}</span>
                            )}
                          </h3>
                          {item.isPopular && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-xs font-medium">
                              <Star size={10} fill="currentColor" />
                              {t('items.popular')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1 text-left">
                          {primaryDescription(item)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getCategoryColor(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>
                  </td>

                  {/* Price Range */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {getPriceRange(item)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        item.isAvailable
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.isAvailable ? 'bg-emerald-600' : 'bg-gray-400'
                      }`} />
                      {item.isAvailable ? t('items.available') : t('items.unavailable')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={t('items.edit')}
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => onToggleAvailability(item.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.isAvailable
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={
                          item.isAvailable
                            ? t('items.markAsUnavailable')
                            : t('items.markAsAvailable')
                        }
                      >
                        {item.isAvailable ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </button>

                      <button
                        onClick={() => onTogglePopular(item.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.isPopular
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={
                          item.isPopular
                            ? t('items.removeFromPopular')
                            : t('items.markAsPopular')
                        }
                      >
                        <Star
                          size={16}
                          fill={item.isPopular ? 'currentColor' : 'none'}
                        />
                      </button>

                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={t('items.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Logo height={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">
              {searchQuery || categoryFilter ? t('items.noMatchingItems') : t('items.noItemsYet')}
            </p>
            <p className="text-sm mt-1">
              {searchQuery || categoryFilter
                ? t('items.tryAdjusting')
                : t('items.getStarted')}
            </p>
            {!searchQuery && !categoryFilter && (
              <button
                onClick={handleAddClick}
                className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <Plus size={18} />
                {t('items.addFirstItem')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Card View - Hidden on Desktop */}
      <div className="lg:hidden space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleItemDragStart(e, item.id)}
            onDragOver={(e) => handleItemDragOver(e, item.id)}
            onDragLeave={handleItemDragLeave}
            onDragEnd={handleItemDragEnd}
            onDrop={(e) => handleItemDrop(e, item.id)}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${
              !item.isAvailable ? 'opacity-60' : ''
            } ${draggingItemId === item.id ? 'opacity-50' : ''} ${dragOverItemId === item.id ? 'ring-2 ring-indigo-400 bg-indigo-50/50' : ''}`}
          >
            <div className="flex gap-4">
              <div className="cursor-grab active:cursor-grabbing touch-none self-center text-gray-400" title={t('items.dragToReorder')}>
                <GripVertical size={20} />
              </div>
              {item.image && !failedImageIds.has(item.id) && (
                <img
                  src={item.image}
                  alt={primaryName(item)}
                  className="w-20 h-20 object-cover rounded-lg ring-1 ring-gray-200 flex-shrink-0"
                  onError={() => setFailedImageIds(prev => new Set(prev).add(item.id))}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {primaryName(item)}
                      {item.nameAr && (
                        <><span className="text-gray-400 font-normal"> - </span><span dir="rtl">{item.nameAr}</span></>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                      {item.isPopular && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-xs font-medium">
                          <Star size={10} fill="currentColor" />
                          {t('items.popular')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                  {primaryDescription(item)}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {getPriceRange(item)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                      item.isAvailable
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.isAvailable ? 'bg-emerald-600' : 'bg-gray-400'
                    }`} />
                    {item.isAvailable ? t('items.available') : t('items.unavailable')}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleEditClick(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                  >
                    <Edit size={14} />
                    {t('items.edit')}
                  </button>

                  <button
                    onClick={() => onToggleAvailability(item.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      item.isAvailable
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-gray-600 bg-gray-100'
                    }`}
                    title={
                      item.isAvailable
                        ? t('items.markAsUnavailable')
                        : t('items.markAsAvailable')
                    }
                  >
                    {item.isAvailable ? (
                      <Eye size={16} />
                    ) : (
                      <EyeOff size={16} />
                    )}
                  </button>

                  <button
                    onClick={() => onTogglePopular(item.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      item.isPopular
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-gray-600 bg-gray-100'
                    }`}
                    title={
                      item.isPopular
                        ? t('items.removeFromPopular')
                        : t('items.markAsPopular')
                    }
                  >
                    <Star
                      size={16}
                      fill={item.isPopular ? 'currentColor' : 'none'}
                    />
                  </button>

                  <button
                    onClick={() => handleDeleteClick(item.id)}
                    className="p-2 text-rose-600 bg-rose-50 rounded-lg transition-colors"
                    title={t('items.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Logo height={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">
              {searchQuery || categoryFilter ? t('items.noMatchingItems') : t('items.noItemsYet')}
            </p>
            <p className="text-sm mt-1 text-gray-500">
              {searchQuery || categoryFilter
                ? t('items.tryAdjusting')
                : t('items.getStarted')}
            </p>
            {!searchQuery && !categoryFilter && (
              <button
                onClick={handleAddClick}
                className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <Plus size={18} />
                {t('items.addFirstItem')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <MenuItemForm
          item={editingItem}
          onSubmit={handleFormSubmit}
          onCancel={() => setDialogOpen(false)}
          categories={categories}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <DeleteConfirmDialog
          title={t('deleteDialog.deleteItem')}
          message={t('deleteDialog.deleteItemConfirm')}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}

      {/* Sheet Importer Dialog */}
      {importerDialogOpen && (
        <SheetImporter
          existingItems={menuItems}
          onImportItems={onBulkImportItems}
          onImportCategories={onBulkImportCategories}
          onClose={() => setImporterDialogOpen(false)}
        />
      )}
        </>
      )}
    </div>
  );
});