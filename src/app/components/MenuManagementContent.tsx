import { useState, useEffect, useMemo } from 'react';
import { MenuItem, Category, Menu } from '../types/menu';
import { useTenant } from '../context/TenantContext';
import { useAdminLanguage } from '../context/AdminLanguageContext';
import { menuItemsApi, categoriesApi, menusApi } from '../services/api';
import { toast } from 'sonner';
import { MenuManagement } from './MenuManagement';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Link2, Edit2, Copy, Trash2, Eye, QrCode, X } from 'lucide-react';
import { LoadingIcon } from './LoadingIcon';

interface MenuManagementContentProps {
  menu: Menu;
  onMenusChange: () => void | Promise<void>;
  onAfterDuplicate: (newMenuId: string) => void;
  onAfterDelete: (deletedMenuId: string) => void;
  canDuplicateMenu: boolean;
}

export function MenuManagementContent({
  menu,
  onMenusChange,
  onAfterDuplicate,
  onAfterDelete,
  canDuplicateMenu,
}: MenuManagementContentProps) {
  const { id: menuId, name: menuName, slug } = menu;
  const { basePath } = useTenant();
  const { t } = useAdminLanguage();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [itemsData, catsData] = await Promise.all([
          menuItemsApi.getAll(menuId),
          categoriesApi.getAll(menuId),
        ]);
        const uniqueItems = Array.from(new Map(itemsData.map((i) => [i.id, i])).values());
        const uniqueCats = Array.from(new Map(catsData.map((c) => [c.id, c])).values());
        setMenuItems(uniqueItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        setCategories(uniqueCats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      } catch (error) {
        console.error('Error loading menu data:', error);
        toast.error(t('toasts.failedToLoadMenuData'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [menuId]);

  useEffect(() => {
    if (!qrModalOpen || !slug) return;
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${basePath}/menu/${slug}`;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(url, { width: 256, margin: 2 }))
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [qrModalOpen, slug, basePath]);

  const getMenuItemsCountByCategory = useMemo((): Record<string, number> => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      counts[cat.name] = 0;
    });
    menuItems.forEach((item) => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    });
    return counts;
  }, [categories, menuItems]);

  const addMenuId = <T extends { menuId?: string }>(obj: T): T => ({
    ...obj,
    menuId,
  });

  const handleAddItem = async (newItem: MenuItem) => {
    const itemWithOrder = addMenuId({
      ...newItem,
      order: menuItems.length,
    });
    const created = await menuItemsApi.create(itemWithOrder);
    setMenuItems((prev) => [...prev, created]);
    toast.success(t('toasts.itemAdded'));
  };

  const handleEditItem = async (updatedItem: MenuItem) => {
    const withMenuId = addMenuId(updatedItem);
    const updated = await menuItemsApi.update(updatedItem.id, withMenuId);
    setMenuItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    toast.success(t('toasts.itemUpdated'));
  };

  const handleDeleteItem = async (id: string) => {
    await menuItemsApi.delete(id);
    setMenuItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(t('toasts.itemDeleted'));
  };

  const handleReorderItems = async (orderedItems: MenuItem[]) => {
    try {
      await Promise.all(
        orderedItems.map((item, i) =>
          menuItemsApi.update(item.id, addMenuId({ ...item, order: i }))
        )
      );
      setMenuItems(orderedItems.map((item, i) => ({ ...item, order: i })));
      toast.success(t('toasts.itemsReordered'));
    } catch {
      toast.error(t('toasts.failedToSaveOrder'));
    }
  };

  const handleAddCategory = async (newCategory: Category) => {
    const catWithOrder = addMenuId({
      ...newCategory,
      order: categories.length,
    });
    const created = await categoriesApi.create(catWithOrder);
    setCategories((prev) => [...prev, created]);
    toast.success(t('toasts.categoryAdded'));
  };

  const handleEditCategory = async (updatedCategory: Category) => {
    const oldName = categories.find((c) => c.id === updatedCategory.id)?.name;
    const withMenuId = addMenuId(updatedCategory);
    const updated = await categoriesApi.update(updatedCategory.id, withMenuId);
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

    if (oldName && oldName !== updatedCategory.name) {
      const itemsToUpdate = menuItems.filter((i) => i.category === oldName);
      await Promise.all(
        itemsToUpdate.map((item) =>
          menuItemsApi.update(item.id, addMenuId({ ...item, category: updatedCategory.name }))
        )
      );
      setMenuItems((prev) =>
        prev.map((i) => (i.category === oldName ? { ...i, category: updatedCategory.name } : i))
      );
    }
    toast.success(t('toasts.categoryUpdated'));
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    const hasItems = menuItems.some((i) => i.category === cat?.name);
    if (hasItems) {
      toast.error(t('toasts.cannotDeleteCategoryWithItems'));
      throw new Error('Cannot delete category with menu items');
    }
    await categoriesApi.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success(t('toasts.categoryDeleted'));
  };

  const handleReorderCategories = async (orderedCategories: Category[]) => {
    try {
      await Promise.all(
        orderedCategories.map((cat, i) =>
          categoriesApi.update(cat.id, addMenuId({ ...cat, order: i }))
        )
      );
      setCategories(orderedCategories.map((c, i) => ({ ...c, order: i })));
      toast.success(t('toasts.categoriesReordered'));
    } catch {
      toast.error(t('toasts.failedToSaveOrder'));
    }
  };

  const handleBulkImportItems = async (upsert: { toAdd: MenuItem[]; toUpdate: MenuItem[] }) => {
    const { toAdd, toUpdate } = upsert;
    const total = toAdd.length + toUpdate.length;
    if (total === 0) return;
    toast.success(t('toasts.importingItemsCount', { count: String(total) }));
    const createdItems = await Promise.all(
      toAdd.map((item, idx) =>
        menuItemsApi.create(
          addMenuId({ ...item, id: crypto.randomUUID(), order: menuItems.length + idx })
        )
      )
    );
    const updatedItems = await Promise.all(
      toUpdate.map((item) => menuItemsApi.update(item.id, addMenuId(item)))
    );
    const updatedById = new Map(updatedItems.map((item) => [item.id, item]));
    setMenuItems((prev) => [
      ...prev.map((item) => updatedById.get(item.id) ?? item),
      ...createdItems,
    ]);
    toast.success(t('toasts.importedItemsCount', { count: String(total) }));
  };

  const handleBulkImportCategories = async (newCategories: Category[]) => {
    toast.success(t('toasts.importingCategories'));
    const existingNames = new Set(categories.map((c) => c.name));
    const categoriesToCreate = newCategories.filter((cat) => !existingNames.has(cat.name));
    const createdCategories = await Promise.all(
      categoriesToCreate.map((cat, idx) =>
        categoriesApi.create(
          addMenuId({ ...cat, id: crypto.randomUUID(), order: categories.length + idx })
        )
      )
    );
    if (createdCategories.length > 0) {
      setCategories((prev) => [...prev, ...createdCategories]);
    }
    toast.success(t('toasts.importedCategoriesCount', { count: String(createdCategories.length) }));
  };

  const copyShareLink = async () => {
    const menuSlug = menu.slug;
    if (!menuSlug) {
      toast.error(t('toasts.saveMenuToGenerateLink'));
      return;
    }
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${basePath}/menu/${menuSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('toasts.linkCopied'));
    } catch {
      toast.error(t('toasts.failedToCopyLink'));
    }
  };

  const startEditName = () => {
    setEditingName(menuName);
    setIsEditingName(true);
  };

  const saveMenuName = async () => {
    if (!editingName.trim()) return;
    try {
      await menusApi.update(menuId, { name: editingName.trim() });
      setIsEditingName(false);
      onMenusChange();
      toast.success(t('toasts.menuUpdated'));
    } catch {
      toast.error(t('toasts.failedToUpdateMenu'));
    }
  };

  const handleDuplicateMenu = async () => {
    if (!canDuplicateMenu) {
      toast.error(t('toasts.cannotDuplicateMenuPlanLimit'));
      return;
    }
    try {
      const duplicated = await menusApi.duplicate(menuId);
      onMenusChange();
      onAfterDuplicate(duplicated.id);
      toast.success(t('toasts.menuDuplicated'));
    } catch {
      toast.error(t('toasts.failedToDuplicateMenu'));
    }
  };

  const handleDeleteMenu = async () => {
    try {
      await menusApi.delete(menuId);
      setDeleteConfirmOpen(false);
      await onMenusChange();
      onAfterDelete(menuId);
      toast.success(t('toasts.menuDeleted'));
    } catch (err) {
      console.error('Delete menu failed:', err);
      toast.error(t('toasts.failedToDeleteMenu'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingIcon className="w-8 h-8" />
      </div>
    );
  }

  const previewUrl = slug ? `${basePath}/menu/${slug}` : `${basePath}/menu`;

  return (
    <div className="space-y-6">
      {/* Menu header card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 min-w-0 px-6 py-4 sm:py-5">
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-base font-semibold min-w-0 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveMenuName()}
              />
              <button onClick={saveMenuName} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                {t('menuContent.save')}
              </button>
              <button onClick={() => setIsEditingName(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                {t('itemForm.cancel')}
              </button>
            </div>
          ) : (
            <>
              <div className="h-10 w-1 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shrink-0" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {t('menuContent.menuTitle', { name: menuName })}
              </h3>
            </>
          )}
        </div>
        {!isEditingName && (
          <div className="flex flex-wrap items-center gap-2 px-6 py-4 sm:py-5 bg-gray-50/50 sm:bg-transparent border-t sm:border-t-0 sm:border-l border-gray-100">
            <button
              onClick={() => window.open(previewUrl, '_blank')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium shadow-sm hover:shadow"
              title={t('menuContent.preview')}
            >
              <Eye size={18} />
              <span>{t('menuContent.previewMenu')}</span>
            </button>
            <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
              <button
                onClick={copyShareLink}
                className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title={t('menuContent.copyShareLink')}
              >
                <Link2 size={18} />
              </button>
              <button
                onClick={startEditName}
                className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title={t('menuContent.editName')}
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={handleDuplicateMenu}
                className="p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('menuContent.duplicate')}
                disabled={!canDuplicateMenu}
              >
                <Copy size={18} />
              </button>
              <button
                onClick={() => setQrModalOpen(true)}
                className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title={t('menuContent.qrCode')}
              >
                <QrCode size={18} />
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="p-2.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title={t('menuContent.deleteMenu')}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirmOpen && (
        <DeleteConfirmDialog
          title={t('deleteDialog.deleteMenu')}
          message={t('deleteDialog.deleteMenuConfirm', { name: menuName })}
          onConfirm={handleDeleteMenu}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}

      {qrModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('menuContent.qrCode')}</h2>
                <button
                  onClick={() => setQrModalOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={t('menuContent.close')}
                >
                  <span className="sr-only">{t('menuContent.close')}</span>
                  <X size={18} />
                </button>
              </div>
              {slug ? (
                <>
                  <div className="flex justify-center bg-gray-50 rounded-xl p-4 mb-4">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Menu QR Code" className="w-64 h-64" />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center">
                        <LoadingIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4 truncate" title={previewUrl}>
                    {window.location.origin}{basePath}/menu/{slug}
                  </p>
                  {qrDataUrl ? (
                    <a
                      href={qrDataUrl}
                      download={`${menuName.replace(/\s+/g, '-')}-qr-code.png`}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      {t('menuContent.downloadQr')}
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed">
                      {t('menuContent.downloadQr')}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">{t('menuContent.saveMenuToGenerateQr')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <MenuManagement
        menuItems={menuItems}
        categories={categories}
        onAdd={handleAddItem}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        onToggleAvailability={async (id) => {
          const item = menuItems.find((i) => i.id === id);
          if (!item) return;
          const updated = await menuItemsApi.update(id, addMenuId({ ...item, isAvailable: !item.isAvailable }));
          setMenuItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        }}
        onTogglePopular={async (id) => {
          const item = menuItems.find((i) => i.id === id);
          if (!item) return;
          const updated = await menuItemsApi.update(id, addMenuId({ ...item, isPopular: !item.isPopular }));
          setMenuItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        }}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        menuItemsCount={getMenuItemsCountByCategory}
        onBulkImportItems={handleBulkImportItems}
        onBulkImportCategories={handleBulkImportCategories}
        onReorderItems={handleReorderItems}
        onReorderCategories={handleReorderCategories}
      />
    </div>
  );
}
