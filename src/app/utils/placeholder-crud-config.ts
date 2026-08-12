import {
  LocalSettingsConfiguration,
  normalizeLocalSettingsConfiguration,
} from './local-settings-configuration';

type PlaceholderCrudConfig = {
  cols: Record<string, unknown>;
  config_cols: Record<string, unknown>;
  draw: {
    dialog: {
      width: string;
      height: string;
    };
    general: Record<string, unknown>;
  };
  general: {
    // [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
    configuration: LocalSettingsConfiguration;
    // ]]]FI
    load: {
      load_on_start: boolean;
      load_on_start_mobile: boolean;
      silent: boolean;
    };
    pagination: {
      rows: number;
      rows_mobile: number;
    };
  };
  fields: Record<string, unknown>;
};

function buildPlaceholderCrudConfig(): PlaceholderCrudConfig {
  return {
    cols: {},
    config_cols: {},
    draw: {
      dialog: {
        width: 'width-1200px-Custom',
        height: 'min-height-550px-custom'
      },
      general: {}
    },
    general: {
      // [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
      configuration: normalizeLocalSettingsConfiguration(undefined),
      // ]]]FI
      load: {
        load_on_start: false,
        load_on_start_mobile: false,
        silent: true
      },
      pagination: {
        rows: 20,
        rows_mobile: 10
      }
    },
    fields: {}
  };
}

export function ensurePlaceholderCrudConfigs(config: Record<string, any>, moduleKeys: string[]): void {
  for (const moduleKey of moduleKeys) {
    const defaults = buildPlaceholderCrudConfig();
    const current = config[moduleKey] ?? {};

    config[moduleKey] = {
      ...defaults,
      ...current,
      cols: current.cols ?? defaults.cols,
      config_cols: current.config_cols ?? defaults.config_cols,
      draw: current.draw ?? defaults.draw,
      general: {
        ...defaults.general,
        ...(current.general ?? {}),
        // [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
        configuration: normalizeLocalSettingsConfiguration(current.general?.configuration),
        // ]]]FI
        load: {
          ...defaults.general.load,
          ...(current.general?.load ?? {})
        },
        pagination: {
          ...defaults.general.pagination,
          ...(current.general?.pagination ?? {})
        }
      },
      fields: current.fields ?? defaults.fields
    };
  }
}

export function buildPlaceholderCustomFields(config: Record<string, any>, moduleKeys: string[]): Record<string, any> {
  return moduleKeys.reduce((accumulator, moduleKey) => {
    accumulator[moduleKey] = config[moduleKey]['cols'];
    return accumulator;
  }, {} as Record<string, any>);
}
