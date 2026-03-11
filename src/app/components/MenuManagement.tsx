import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Edit, Trash2, Star, FileSpreadsheet, Search, Filter, GripVertical, X, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Logo } from './Logo';
import { MenuItem, Category } from '../types/menu';
import { getItemPriceRange } from '../lib/pricing';
import { MenuItemForm } from './MenuItemForm';
import { CategoryForm } from './CategoryForm';
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
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryDeleteOpen, setCategoryDeleteOpen] = useState(false);
  const [showDragTooltip, setShowDragTooltip] = useState(false);
  const { t, isRtl } = useAdminLanguage();

  const dismissDragTooltip = useCallback(() => {
    setShowDragTooltip(false);
    try {
      localStorage.setItem('linkxtr-drag-tooltip-seen', '1');
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('linkxtr-drag-tooltip-seen');
    if (!seen) setShowDragTooltip(true);
  }, []);

  useEffect(() => {
    if (!showDragTooltip) return;
    const id = setTimeout(dismissDragTooltip, 4000);
    return () => clearTimeout(id);
  }, [showDragTooltip, dismissDragTooltip]);

  const sortedMenuItems = useMemo(() => [...menuItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [menuItems]);
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [categories]);

  const toggleCategoryCollapsed = useCallback((categoryId: string) => {
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const handleCategoryDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggingCategoryId(categoryId);
    e.dataTransfer.setData('text/plain', categoryId);
    e.dataTransfer.setData('application/x-category', '1');
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleCategoryDragOver = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/x-category')) {
      e.dataTransfer.dropEffect = 'move';
      if (draggingCategoryId && draggingCategoryId !== dropTargetId) setDragOverCategoryId(dropTargetId);
    }
  };
  const handleCategoryDragLeave = () => setDragOverCategoryId(null);
  const handleCategoryDragEnd = () => {
    setDraggingCategoryId(null);
    setDragOverCategoryId(null);
  };
  const handleCategoryDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    setDragOverCategoryId(null);
    if (!e.dataTransfer.types.includes('application/x-category')) return;
    const dragId = e.dataTransfer.getData('text/plain');
    if (!dragId || dragId === dropTargetId) return;
    const fromIndex = sortedCategories.findIndex((c) => c.id === dragId);
    const toIndex = sortedCategories.findIndex((c) => c.id === dropTargetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...sortedCategories];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    onReorderCategories(reordered.map((c, i) => ({ ...c, order: i })));
    setDraggingCategoryId(null);
  };

  const handleItemDragStart = (e: React.DragEvent, itemId: string) => {
    dismissDragTooltip();
    setDraggingItemId(itemId);
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.setData('application/x-item', '1');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (e.dataTransfer.types.includes('application/x-item') && draggingItemId && draggingItemId !== dropTargetId) {
      setDragOverItemId(dropTargetId);
    }
  };
  const handleItemDragEnter = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/x-item') && draggingItemId && draggingItemId !== dropTargetId) {
      setDragOverItemId(dropTargetId);
    }
  };
  const handleItemDragLeave = () => setDragOverItemId(null);
  const handleItemDragEnd = () => {
    setDraggingItemId(null);
    setDragOverItemId(null);
  };
  /** Reorder items within the same category only; builds full ordered list and persists. */
  const handleItemDropInCategory = (e: React.DragEvent, dropTargetId: string, categoryName: string) => {
    e.preventDefault();
    setDragOverItemId(null);
    if (!e.dataTransfer.types.includes('application/x-item')) return;
    const dragId = e.dataTransfer.getData('text/plain');
    if (!dragId || dragId === dropTargetId) return;
    const itemsInCat = sortedMenuItems.filter((i) => (i.category || '') === categoryName);
    const fromIndex = itemsInCat.findIndex((i) => i.id === dragId);
    const toIndex = itemsInCat.findIndex((i) => i.id === dropTargetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reorderedInCategory = [...itemsInCat];
    const [removed] = reorderedInCategory.splice(fromIndex, 1);
    reorderedInCategory.splice(toIndex, 0, removed);
    const fullOrder: MenuItem[] = [];
    let orderIndex = 0;
    for (const cat of sortedCategories) {
      const items = cat.name === categoryName ? reorderedInCategory : sortedMenuItems.filter((i) => (i.category || '') === cat.name).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      for (const item of items) {
        fullOrder.push({ ...item, order: orderIndex++ });
      }
    }
    onReorderItems(fullOrder);
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

  /** Categories in display order, each with its filtered items (for grouped layout). */
  const categoriesWithItems = useMemo(() => {
    return sortedCategories
      .filter((cat) => !categoryFilter || cat.name === categoryFilter)
      .map((cat) => ({
        category: cat,
        items: filteredItems
          .filter((item) => (item.category || '') === cat.name)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      }))
      .filter((g) => g.items.length > 0 || !searchQuery.trim()); // show empty categories when not searching
  }, [sortedCategories, filteredItems, categoryFilter, searchQuery]);

  const firstItemId = categoriesWithItems[0]?.items[0]?.id ?? null;

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

  const handleCategoryEditClick = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormOpen(true);
  };
  const handleCategoryDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setCategoryDeleteOpen(true);
  };
  const handleCategoryFormSubmit = (category: Category) => {
    if (editingCategory) {
      onEditCategory(category);
    } else {
      onAddCategory(category);
    }
    setCategoryFormOpen(false);
    setEditingCategory(null);
  };
  const confirmCategoryDelete = () => {
    if (categoryToDelete) {
      onDeleteCategory(categoryToDelete);
      setCategoryDeleteOpen(false);
      setCategoryToDelete(null);
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
    const { min, max } = getItemPriceRange(item);
    if (min === 0 && max === 0) return 'N/A';
    if (min === max) {
      const hasDiscount = item.discountedPrice != null && item.discountedPrice > 0 && item.price != null;
      const isSimpleItem = !item.priceVariants?.length && !item.optionGroups?.length;
      if (hasDiscount && isSimpleItem) return `${item.price} → ${item.discountedPrice} EGP`;
      return `${min} EGP`;
    }
    return `${min} - ${max} EGP`;
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
              onClick={() => {
                setEditingCategory(null);
                setCategoryFormOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 sm:px-5 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
            >
              <Plus size={18} className="text-gray-500" />
              {t('categories.addCategory')}
            </button>
            <button
              onClick={handleAddClick}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-sm hover:shadow"
            >
              <Plus size={18} />
              {t('items.addItem')}
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setImporterDialogOpen(true)}
                  className="flex items-center justify-center gap-2 bg-gray-700 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-all font-medium"
                  title={t('items.importMenuTooltip')}
                >
                  <FileSpreadsheet size={18} />
                  {t('items.importFromSheet')}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px]">
                {t('items.importMenuTooltip')}
              </TooltipContent>
            </Tooltip>
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
            {(searchQuery || categoryFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('');
                }}
                className="shrink-0 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                {t('items.resetFilters')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category-grouped list: collapse/expand, reorder categories, reorder items within category */}
      <div className="space-y-4">
        {sortedCategories.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Tag size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">{t('categories.noCategoriesYet')}</p>
            <p className="text-sm mt-1 text-gray-500">{t('categories.createFirstCategory')}</p>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryFormOpen(true);
              }}
              className="mt-6 inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Plus size={18} />
              {t('categories.addFirstCategory')}
            </button>
          </div>
        )}

        {categoriesWithItems.length === 0 && sortedCategories.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Logo height={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">
              {searchQuery || categoryFilter ? t('items.noMatchingItems') : t('items.noItemsYet')}
            </p>
            <p className="text-sm mt-1 text-gray-500">
              {searchQuery || categoryFilter ? t('items.tryAdjusting') : t('items.getStarted')}
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

        {categoriesWithItems.map(({ category, items: catItems }) => {
          const isCollapsed = collapsedCategoryIds.has(category.id);
          return (
            <div
              key={category.id}
              draggable
              onDragStart={(e) => handleCategoryDragStart(e, category.id)}
              onDragOver={(e) => handleCategoryDragOver(e, category.id)}
              onDragLeave={handleCategoryDragLeave}
              onDragEnd={handleCategoryDragEnd}
              onDrop={(e) => handleCategoryDrop(e, category.id)}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-colors ${
                draggingCategoryId === category.id ? 'opacity-50' : ''
              } ${dragOverCategoryId === category.id ? 'ring-2 ring-indigo-400 bg-indigo-50/30' : ''}`}
            >
              {/* Category header — distinctly larger/bolder than item rows */}
              <div className="flex items-center gap-2 px-4 py-3.5 bg-gray-50 border-b border-gray-200">
                <span className="cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-600 p-1" title={t('categories.dragToReorder')}>
                  <GripVertical size={18} />
                </span>
                <button
                  type="button"
                  onClick={() => toggleCategoryCollapsed(category.id)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                </button>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (category.color || '#6b7280') + '20' }}
                >
                  <Tag size={18} style={{ color: category.color || '#6b7280' }} />
                </div>
                <h2 className="flex-1 text-lg font-bold text-gray-900 min-w-0 truncate">
                  {category.name}
                  {category.nameAr && (
                    <>
                      <span className="text-gray-500 font-normal"> – </span>
                      <span dir="rtl">{category.nameAr}</span>
                    </>
                  )}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {t('items.categoryItemCount', { count: String(catItems.length) })}
                  </span>
                </h2>
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={category.isAvailable !== false}
                          onCheckedChange={(checked) => onEditCategory({ ...category, isAvailable: checked })}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {category.isAvailable !== false ? t('categories.hideCategory') : t('categories.showCategory')}
                    </TooltipContent>
                  </Tooltip>
                  <button
                    onClick={() => handleCategoryEditClick(category)}
                    className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={t('categories.edit')}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleCategoryDeleteClick(category.id)}
                    className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={t('categories.delete')}
                    disabled={(menuItemsCount[category.name] ?? 0) > 0}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Items in category (collapsible) */}
              {!isCollapsed && (
                <ul className="divide-y divide-gray-100">
                  {catItems.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-gray-500">
                      {t('items.noItemsYet')}
                      <button
                        onClick={handleAddClick}
                        className="ml-2 text-indigo-600 hover:underline font-medium"
                      >
                        {t('items.addFirstItem')}
                      </button>
                    </li>
                  ) : (
                    catItems.map((item) => (
                      <li
                        key={item.id}
                        onDragEnter={(e) => handleItemDragEnter(e, item.id)}
                        onDragOver={(e) => handleItemDragOver(e, item.id)}
                        onDragLeave={handleItemDragLeave}
                        onDrop={(e) => handleItemDropInCategory(e, item.id, category.name)}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors ${
                          !item.isAvailable ? 'opacity-60' : ''
                        } ${draggingItemId === item.id ? 'opacity-50' : ''} ${dragOverItemId === item.id ? 'ring-1 ring-indigo-400 bg-indigo-50/50' : ''}`}
                      >
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleItemDragStart(e, item.id);
                          }}
                          onDragEnd={handleItemDragEnd}
                          className="cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-600 shrink-0"
                          title={showDragTooltip && item.id === firstItemId ? t('items.dragHandleFirstLoadTooltip') : t('items.dragToReorder')}
                        >
                          <GripVertical size={18} />
                        </span>
                        {item.image && !failedImageIds.has(item.id) && (
                          <img
                            src={item.image}
                            alt={primaryName(item)}
                            className="w-12 h-12 object-cover rounded-lg ring-1 ring-gray-200 shrink-0"
                            onError={() => setFailedImageIds((prev) => new Set(prev).add(item.id))}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 truncate">
                              {primaryName(item)}
                              {item.nameAr && (
                                <>
                                  <span className="text-gray-400 font-normal"> – </span>
                                  <span dir="rtl">{item.nameAr}</span>
                                </>
                              )}
                            </span>
                            {item.isPopular && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-medium cursor-help">
                                    <Star size={10} fill="currentColor" />
                                    {t('items.popular')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px]">
                                  {t('items.popularBadgeTooltip')}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{primaryDescription(item)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-semibold text-gray-900">{getPriceRange(item)}</span>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                item.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <span className={`w-1 h-1 rounded-full ${item.isAvailable ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                              {item.isAvailable ? t('items.available') : t('items.unavailable')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleEditClick(item)} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={t('items.edit')}>
                            <Edit size={16} />
                          </button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                  checked={item.isAvailable}
                                  onCheckedChange={() => onToggleAvailability(item.id)}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {item.isAvailable ? t('items.markAsUnavailable') : t('items.markAsAvailable')}
                            </TooltipContent>
                          </Tooltip>
                          <button
                            onClick={() => onTogglePopular(item.id)}
                            className={`p-2 rounded-lg transition-colors ${item.isPopular ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-600 hover:bg-gray-100'}`}
                            title={item.isPopular ? t('items.removeFromPopular') : t('items.markAsPopular')}
                          >
                            <Star size={16} fill={item.isPopular ? 'currentColor' : 'none'} />
                          </button>
                          <button onClick={() => handleDeleteClick(item.id)} className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title={t('items.delete')}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          );
        })}
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
          categories={categories}
          onImportItems={onBulkImportItems}
          onImportCategories={onBulkImportCategories}
          onClose={() => setImporterDialogOpen(false)}
        />
      )}

      {/* Category Edit Dialog */}
      {categoryFormOpen && (
        <CategoryForm
          category={editingCategory}
          onSubmit={handleCategoryFormSubmit}
          onCancel={() => {
            setCategoryFormOpen(false);
            setEditingCategory(null);
          }}
        />
      )}

      {/* Category Delete Confirmation */}
      {categoryDeleteOpen && (
        <DeleteConfirmDialog
          title={t('deleteDialog.deleteCategory')}
          message={
            (categoryToDelete && (menuItemsCount[categories.find((c) => c.id === categoryToDelete)?.name || ''] ?? 0) > 0)
              ? t('deleteDialog.deleteCategoryHasItems')
              : t('deleteDialog.deleteCategoryConfirm')
          }
          onConfirm={confirmCategoryDelete}
          onCancel={() => {
            setCategoryDeleteOpen(false);
            setCategoryToDelete(null);
          }}
        />
      )}
        </>
      )}
    </div>
  );
});