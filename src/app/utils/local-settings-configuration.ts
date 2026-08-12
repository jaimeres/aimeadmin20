// [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
export type LocalSettingsPlatform = 'mobile' | 'web' | 'desktop';
export type LocalSettingsSection = 'dialog' | 'layout' | 'behavior' | 'filters';

export interface LocalSettingsPlatformConfiguration {
  active: boolean;
  dialog: boolean;
  layout: boolean;
  behavior: boolean;
  filters: boolean;
}

export type LocalSettingsConfiguration = Record<
  LocalSettingsPlatform,
  LocalSettingsPlatformConfiguration
>;

export const DEFAULT_LOCAL_SETTINGS_CONFIGURATION: LocalSettingsConfiguration = {
  mobile: {
    active: true,
    dialog: false,
    layout: false,
    behavior: false,
    filters: true,
  },
  web: {
    active: true,
    dialog: true,
    layout: true,
    behavior: true,
    filters: true,
  },
  desktop: {
    active: true,
    dialog: true,
    layout: true,
    behavior: true,
    filters: true,
  },
};

const isRecord = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function resolveLocalSettingsConfiguration(
  rawConfiguration: unknown,
  platform: LocalSettingsPlatform,
): LocalSettingsPlatformConfiguration {
  const defaults = DEFAULT_LOCAL_SETTINGS_CONFIGURATION[platform];
  if (!isRecord(rawConfiguration)) return { ...defaults };

  const platformConfiguration = isRecord(rawConfiguration[platform])
    ? rawConfiguration[platform]
    : {};
  const legacyActive = platform === 'mobile'
    ? rawConfiguration['configuration_mobile']
    : rawConfiguration['configuration'];

  return {
    active: typeof platformConfiguration['active'] === 'boolean'
      ? platformConfiguration['active']
      : (typeof legacyActive === 'boolean' ? legacyActive : defaults.active),
    dialog: typeof platformConfiguration['dialog'] === 'boolean'
      ? platformConfiguration['dialog']
      : defaults.dialog,
    layout: typeof platformConfiguration['layout'] === 'boolean'
      ? platformConfiguration['layout']
      : defaults.layout,
    behavior: typeof platformConfiguration['behavior'] === 'boolean'
      ? platformConfiguration['behavior']
      : defaults.behavior,
    filters: typeof platformConfiguration['filters'] === 'boolean'
      ? platformConfiguration['filters']
      : defaults.filters,
  };
}

export function normalizeLocalSettingsConfiguration(
  rawConfiguration: unknown,
): LocalSettingsConfiguration {
  return {
    mobile: resolveLocalSettingsConfiguration(rawConfiguration, 'mobile'),
    web: resolveLocalSettingsConfiguration(rawConfiguration, 'web'),
    desktop: resolveLocalSettingsConfiguration(rawConfiguration, 'desktop'),
  };
}
// ]]]FI
