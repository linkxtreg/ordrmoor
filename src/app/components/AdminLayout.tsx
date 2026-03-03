import { ReactNode, useState } from 'react';
import { Info, Menu, X, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { useTenant } from '../context/TenantContext';
import { useAdminLanguage } from '../context/AdminLanguageContext';

interface AdminLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  children: ReactNode;
  sidebarMenus?: (props: { onCloseMenu: () => void }) => ReactNode;
  extraNavItems?: Array<{ key: string; label: string; icon: ReactNode }>;
}

export function AdminLayout({ activeSection, onSectionChange, onLogout, children, sidebarMenus, extraNavItems = [] }: AdminLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { tenantName } = useTenant();
  const { t, lang, setLang, dir, isRtl } = useAdminLanguage();

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50" dir={dir} lang={lang === 'ar' ? 'ar' : 'en'}>
      {/* Sidebar - Desktop: fixed; position flips for RTL */}
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

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
          <button
            onClick={() => onSectionChange('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-start ${
              activeSection === 'general'
                ? 'bg-[#101010] text-[#cfff5e]'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Info size={20} />
            <span>{t('layout.generalInfo')}</span>
          </button>
          {sidebarMenus?.({ onCloseMenu: () => {} })}
          {extraNavItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-start ${
                activeSection === item.key
                  ? 'bg-[#101010] text-[#cfff5e]'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 shrink-0 space-y-3">
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700"
            title={lang === 'ar' ? 'English' : 'العربية'}
          >
            {t('layout.langSwitch')}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] transition-colors font-medium"
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
                onClick={() => {
                  onSectionChange('general');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-start ${
                  activeSection === 'general'
                    ? 'bg-[#101010] text-[#cfff5e]'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Info size={20} />
                <span>{t('layout.generalInfo')}</span>
              </button>
              {sidebarMenus?.({ onCloseMenu: () => setIsMobileMenuOpen(false) })}
              {extraNavItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    onSectionChange(item.key);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-start ${
                    activeSection === item.key
                      ? 'bg-[#101010] text-[#cfff5e]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                {t('layout.langSwitch')}
              </button>
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#101010] text-[#cfff5e] rounded-lg hover:bg-[#cfff5e] hover:text-[#101010] transition-colors font-medium"
              >
                <LogOut size={18} />
                <span>{t('layout.logout')}</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Main Content - margin flips for RTL */}
      <div
        className={`flex-1 flex flex-col lg:pt-0 pt-16 overflow-hidden min-w-0 ${isRtl ? 'lg:pr-64 lg:pl-0' : 'lg:pl-64'}`}
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}