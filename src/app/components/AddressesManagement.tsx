import { useMemo, useState } from 'react';
import { ExternalLink, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { BranchAddress } from '../types/menu';
import { useAdminLanguage } from '../context/AdminLanguageContext';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface AddressesManagementProps {
  addresses: BranchAddress[];
  onCreate: (payload: { name: string; mapUrl: string }) => Promise<void>;
  onUpdate: (id: string, payload: { name: string; mapUrl: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (items: BranchAddress[]) => Promise<void>;
}

export function AddressesManagement({
  addresses,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: AddressesManagementProps) {
  const { t } = useAdminLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<BranchAddress | null>(null);
  const [branchName, setBranchName] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedAddresses = useMemo(
    () => [...addresses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [addresses]
  );

  const openAdd = () => {
    setEditing(null);
    setBranchName('');
    setMapUrl('');
    setIsFormOpen(true);
  };

  const openEdit = (address: BranchAddress) => {
    setEditing(address);
    setBranchName(address.name);
    setMapUrl(address.mapUrl || '');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setBranchName('');
    setMapUrl('');
  };

  const handleSubmit = async () => {
    if (!branchName.trim()) {
      toast.error(t('addresses.validationName'));
      return;
    }
    try {
      setIsSaving(true);
      if (editing) {
        await onUpdate(editing.id, { name: branchName.trim(), mapUrl: mapUrl.trim() });
      } else {
        await onCreate({ name: branchName.trim(), mapUrl: mapUrl.trim() });
      }
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save branch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    if (draggingId && draggingId !== dropTargetId) setDragOverId(dropTargetId);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === dropTargetId) return;
    const fromIndex = sortedAddresses.findIndex((a) => a.id === draggedId);
    const toIndex = sortedAddresses.findIndex((a) => a.id === dropTargetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...sortedAddresses];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    try {
      await onReorder(reordered.map((item, index) => ({ ...item, order: index })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder branches');
    } finally {
      setDraggingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete branch');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-600">{t('addresses.helper')}</p>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={17} />
          {t('addresses.addBranch')}
        </button>
      </div>

      <div className="space-y-3">
        {sortedAddresses.map((address) => (
          <div
            key={address.id}
            draggable
            onDragStart={(e) => handleDragStart(e, address.id)}
            onDragOver={(e) => handleDragOver(e, address.id)}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, address.id)}
            className={`bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 ${
              draggingId === address.id ? 'opacity-60' : ''
            } ${dragOverId === address.id ? 'ring-1 ring-indigo-400 bg-indigo-50/40' : ''}`}
          >
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
              title={t('categories.dragToReorder')}
            >
              <GripVertical size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold text-gray-900 tracking-tight">{address.name}</p>
              {address.mapUrl ? (
                <a
                  href={address.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  <ExternalLink size={14} />
                  {t('addresses.viewOnMap')}
                </a>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => openEdit(address)}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title={t('categories.edit')}
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setDeleteId(address.id)}
                className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title={t('categories.delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {sortedAddresses.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          {t('addresses.noBranches')}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-7 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-gray-900">
                    {editing ? t('addresses.editTitle') : t('addresses.addTitle')}
                  </h2>
                  <p className="text-gray-600 mt-1">{t('addresses.formSubtitle')}</p>
                </div>
                <button
                  onClick={closeForm}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="px-8 py-7 space-y-6">
              <div>
                <label className="block text-xl font-medium text-gray-700 mb-2">{t('addresses.branchName')}</label>
                <input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder={t('addresses.branchNamePlaceholder')}
                  className="w-full px-5 py-4 border border-gray-300 rounded-2xl text-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xl font-medium text-gray-700 mb-2">{t('addresses.locationUrl')}</label>
                <input
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder={t('addresses.locationUrlPlaceholder')}
                  className="w-full px-5 py-4 border border-gray-300 rounded-2xl text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <p className="text-gray-500 text-base mt-2">{t('addresses.locationUrlHint')}</p>
              </div>
            </div>
            <div className="px-8 py-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={closeForm}
                className="px-7 py-3 border border-gray-300 rounded-2xl text-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('addresses.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {editing ? t('addresses.saveEdit') : t('addresses.saveAdd')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <DeleteConfirmDialog
          title={t('addresses.deleteTitle')}
          message={t('addresses.deleteMessage')}
          onCancel={() => setDeleteId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
