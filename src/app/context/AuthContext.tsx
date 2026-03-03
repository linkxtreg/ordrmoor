import { createContext, useContext, useState, useCallback } from 'react';

type AuthState = Record<string, boolean>;

type AuthContextValue = {
  isAuthenticated: (tenantSlug: string) => boolean;
  login: (tenantSlug: string) => void;
  logout: (tenantSlug: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({});

  const isAuthenticated = useCallback(
    (tenantSlug: string) => state[tenantSlug] ?? false,
    [state]
  );

  const login = useCallback((tenantSlug: string) => {
    setState((prev) => ({ ...prev, [tenantSlug]: true }));
  }, []);

  const logout = useCallback((tenantSlug: string) => {
    setState((prev) => ({ ...prev, [tenantSlug]: false }));
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
