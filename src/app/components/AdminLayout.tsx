import { ReactNode, useState } from 'react';
import { Info, Menu, X, LogOut, Crown } from 'lucide-react';
import { Logo } from './Logo';
import { useTenant } from '../context/TenantContext';
import { useAdminLanguage } from '../context/AdminLanguageContext';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

export type NavItem = { key: string; label: string; icon: ReactNode; comingSoon?: boolean };

interface AdminLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  children: ReactNode;
  sidebarMenus?: (props: { onCloseMenu: () => void }) => ReactNode;
  extraNavItems?: NavItem[];
  /** Optional breadcrumb shown at top of content area e.g. "Menus > Main" */
  breadcrumb?: string;
}

const OPERATIONS_ORDER: string[] = ['offers', 'addresses', 'loyalty'];

function NavButton({
  active,
  onClick,
  icon,
  label,
  disabled,
  tooltip,
  strongActive,
  lockIcon,
  className = '',
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  tooltip?: string;
  strongActive?: boolean;
  lockIcon?: ReactNode;
  className?: string;
}) {
  const base = 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-start border';
  const activeClass = strongActive
    ? 'bg-[#f0f0f0] text-gray-900 border-gray-900 font-semibold'
    : 'bg-transparent text-gray-900 border-transparent';
  const inactiveClass = disabled
    ? 'text-gray-400 cursor-not-allowed border-transparent'
    : 'text-gray-600 hover:bg-gray-100 border-transparent';
  const lockedClass = lockIcon && !disabled ? 'text-gray-500 hover:bg-gray-100 border-transparent' : '';
  const btn = (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${active ? activeClass : lockIcon ? lockedClass : inactiveClass} ${className}`}
    >
      {icon}
      <span className="flex-1 min-w-0 truncate text-start">{label}</span>
      {lockIcon}
    </button>
  );
  if (tooltip && (disabled || lockIcon)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return btn;
}

export function AdminLayout({
  activeSection,
  onSectionChange,
  onLogout,
  children,
  sidebarMenus,
  extraNavItems = [],
  breadcrumb,
}: AdminLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [upgradeModalKey, setUpgradeModalKey] = useState<string | null>(null);
  const { tenantName } = useTenant();
  const { t, lang, setLang, dir, isRtl } = useAdminLanguage();

  const renderNavSection = (
    title: string,
    items: Array<{ key: string; label: string; icon: ReactNode; comingSoon?: boolean; custom?: ReactNode }>,
    closeMobile?: () => void
  ) => (
    <div className="space-y-1">
      <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      {items.map((it) => {
        if (it.custom) return <div key={it.key}>{it.custom}</div>;
        const isActive = activeSection === it.key;
        const isLocked = !!it.comingSoon;
        return (
          <NavButton
            key={it.key}
            active={isActive}
            onClick={() => {
              if (isLocked) {
                setUpgradeModalKey(it.key);
                closeMobile?.();
              } else {
                onSectionChange(it.key);
                closeMobile?.();
              }
            }}
            icon={it.icon}
            label={it.label}
            disabled={false}
            tooltip={isLocked ? t('layout.upgradeToUnlock') : undefined}
            strongActive
            lockIcon={isLocked ? <Crown size={16} className="shrink-0 text-amber-500" /> : undefined}
          />
        );
      })}
    </div>
  );

  const manageItems = [
    { key: 'general', label: t('layout.generalInfo'), icon: <Info size={20} /> },
  ];
  const operationsItems = OPERATIONS_ORDER.map((key) => extraNavItems.find((i) => i.key === key)).filter(Boolean) as NavItem[];
  const accountItems = extraNavItems.filter((i) => i.key === 'settings');

  const desktopNav = (
    <nav className="flex-1 p-3 space-y-0 overflow-y-auto min-h-0">
      <div className="mb-4">
        {renderNavSection(t('layout.sectionManage'), manageItems)}
      </div>
      {sidebarMenus && (
        <div className="mb-4">
          {sidebarMenus({ onCloseMenu: () => {} })}
        </div>
      )}
      {operationsItems.length > 0 && (
        <div className="mb-4">
          {renderNavSection(t('layout.sectionOperations'), operationsItems)}
        </div>
      )}
      {accountItems.length > 0 && (
        <div className="mb-4">
          {renderNavSection(t('layout.sectionAccount'), accountItems)}
        </div>
      )}
    </nav>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50" dir={dir} lang={lang === 'ar' ? 'ar' : 'en'}>
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 bg-white shadow-sm overflow-hidden border-gray-200
          ${isRtl ? 'lg:right-0 lg:left-auto border-l' : 'lg:left-0 border-r'}`}
      >
        <div className="p-6 border-b border-gray-200 shrink-0">
          <div className="flex flex-col gap-2">
            <Logo height={22} className="text-[#101010] shrink-0" />
            <h1 className="text-xl font-bold text-gray-800 truncate">{tenantName} {t('layout.admin')}</h1>
          </div>
        </div>

        {desktopNav}

        {/* Bottom: Language toggle + divider + Logout */}
        <div className="shrink-0 border-t border-gray-200 p-3 space-y-0">
          <div className="flex items-center justify-center gap-1 py-1">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${lang === 'en' ? 'bg-[#101010] text-[#cfff5e]' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              {t('layout.langEn')}
            </button>
            <span className="text-gray-400 text-sm">|</span>
            <button
              type="button"
              onClick={() => setLang('ar')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${lang === 'ar' ? 'bg-[#101010] text-[#cfff5e]' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              {t('layout.langAr')}
            </button>
          </div>
          <div className="border-t border-gray-200 my-2" />
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut size={18} />
            <span>{t('layout.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className={`lg:hidden fixed top-0 z-50 bg-white border-b border-gray-200 shadow-sm ${isRtl ? 'right-0 left-0' : 'left-0 right-0'}`}>
        <div className={`flex justify-between items-center h-16 px-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="flex flex-col gap-1 min-w-0 text-start">
            <Logo height={20} className="text-[#101010] shrink-0" />
            <h1 className="text-lg font-bold text-gray-800 truncate">{tenantName} {t('layout.admin')}</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white max-h-[70vh] overflow-y-auto">
            <nav className="p-4 space-y-2">
              <button
                onClick={() => { onSectionChange('general'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-start border ${activeSection === 'general' ? 'bg-[#f0f0f0] text-gray-900 border-gray-900 font-semibold' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
              >
                <Info size={20} />
                <span>{t('layout.generalInfo')}</span>
              </button>
              {sidebarMenus?.({ onCloseMenu: () => setIsMobileMenuOpen(false) })}
              {extraNavItems.map((item) => {
                const isLocked = !!item.comingSoon;
                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (isLocked) {
                            setUpgradeModalKey(item.key);
                            setIsMobileMenuOpen(false);
                          } else {
                            onSectionChange(item.key);
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-start border ${activeSection === item.key ? 'bg-[#f0f0f0] text-gray-900 border-gray-900 font-semibold' : isLocked ? 'border-transparent text-gray-500' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
                      >
                        {item.icon}
                        <span className="flex-1 min-w-0 truncate text-start">{item.label}</span>
                        {isLocked && <Crown size={16} className="shrink-0 text-amber-500" />}
                      </button>
                    </TooltipTrigger>
                    {isLocked && <TooltipContent>{t('layout.upgradeToUnlock')}</TooltipContent>}
                  </Tooltip>
                );
              })}
              <div className="border-t border-gray-200 my-2" />
              <div className="flex items-center justify-center gap-1 py-2">
                <button type="button" onClick={() => setLang('en')} className={`px-3 py-1.5 rounded text-sm font-medium ${lang === 'en' ? 'bg-[#101010] text-[#cfff5e]' : 'text-gray-600'}`}>
                  {t('layout.langEn')}
                </button>
                <span className="text-gray-400">|</span>
                <button type="button" onClick={() => setLang('ar')} className={`px-3 py-1.5 rounded text-sm font-medium ${lang === 'ar' ? 'bg-[#101010] text-[#cfff5e]' : 'text-gray-600'}`}>
                  {t('layout.langAr')}
                </button>
              </div>
              <button
                onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut size={18} />
                <span>{t('layout.logout')}</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Upgrade modal (empty for now) */}
      <Dialog open={!!upgradeModalKey} onOpenChange={(open) => !open && setUpgradeModalKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{upgradeModalKey ? t('layout.upgradeToUnlock') : ''}</DialogTitle>
          </DialogHeader>
          <div className="min-h-[120px]" />
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col lg:pt-0 pt-16 overflow-hidden min-w-0 ${isRtl ? 'lg:pr-64 lg:pl-0' : 'lg:pl-64'}`}>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {breadcrumb && (
              <p className="text-sm text-gray-500 mb-4 font-medium" aria-label="Breadcrumb">
                {breadcrumb}
              </p>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
