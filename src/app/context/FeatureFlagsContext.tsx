import React from 'react';
import { tenantFeaturesApi } from '../services/api';
import { getDefaultFeatureFlags, resolveFeatureFlags, type FeatureFlagKey, type FeatureFlags } from '../types/features';

type FeatureFlagsContextValue = {
  featureFlags: FeatureFlags;
  isLoading: boolean;
  isEnabled: (featureKey: FeatureFlagKey | string) => boolean;
  refresh: () => Promise<void>;
};

const FeatureFlagsContext = React.createContext<FeatureFlagsContextValue | null>(null);

export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = React.useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return ctx;
}

export function useFeatureFlagsOrNull(): FeatureFlagsContextValue | null {
  return React.useContext(FeatureFlagsContext);
}

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [featureFlags, setFeatureFlags] = React.useState<FeatureFlags>(getDefaultFeatureFlags());
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await tenantFeaturesApi.getCurrent();
      setFeatureFlags(resolveFeatureFlags(data.featureFlags));
    } catch (error) {
      console.warn('Could not load tenant feature flags. Falling back to defaults.', error);
      setFeatureFlags(getDefaultFeatureFlags());
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const isEnabled = React.useCallback(
    (featureKey: FeatureFlagKey | string) => featureFlags[featureKey as FeatureFlagKey] === true,
    [featureFlags]
  );

  const value = React.useMemo<FeatureFlagsContextValue>(
    () => ({
      featureFlags,
      isLoading,
      isEnabled,
      refresh,
    }),
    [featureFlags, isLoading, isEnabled, refresh]
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}
