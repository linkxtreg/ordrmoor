import { createContext, useContext, useEffect, useLayoutEffect } from 'react';
import { setApiTenant } from '../services/api';

/** Slug used in URL for the original/legacy single-tenant data */
export const DEFAULT_TENANT_SLUG = 'default';

export type TenantContextValue = {
  tenantSlug: string;
  /** Display name of the tenant */
  tenantName: string;
  /** Base path for this tenant, e.g. /t/default */
  basePath: string;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return ctx;
}

export function useTenantOrNull(): TenantContextValue | null {
  return useContext(TenantContext);
}

export function TenantProvider({
  tenantSlug,
  tenantName = tenantSlug,
  children,
}: {
  tenantSlug: string;
  tenantName?: string;
  children: React.ReactNode;
}) {
  const basePath = `/t/${tenantSlug}`;
  const value: TenantContextValue = { tenantSlug, tenantName, basePath };

  // Set tenant in layout effect so it's set before any child useEffect runs (e.g. AdminPage data load)
  useLayoutEffect(() => {
    setApiTenant(tenantSlug);
    return () => setApiTenant(null);
  }, [tenantSlug]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export { TenantContext };
