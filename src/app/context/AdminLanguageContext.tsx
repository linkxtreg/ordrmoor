import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { getAdminT, type AdminLang } from '../translations/admin';

const STORAGE_KEY = 'ordrmoor_admin_lang';

function getStoredLang(): AdminLang {
  if (typeof localStorage === 'undefined') return 'en';
  const s = localStorage.getItem(STORAGE_KEY);
  return s === 'ar' ? 'ar' : 'en';
}

function setStoredLang(lang: AdminLang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

type TFunc = (key: string, params?: Record<string, string>) => string;

interface AdminLanguageContextValue {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
  t: TFunc;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
}

const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(null);

export function AdminLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(getStoredLang);

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next);
    setStoredLang(next);
  }, []);

  const value = useMemo<AdminLanguageContextValue>(() => ({
    lang,
    setLang,
    t: getAdminT(lang),
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    isRtl: lang === 'ar',
  }), [lang, setLang]);

  return (
    <AdminLanguageContext.Provider value={value}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage(): AdminLanguageContextValue {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) throw new Error('useAdminLanguage must be used within AdminLanguageProvider');
  return ctx;
}
