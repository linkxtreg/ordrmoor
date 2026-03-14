import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router';
import { TenantProvider } from '../context/TenantContext';
import { FeatureFlagsProvider } from '../context/FeatureFlagsContext';
import { superAdminApi, customerMenuApi } from '../services/api';
import NotFoundPage from '../pages/NotFoundPage';
import { LoadingIcon } from './LoadingIcon';

const DEFAULT_TITLE = 'OrdrMoor Menu';
const TENANT_CACHE_TTL_MS = 10 * 60 * 1000;

export function TenantLayout() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [exists, setExists] = useState<boolean | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantSlug) {
      setExists(false);
      setTenantName(null);
      return;
    }
    setExists(null);

    // Warm start from cache to reduce blocking loader on repeat visits.
    try {
      const raw = localStorage.getItem(`tenant-check:${tenantSlug}`);
      if (raw) {
        const cached = JSON.parse(raw) as { exists: boolean; name?: string; cachedAt: number };
        // Only trust cached positive checks to avoid false 404 flashes from transient failures.
        if (cached.exists && Date.now() - cached.cachedAt < TENANT_CACHE_TTL_MS) {
          setExists(cached.exists);
          setTenantName(cached.name ?? null);
        }
      }
    } catch {
      // Ignore cache parsing errors.
    }

    let cancelled = false;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const verifyTenant = async () => {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const [existsCheck, info] = await Promise.all([
            superAdminApi.tenantExists(tenantSlug),
            superAdminApi.getTenantInfo(tenantSlug),
          ]);
          if (cancelled) return;

          if (existsCheck || info.exists) {
            setExists(true);
            if (info.name) setTenantName(info.name);
            try {
              localStorage.setItem(
                `tenant-check:${tenantSlug}`,
                JSON.stringify({
                  exists: true,
                  name: info.name,
                  cachedAt: Date.now(),
                })
              );
            } catch {
              // Ignore cache write failures.
            }
            return;
          }
        } catch {
          // Ignore transient network errors and retry before deciding 404.
        }

        if (attempt < maxAttempts - 1) {
          await sleep(250 * (attempt + 1));
        }
      }
      if (!cancelled) {
        setExists(false);
      }
    };
    verifyTenant();
    return () => { cancelled = true; };
  }, [tenantSlug]);

  useEffect(() => {
    const onTenantNameUpdated = (e: CustomEvent<{ slug: string; name: string }>) => {
      if (e.detail?.slug === tenantSlug && e.detail?.name) {
        setTenantName(e.detail.name);
        document.title = `${e.detail.name} | ${DEFAULT_TITLE}`;
        try {
          localStorage.setItem(
            `tenant-check:${tenantSlug}`,
            JSON.stringify({ exists: true, name: e.detail.name, cachedAt: Date.now() })
          );
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener('tenant-name-updated', onTenantNameUpdated as EventListener);
    return () => window.removeEventListener('tenant-name-updated', onTenantNameUpdated as EventListener);
  }, [tenantSlug]);

  useEffect(() => {
    if (!tenantSlug || !exists) {
      document.title = DEFAULT_TITLE;
      setTenantName(null);
      return;
    }
    let cancelled = false;
    superAdminApi.getTenantInfo(tenantSlug).then((info) => {
      if (!cancelled && info.exists && info.name) {
        setTenantName(info.name);
        document.title = `${info.name} | ${DEFAULT_TITLE}`;
        try {
          localStorage.setItem(
            `tenant-check:${tenantSlug}`,
            JSON.stringify({
              exists: true,
              name: info.name,
              cachedAt: Date.now(),
            })
          );
        } catch {
          // Ignore cache write failures.
        }
      } else {
        setTenantName(null);
        document.title = DEFAULT_TITLE;
      }
    });
    return () => {
      cancelled = true;
      document.title = DEFAULT_TITLE;
    };
  }, [tenantSlug, exists]);

  if (!tenantSlug) {
    return <NotFoundPage />;
  }

  if (exists === null) {
    return (
      <div className="min-h-screen bg-[#f9faf3] flex items-center justify-center">
        <LoadingIcon className="w-12 h-12" />
      </div>
    );
  }

  if (exists === false) {
    return <NotFoundPage />;
  }

  return (
    <TenantProvider tenantSlug={tenantSlug} tenantName={tenantName ?? tenantSlug}>
      <FeatureFlagsProvider>
        <MenuBundlePrefetcher tenantSlug={tenantSlug} />
        <Outlet />
      </FeatureFlagsProvider>
    </TenantProvider>
  );
}

/** Prefetch menu bundle when on menu route so CustomerMenu gets cache hit or in-flight reuse */
function MenuBundlePrefetcher({ tenantSlug }: { tenantSlug: string }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.includes('/menu')) return;
    const parts = pathname.split('/');
    const menuIdx = parts.indexOf('menu');
    const slug = menuIdx >= 0 && parts[menuIdx + 1] && parts[menuIdx + 1] !== '' ? parts[menuIdx + 1] : undefined;
    void customerMenuApi.getPublicBundle(tenantSlug, slug);
  }, [tenantSlug, pathname]);
  return null;
}
