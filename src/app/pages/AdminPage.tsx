import { useState, useEffect, useCallback, useMemo } from 'react';
import { Coins, MapPin, Tag } from 'lucide-react';
import { AdminLayout } from '@/app/components/AdminLayout';
import { MenusSidebar } from '@/app/components/MenusSidebar';
import { MenuManagementContent } from '@/app/components/MenuManagementContent';
import { GeneralInfoManagement } from '@/app/components/GeneralInfoManagement';
import { AddressesManagement } from '@/app/components/AddressesManagement';
import { OffersManagement } from '@/app/components/OffersManagement';
import { Menu, GeneralInfo, BranchAddress } from '@/app/types/menu';
import { menusApi, generalInfoApi, addressesApi } from '@/app/services/api';
import { toast, Toaster } from 'sonner';
import { Logo } from '../components/Logo';
import { useTenant } from '@/app/context/TenantContext';
import { useAdminLanguage } from '@/app/context/AdminLanguageContext';
import { useFeatureFlags } from '@/app/context/FeatureFlagsContext';
import { LoadingIcon } from '@/app/components/LoadingIcon';

interface AdminPageProps {
  onLogout: () => void;
}

export default function AdminPage({ onLogout }: AdminPageProps) {
  const { tenantName, tenantSlug } = useTenant();
  const { t } = useAdminLanguage();
  const { isEnabled } = useFeatureFlags();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [addresses, setAddresses] = useState<BranchAddress[]>([]);
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null);
  const [activeSection, setActiveSection] = useState('general');
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantSlug) return;
    // Reset state so we don't show stale data from a previous session
    setMenus([]);
    setAddresses([]);
    setGeneralInfo(null);
    setSelectedMenuId(null);
    let cancelled = false;
    const initialize = async () => {
      try {
        setIsLoading(true);
        const [menusData, generalInfoData] = await Promise.all([
          menusApi.getAll(),
          generalInfoApi.get(),
        ]);
        if (cancelled) return;
        const uniqueMenus = Array.from(new Map(menusData.map((m) => [m.id, m])).values());
        const sortedMenus = [...uniqueMenus].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setMenus(sortedMenus);
        setGeneralInfo(generalInfoData);
      } catch (error) {
        if (!cancelled) {
          console.error('Error initializing application:', error);
          toast.error(t('toasts.failedToLoad'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initialize();
    return () => { cancelled = true; };
  }, [tenantSlug]);

  const loadAllData = useCallback(async () => {
    try {
      const [menusData, generalInfoData] = await Promise.all([
        menusApi.getAll(),
        generalInfoApi.get(),
      ]);

      const uniqueMenus = Array.from(new Map(menusData.map((m) => [m.id, m])).values());
      const sortedMenus = [...uniqueMenus].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      setMenus(sortedMenus);
      setGeneralInfo(generalInfoData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('toasts.failedToLoad'));
    }
  }, [t]);

  const handleUpdateGeneralInfo = useCallback(async (updatedInfo: GeneralInfo) => {
    try {
      const updated = await generalInfoApi.update(updatedInfo);
      setGeneralInfo(updated);
      toast.success(t('toasts.generalInfoUpdated'));
    } catch (error) {
      console.error('Error updating general info:', error);
      toast.error(t('toasts.failedToUpdateGeneralInfo'));
      throw error;
    }
  }, [t]);

  const loadAddresses = useCallback(async () => {
    const data = await addressesApi.getAll();
    setAddresses([...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }, []);

  const selectedMenu = useMemo(
    () => menus.find((m) => m.id === selectedMenuId),
    [menus, selectedMenuId]
  );
  const isAddressesEnabled = isEnabled('addresses');
  const isOffersEnabled = isEnabled('offers');
  const isPointsEnabled = isEnabled('points');

  const extraNavItems = useMemo(
    () => [
      ...(isOffersEnabled
        ? [{ key: 'offers', label: t('layout.offers'), icon: <Tag size={20} /> }]
        : []),
      ...(isPointsEnabled
        ? [{ key: 'points', label: t('layout.points'), icon: <Coins size={20} /> }]
        : []),
      ...(isAddressesEnabled
        ? [{ key: 'addresses', label: t('layout.addresses'), icon: <MapPin size={20} /> }]
        : []),
    ],
    [isAddressesEnabled, isOffersEnabled, isPointsEnabled, t]
  );

  useEffect(() => {
    if (activeSection === 'addresses' && !isAddressesEnabled) {
      setActiveSection('general');
    }
    if (activeSection === 'offers' && !isOffersEnabled) {
      setActiveSection('general');
    }
    if (activeSection === 'points' && !isPointsEnabled) {
      setActiveSection('general');
    }
  }, [activeSection, isAddressesEnabled, isOffersEnabled, isPointsEnabled]);

  useEffect(() => {
    if (!isAddressesEnabled) return;
    if (activeSection !== 'addresses') return;
    loadAddresses().catch((error) => {
      toast.error(error instanceof Error ? error.message : t('toasts.failedToLoad'));
    });
  }, [activeSection, isAddressesEnabled, loadAddresses, t]);

  const handleSelectMenu = useCallback((id: string | null) => {
    setSelectedMenuId(id);
    if (id) setActiveSection('menu');
  }, []);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingIcon className="w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-600">{t('toasts.loadingTenantData', { name: tenantName || '' })}</p>
        </div>
      </div>
    );
  }

  if (!generalInfo) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{t('toasts.failedToLoadAppData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full">
      <AdminLayout 
        activeSection={activeSection} 
        onSectionChange={(section) => {
          setActiveSection(section);
          if (section === 'general') setSelectedMenuId(null);
        }}
        onLogout={onLogout}
        sidebarMenus={({ onCloseMenu }) => (
          <MenusSidebar
            menus={menus}
            selectedMenuId={selectedMenuId}
            onSelectMenu={handleSelectMenu}
            onMenusChange={loadAllData}
            onCloseMenu={onCloseMenu}
          />
        )}
        extraNavItems={extraNavItems}
      >
        {activeSection === 'general' && (
          <GeneralInfoManagement
            generalInfo={generalInfo}
            onUpdate={handleUpdateGeneralInfo}
          />
        )}
        {activeSection === 'menu' && selectedMenu ? (
          <MenuManagementContent
            key={selectedMenu.id}
            menu={selectedMenu}
            onMenusChange={loadAllData}
            onAfterDuplicate={(newId) => {
              setSelectedMenuId(newId);
            }}
            onAfterDelete={(deletedId) => {
              const remaining = menus.filter((m) => m.id !== deletedId);
              setSelectedMenuId(remaining[0]?.id ?? null);
            }}
          />
        ) : activeSection === 'menu' ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
            <Logo height={48} className="mx-auto mb-4 opacity-30 text-gray-400" />
            <p>{t('toasts.selectMenuFromSidebar')}</p>
          </div>
        ) : activeSection === 'addresses' && isAddressesEnabled ? (
          <AddressesManagement
            addresses={addresses}
            onCreate={async (payload) => {
              await addressesApi.create(payload);
              await loadAddresses();
            }}
            onUpdate={async (id, payload) => {
              await addressesApi.update(id, payload);
              await loadAddresses();
            }}
            onDelete={async (id) => {
              await addressesApi.delete(id);
              await loadAddresses();
            }}
            onReorder={async (items) => {
              await addressesApi.reorder(items);
              setAddresses(items);
            }}
          />
        ) : activeSection === 'offers' && isOffersEnabled ? (
          <OffersManagement />
        ) : activeSection === 'points' && isPointsEnabled ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('featurePages.pointsTitle')}</h2>
            <p className="text-gray-600">{t('featurePages.pointsPlaceholder')}</p>
          </div>
        ) : null}
      </AdminLayout>
      <Toaster />
    </div>
  );
}
