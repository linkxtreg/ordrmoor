import { memo, useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { Menu } from '../types/menu';
import { menusApi } from '../services/api';
import { toast } from 'sonner';
import { useAdminLanguage } from '../context/AdminLanguageContext';

interface MenusSidebarProps {
  menus: Menu[];
  selectedMenuId: string | null;
  onSelectMenu: (id: string | null) => void;
  onMenusChange: () => void;
  onCloseMenu?: () => void;
}

export const MenusSidebar = memo(function MenusSidebar({
  menus,
  selectedMenuId,
  onSelectMenu,
  onMenusChange,
  onCloseMenu,
}: MenusSidebarProps) {
  const { t } = useAdminLanguage();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) {
      toast.error(t('toasts.pleaseEnterMenuName'));
      return;
    }
    try {
      const created = await menusApi.create({
        name: newMenuName.trim(),
        order: menus.length,
      });
      setNewMenuName('');
      setIsCreateOpen(false);
      onSelectMenu(created.id);
      onMenusChange();
      toast.success(t('toasts.menuCreated'));
    } catch (error) {
      console.error('Error creating menu:', error);
      toast.error(t('toasts.failedToCreateMenu'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('menus.title')}</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="p-1.5 text-gray-500 hover:text-[#101010] hover:bg-[#f9faf3] rounded-lg transition-colors"
          title={t('menus.createNew')}
        >
          <Plus size={18} />
        </button>
      </div>

      {isCreateOpen && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mx-2">
          <input
            type="text"
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            placeholder={t('menus.menuName')}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateMenu()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateMenu}
              className="px-2 py-1.5 bg-[#101010] text-[#cfff5e] rounded hover:bg-[#cfff5e] hover:text-[#101010] text-xs font-medium"
            >
              {t('menus.create')}
            </button>
            <button
              onClick={() => {
                setIsCreateOpen(false);
                setNewMenuName('');
              }}
              className="px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-xs"
            >
              {t('menus.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className={`border rounded-lg overflow-hidden mx-2 ${
              selectedMenuId === menu.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <button
              onClick={() => {
                onSelectMenu(menu.id);
                onCloseMenu?.();
              }}
              type="button"
              className="w-full flex items-center gap-2 p-2.5 text-left min-w-0"
            >
              <span className="font-medium truncate text-sm">{menu.name}</span>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
            </button>
          </div>
        ))}
      </div>

      {menus.length === 0 && !isCreateOpen && (
        <div className="text-center py-6 text-gray-500 text-sm px-2">
          <p className="mb-2">{t('menus.noMenusYet')}</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="text-blue-600 hover:underline"
          >
            {t('menus.createFirstMenu')}
          </button>
        </div>
      )}

    </div>
  );
});
