import { useState } from 'react';
import { Plus, Edit2, Copy, Trash2, ChevronRight } from 'lucide-react';
import { Logo } from './Logo';
import { Menu } from '../types/menu';
import { menusApi } from '../services/api';
import { toast } from 'sonner';
import { MenuManagementContent } from './MenuManagementContent';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface MenusManagementProps {
  menus: Menu[];
  onMenusChange: () => void;
}

export function MenusManagement({
  menus,
  onMenusChange,
}: MenusManagementProps) {
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmMenu, setDeleteConfirmMenu] = useState<Menu | null>(null);
  const [newMenuName, setNewMenuName] = useState('');

  const selectedMenu = menus.find((m) => m.id === selectedMenuId);

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) {
      toast.error('Please enter a menu name');
      return;
    }
    try {
      const created = await menusApi.create({
        name: newMenuName.trim(),
        order: menus.length,
      });
      setNewMenuName('');
      setIsCreateOpen(false);
      setSelectedMenuId(created.id);
      onMenusChange();
      toast.success('Menu created successfully');
    } catch (error) {
      console.error('Error creating menu:', error);
      toast.error('Failed to create menu');
    }
  };

  const handleUpdateMenu = async () => {
    if (!editingMenuId || !editingName.trim()) return;
    try {
      await menusApi.update(editingMenuId, { name: editingName.trim() });
      setEditingMenuId(null);
      setEditingName('');
      onMenusChange();
      toast.success('Menu updated successfully');
    } catch (error) {
      console.error('Error updating menu:', error);
      toast.error('Failed to update menu');
    }
  };

  const handleDuplicateMenu = async (menu: Menu) => {
    try {
      const duplicated = await menusApi.duplicate(menu.id);
      onMenusChange();
      setSelectedMenuId(duplicated.id);
      toast.success(`Menu duplicated successfully`);
    } catch (error) {
      console.error('Error duplicating menu:', error);
      toast.error('Failed to duplicate menu');
    }
  };

  const handleDeleteMenu = async (menu: Menu) => {
    try {
      await menusApi.delete(menu.id);
      if (selectedMenuId === menu.id) {
        setSelectedMenuId(menus.length > 1 ? menus.find((m) => m.id !== menu.id)?.id ?? null : null);
      }
      setDeleteConfirmMenu(null);
      onMenusChange();
      toast.success('Menu deleted successfully');
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.error('Failed to delete menu');
    }
  };

  const startEdit = (menu: Menu) => {
    setEditingMenuId(menu.id);
    setEditingName(menu.name);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Menus list - left side */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Menus</h2>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="p-1.5 text-gray-500 hover:text-[#101010] hover:bg-[#f9faf3] rounded-lg transition-colors"
              title="Create new menu"
            >
              <Plus size={20} />
            </button>
          </div>

          {isCreateOpen && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <input
                type="text"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                placeholder="Menu name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateMenu()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateMenu}
                  className="px-3 py-1.5 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] text-sm"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreateOpen(false);
                    setNewMenuName('');
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className={`border rounded-lg overflow-hidden ${
                  selectedMenuId === menu.id
                    ? 'border-[#101010] bg-[#f9faf3]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {editingMenuId === menu.id ? (
                  <div className="p-3">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-sm mb-2"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateMenu()}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateMenu}
                        className="px-2 py-1 bg-[#101010] text-[#cfff5e] rounded text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingMenuId(null);
                          setEditingName('');
                        }}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <button
                      onClick={() => setSelectedMenuId(menu.id)}
                      className="flex-1 flex items-center gap-3 p-3 text-left min-w-0"
                    >
                      <span className="font-medium truncate">{menu.name}</span>
                      <ChevronRight size={16} className="text-gray-400 shrink-0" />
                    </button>
                    <div className="flex items-center gap-1 pr-2 shrink-0">
                      <button
                        onClick={() => startEdit(menu)}
                        className="p-1.5 text-gray-500 hover:text-[#101010] hover:bg-[#f9faf3] rounded"
                        title="Edit name"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDuplicateMenu(menu)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Duplicate menu"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmMenu(menu)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete menu"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {menus.length === 0 && !isCreateOpen && (
            <div className="text-center py-8 text-gray-500">
              <Logo height={40} className="mx-auto mb-2 opacity-50 text-gray-400" />
              <p>No menus yet</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-2 text-[#101010] hover:underline"
              >
                Create your first menu
              </button>
            </div>
          )}
        </div>

        {/* Menu content - right side */}
        <div className="flex-1 min-w-0">
          {selectedMenu ? (
            <MenuManagementContent
              key={selectedMenu.id}
              menuId={selectedMenu.id}
              menuName={selectedMenu.name}
              onMenusChange={onMenusChange}
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
              <Logo height={48} className="mx-auto mb-4 opacity-30 text-gray-400" />
              <p>Select a menu from the list to manage its categories and items</p>
            </div>
          )}
        </div>
      </div>

      {deleteConfirmMenu && (
        <DeleteConfirmDialog
          onConfirm={() => deleteConfirmMenu && handleDeleteMenu(deleteConfirmMenu)}
          onCancel={() => setDeleteConfirmMenu(null)}
          title="Delete Menu"
          message={`Are you sure you want to delete "${deleteConfirmMenu.name}"? This will also delete all categories and items in this menu.`}
        />
      )}
    </div>
  );
}
