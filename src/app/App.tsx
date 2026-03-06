import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TenantLayout } from './components/TenantLayout';
import { LoadingIcon } from './components/LoadingIcon';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLanguageProvider } from './context/AdminLanguageContext';
import { initAnalytics, isAnalyticsEnabled, trackLandingCtaClick, trackPageView } from './lib/analytics';
import { supabase } from '/utils/supabase/client';

const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const CustomerMenuPage = React.lazy(() => import('./pages/CustomerMenuPage'));
const SuperAdminLoginPage = React.lazy(() => import('./pages/SuperAdminLoginPage'));
const SuperAdminPage = React.lazy(() => import('./pages/SuperAdminPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const DigitalMenuLandingPage = React.lazy(() => import('./pages/DigitalMenuLandingPage'));
const UniversalLoginPage = React.lazy(() => import('./pages/UniversalLoginPage'));
const LoyaltyPage = React.lazy(() => import('./pages/LoyaltyPage'));

function getTrackedRouteMeta(pathname: string): { tenantSlug?: string; menuSlug?: string } | null {
  if (pathname === '/' || pathname === '/signup') {
    return {};
  }

  const menuMatch = pathname.match(/^\/t\/([^/]+)\/menu(?:\/([^/]+))?\/?$/);
  if (!menuMatch) return null;

  return {
    tenantSlug: decodeURIComponent(menuMatch[1] || ''),
    menuSlug: menuMatch[2] ? decodeURIComponent(menuMatch[2]) : undefined,
  };
}

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9faf3]">
      <LoadingIcon className="w-10 h-10" />
    </div>
  );
}

function withSuspense(element: React.ReactElement) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>;
}

function TenantProtectedAdmin() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { isAuthenticated, logout } = useAuth();
  const slug = tenantSlug ?? 'default';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout(slug);
  };

  return (
    <ProtectedRoute isAuthenticated={isAuthenticated(slug)}>
      <AdminLanguageProvider>
        <Suspense fallback={<RouteLoader />}>
          <AdminPage onLogout={handleLogout} />
        </Suspense>
      </AdminLanguageProvider>
    </ProtectedRoute>
  );
}

// Super admin token stored in sessionStorage (cleared on tab close)
const SUPER_ADMIN_KEY = 'ordrmoor_super_admin_token';

function SuperAdminRoute() {
  const [token, setToken] = React.useState<string | null>(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SUPER_ADMIN_KEY) : null
  );

  const handleLogin = (t: string) => {
    sessionStorage.setItem(SUPER_ADMIN_KEY, t);
    setToken(t);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SUPER_ADMIN_KEY);
    setToken(null);
  };

  if (!token) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <SuperAdminLoginPage onLogin={handleLogin} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<RouteLoader />}>
      <SuperAdminPage token={token} onLogout={handleLogout} />
    </Suspense>
  );
}

export default function App() {
  React.useEffect(() => {
    const prefetch = () => {
      // Warm up most likely next routes/chunks after first paint.
      void import('./pages/CustomerMenuPage');
      void import('./pages/AdminPage');
      void import('./pages/UniversalLoginPage');
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(prefetch);
      return () => {
        if ('cancelIdleCallback' in window) {
          (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
        }
      };
    }

    const timeout = window.setTimeout(prefetch, 800);
    return () => window.clearTimeout(timeout);
  }, []);

  const router = React.useMemo(() => createBrowserRouter([
    {
      path: '/t/:tenantSlug',
      element: <TenantLayout />,
      children: [
        { path: 'login', element: <Navigate to="/login" replace /> },
        { path: 'admin', element: <TenantProtectedAdmin /> },
        { index: true, element: <Navigate to="menu" replace /> },
        { path: 'menu', element: withSuspense(<CustomerMenuPage />) },
        { path: 'menu/:slug', element: withSuspense(<CustomerMenuPage />) },
        { path: 'loyalty', element: withSuspense(<LoyaltyPage />) },
      ],
    },
    { path: '/super-admin', element: <SuperAdminRoute /> },
    { path: '/signup', element: withSuspense(<LandingPage />) },
    { path: '/login', element: withSuspense(<UniversalLoginPage />) },
    { path: '/', element: withSuspense(<DigitalMenuLandingPage />) },
    { path: '/admin', element: <Navigate to="/t/default/admin" replace /> },
    { path: '/menu', element: <Navigate to="/t/default/menu" replace /> },
    { path: '/menu/:slug', element: <Navigate to="/t/default/menu/:slug" replace /> },
    { path: '*', element: withSuspense(<NotFoundPage />) },
  ]), []);

  React.useEffect(() => {
    initAnalytics();
    if (!isAnalyticsEnabled()) return;

    const sendPageView = (pathname: string) => {
      const routeMeta = getTrackedRouteMeta(pathname);
      if (!routeMeta) return;

      trackPageView({
        path: pathname,
        title: typeof document !== 'undefined' ? document.title : undefined,
        tenantSlug: routeMeta.tenantSlug,
        menuSlug: routeMeta.menuSlug,
      });
    };

    sendPageView(window.location.pathname);

    const unsubscribe = router.subscribe((state) => {
      sendPageView(state.location.pathname);
    });

    return unsubscribe;
  }, [router]);

  React.useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;
      const message = event.data as {
        type?: string;
        ctaName?: string;
        ctaLocation?: string;
        targetPath?: string;
      };
      if (message.type !== 'landing_cta_click') return;

      trackLandingCtaClick({
        ctaName: message.ctaName ?? 'unknown',
        ctaLocation: message.ctaLocation,
        targetPath: message.targetPath,
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}
