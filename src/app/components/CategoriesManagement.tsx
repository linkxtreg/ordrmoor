import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Tag, X, ArrowLeft, GripVertical } from 'lucide-react';
import { Category } from '../types/menu';
import { CategoryForm } from './CategoryForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useAdminLanguage } from '../context/AdminLanguageContext';

interface CategoriesManagementProps {
  categories: Category[];
  onAdd: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onReorder?: (orderedCategories: Category[]) => void | Promise<void>;
  menuItemsCount: Record<string, number>;
  onCancel?: () => void;
  /** When 'page', renders as full page content with back button. When 'modal', renders as overlay/dialog. */
  variant?: 'modal' | 'page';
}

export function CategoriesManagement({
  categories,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  menuItemsCount,
  onCancel,
  variant = 'modal',
}: CategoriesManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const { t } = useAdminLanguage();

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [categories]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingId && draggingId !== dropTargetId) setDragOverId(dropTargetId);
  };
  const handleDragLeave = () => setDragOverId(null);
  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };
  const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const dragId = e.dataTransfer.getData('text/plain');
    if (!dragId || dragId === dropTargetId) return;
    const fromIndex = sortedCategories.findIndex((c) => c.id === dragId);
    const toIndex = sortedCategories.findIndex((c) => c.id === dropTargetId);
    if (fromIndex === -1 || toIndex === -1 || !onReorder) return;
    const reordered = [...sortedCategories];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    onReorder(reordered.map((c, i) => ({ ...c, order: i })));
    setDraggingId(null);
  };

  const handleAddClick = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      onDelete(categoryToDelete);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleFormSubmit = (category: Category) => {
    if (editingCategory) {
      onEdit(category);
    } else {
      onAdd(category);
    }
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const isPage = variant === 'page';

  return (
    <>
      {/* Modal Backdrop - only for modal variant */}
      {isPage ? null : onCancel && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onCancel}
        />
      )}

      {/* Content wrapper: full overlay for modal, normal flow for page */}
      <div className={isPage ? "" : onCancel ? "fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-20" : ""}>
        <div className={isPage ? "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" : onCancel ? "mx-auto max-w-6xl bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 my-8" : "space-y-6"}>
          {/* Back/Close Button */}
          {onCancel && (
            isPage ? (
              <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50">
                <button
                  onClick={onCancel}
                  className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                  title={t('categories.backToItems')}
                >
                  <ArrowLeft size={18} />
                  {t('categories.backToItems')}
                </button>
              </div>
            ) : (
              <button
                onClick={onCancel}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
                title={t('categories.close')}
              >
                <X size={20} />
              </button>
            )
          )}

          <div className={`space-y-6 ${isPage ? "p-6" : ""}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('categories.title')}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t('categories.countTotal', { count: String(categories.length) })}
                </p>
              </div>
              <button
                onClick={handleAddClick}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
              >
                <Plus size={18} />
                {t('categories.addCategory')}
              </button>
            </div>

            {/* Categories Table - same style as All Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="w-10 px-2 py-3" aria-label={t('categories.dragToReorder')} />
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t('categories.categoryCol')}
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t('categories.description')}
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                        {t('categories.items')}
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {t('items.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedCategories.map((category) => (
                      <tr
                        key={category.id}
                        draggable={!!onReorder}
                        onDragStart={(e) => handleDragStart(e, category.id)}
                        onDragOver={(e) => handleDragOver(e, category.id)}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, category.id)}
                        className={`hover:bg-gray-50 transition-colors ${
                          draggingId === category.id ? 'opacity-50' : ''
                        } ${dragOverId === category.id ? 'ring-1 ring-indigo-400 bg-indigo-50/50' : ''}`}
                      >
                        <td className="w-10 px-2 py-4 text-gray-400 hover:text-gray-600" title={t('categories.dragToReorder')}>
                          {onReorder && (
                            <span className="cursor-grab active:cursor-grabbing touch-none inline-block">
                              <GripVertical size={18} />
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: category.color + '20' }}
                            >
                              <Tag size={20} style={{ color: category.color }} />
                            </div>
                            <span className="font-semibold text-gray-900">
                              {category.name}
                              {category.nameAr && (
                                <>
                                  <span className="text-gray-400 font-normal"> - </span>
                                  <span dir="rtl">{category.nameAr}</span>
                                </>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 line-clamp-2 max-w-md">
                            {category.description || '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {menuItemsCount[category.name] ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(category)}
                              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title={t('categories.edit')}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(category.id)}
                              className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={t('categories.delete')}
                              disabled={(menuItemsCount[category.name] ?? 0) > 0}
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

              {sortedCategories.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  <Tag size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-900">{t('categories.noCategoriesYet')}</p>
                  <p className="text-sm mt-1">
                    {t('categories.createFirstCategory')}
                  </p>
                  <button
                    onClick={handleAddClick}
                    className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <Plus size={18} />
                    {t('categories.addFirstCategory')}
                  </button>
                </div>
              )}
            </div>

            {/* Add/Edit Dialog */}
            {dialogOpen && (
              <CategoryForm
                category={editingCategory}
                onSubmit={handleFormSubmit}
                onCancel={() => setDialogOpen(false)}
              />
            )}

            {/* Delete Confirmation Dialog */}
            {deleteConfirmOpen && (
              <DeleteConfirmDialog
                title={t('deleteDialog.deleteCategory')}
                message={
                  menuItemsCount[categories.find(c => c.id === categoryToDelete)?.name || ''] > 0
                    ? t('deleteDialog.deleteCategoryHasItems')
                    : t('deleteDialog.deleteCategoryConfirm')
                }
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}