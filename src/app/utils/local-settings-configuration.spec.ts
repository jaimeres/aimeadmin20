// [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
import {
  DEFAULT_LOCAL_SETTINGS_CONFIGURATION,
  normalizeLocalSettingsConfiguration,
  resolveLocalSettingsConfiguration,
} from './local-settings-configuration';

describe('local settings configuration', () => {
  it('resolves the new contract for each client platform', () => {
    const configuration = {
      mobile: { active: true, dialog: false, layout: false, behavior: false, filters: true },
      web: { active: false, dialog: true, layout: true, behavior: true, filters: true },
      desktop: { active: true, dialog: true, layout: false, behavior: true, filters: false },
    };

    expect(resolveLocalSettingsConfiguration(configuration, 'mobile')).toEqual(configuration.mobile);
    expect(resolveLocalSettingsConfiguration(configuration, 'web')).toEqual(configuration.web);
    expect(resolveLocalSettingsConfiguration(configuration, 'desktop')).toEqual(configuration.desktop);
  });

  it('uses the server defaults when the node is absent', () => {
    expect(normalizeLocalSettingsConfiguration(undefined))
      .toEqual(DEFAULT_LOCAL_SETTINGS_CONFIGURATION);
  });

  it('keeps compatibility with the previous active-only contract', () => {
    const legacy = { configuration: true, configuration_mobile: false };

    expect(resolveLocalSettingsConfiguration(legacy, 'mobile').active).toBeFalse();
    expect(resolveLocalSettingsConfiguration(legacy, 'web').active).toBeTrue();
    expect(resolveLocalSettingsConfiguration(legacy, 'desktop').active).toBeTrue();
  });
});
// ]]]FI
