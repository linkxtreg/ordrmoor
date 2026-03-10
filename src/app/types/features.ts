export const FEATURE_DEFINITIONS = [
  {
    key: 'addresses',
    label: 'Addresses',
    description: 'Show the Addresses page in tenant admin.',
    defaultValue: false,
  },
  {
    key: 'offers',
    label: 'Offers',
    description: 'Show the Offers page in tenant admin.',
    defaultValue: false,
  },
  {
    key: 'loyalty',
    label: 'Loyalty',
    description: 'Show the Loyalty page in tenant admin.',
    defaultValue: false,
  },
  {
    key: 'multiMenus',
    label: 'Multiple menus',
    description: 'Allow tenant to create and manage multiple menus instead of a single menu.',
    defaultValue: false,
  },
] as const;

export type FeatureFlagDefinition = (typeof FEATURE_DEFINITIONS)[number];
export type FeatureFlagKey = FeatureFlagDefinition['key'];
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export function getDefaultFeatureFlags(): FeatureFlags {
  return FEATURE_DEFINITIONS.reduce((acc, def) => {
    acc[def.key] = def.defaultValue;
    return acc;
  }, {} as FeatureFlags);
}

export function resolveFeatureFlags(input?: Partial<Record<string, unknown>> | null): FeatureFlags {
  const defaults = getDefaultFeatureFlags();
  if (!input || typeof input !== 'object') return defaults;

  return FEATURE_DEFINITIONS.reduce((acc, def) => {
    const value = input[def.key];
    acc[def.key] = typeof value === 'boolean' ? value : def.defaultValue;
    return acc;
  }, { ...defaults });
}
