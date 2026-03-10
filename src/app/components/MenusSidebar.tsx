import { memo, useState } from 'react';
import { Plus, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Menu } from '../types/menu';
import { menusApi } from '../services/api';
import { toast } from 'sonner';
import { useAdminLanguage } from '../context/AdminLanguageContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

const MENUS_COLLAPSE_THRESHOLD = 5;

interface MenusSidebarProps {
  menus: Menu[];
  selectedMenuId: string | null;
  onSelectMenu: (id: string | null) => void;
  onMenusChange: () => void;
  onCloseMenu?: () => void;
  canCreateMoreMenus: boolean;
}

export const MenusSidebar = memo(function MenusSidebar({
  menus,
  selectedMenuId,
  onSelectMenu,
  onMenusChange,
  onCloseMenu,
  canCreateMoreMenus,
}: MenusSidebarProps) {
  const { t } = useAdminLanguage();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [menusExpanded, setMenusExpanded] = useState(true);
  const shouldCollapse = menus.length > MENUS_COLLAPSE_THRESHOLD;
  const displayMenus = shouldCollapse && !menusExpanded ? menus.slice(0, MENUS_COLLAPSE_THRESHOLD) : menus;

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
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('menus.title')}</span>
        {canCreateMoreMenus && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1 text-sm font-medium text-[#101010] hover:text-[#101010]/80 transition-colors"
            title={t('menus.createNew')}
          >
            <Plus size={14} className="shrink-0" />
            <span>{t('layout.addNew')}</span>
          </button>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setNewMenuName(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('menus.createNew')}</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            placeholder={t('menus.menuName')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#101010]/20 focus:border-[#101010] outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateMenu()}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => { setIsCreateOpen(false); setNewMenuName(''); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('menus.cancel')}
            </button>
            <button
              type="button"
              onClick={handleCreateMenu}
              className="px-4 py-2 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] text-sm font-medium"
            >
              {t('menus.create')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-1">
        {displayMenus.map((menu) => {
          const isActive = selectedMenuId === menu.id;
          return (
            <div key={menu.id} className="mx-2">
              <button
                onClick={() => {
                  onSelectMenu(menu.id);
                  onCloseMenu?.();
                }}
                type="button"
                className={`w-full flex items-center gap-2 px-4 py-3 text-left min-w-0 rounded-2xl border transition-colors ${
                  isActive
                    ? 'bg-[#f0f0f0] border-gray-900 font-semibold text-gray-900'
                    : 'bg-white border-gray-200 hover:border-gray-300 font-medium text-gray-700'
                }`}
              >
                <span className="truncate text-sm flex-1 min-w-0">{menu.name}</span>
                <ChevronRight size={14} className={isActive ? 'text-gray-700 shrink-0' : 'text-gray-400 shrink-0'} />
              </button>
            </div>
          );
        })}
        {shouldCollapse && (
          <button
            type="button"
            onClick={() => setMenusExpanded((e) => !e)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-gray-700"
          >
            {menusExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{menusExpanded ? t('menus.showLess') : t('menus.showMore')}</span>
          </button>
        )}
      </div>

      {menus.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm px-2">
          <p className="mb-2">{t('menus.noMenusYet')}</p>
          {canCreateMoreMenus && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-[#101010] hover:underline font-medium"
            >
              {t('menus.createFirstMenu')}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
