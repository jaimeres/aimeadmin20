import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = Object.create(AuthService.prototype) as AuthService;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // [[[II ESC:005-14 DOC:docs/documents/2026-05-31_005_columnas-form-data-y-tree-select-nombres.md#escenario-14
  it('getCustomField resolves column labels from fields cols before falling back to the key', () => {
    const config = service.getCustomField({
      purchases: {
        'request-detail': {
          cols: {
            0: { field: 'request_data_request_type' },
            1: { field: 'name2', label: 'Nombre directo' },
            2: { field: 'missing_config' },
          },
          fields: {
            request_data_request_type: {
              label: 'Tipo de solicitud form',
              cols: { label: 'Tipo de solicitud', hide: true, sortable: false },
            },
            name2: {
              label: 'Nombre secundario',
            },
          },
        },
      },
    });

    expect(config['request-detail'].cols.request_data_request_type).toBe('Tipo de solicitud');
    expect(config['request-detail'].cols.name2).toBe('Nombre directo');
    expect(config['request-detail'].cols.missing_config).toBe('missing_config');
    expect(config['request-detail'].config_cols.missing_config.sortable).toBeUndefined();
  });

  it('getCustomField registers draw-only dynamic labels without overwriting configured column labels', () => {
    const config = service.getCustomField({
      purchases: {
        'request-detail': {
          cols: {
            0: { field: 'request_data_request_type' },
          },
          fields: {
            request_data_request_type: {
              label: 'Tipo de solicitud form',
              cols: { label: 'Tipo de solicitud' },
            },
            form_fields_data_COMPONENTE: {
              field: 'form_fields_data_COMPONENTE',
              label: 'Componente form',
              cols: { label: 'Componente' },
            },
            form_fields_data_agregar: {
              field: 'form_fields_data_agregar',
              label: 'Agregar',
            },
          },
          draw: {
            general: {
              grid: {
                0: { field: 'request_data_request_type' },
                1: { field: 'form_fields_data_COMPONENTE' },
                2: { field: 'form_fields_data_agregar' },
              },
            },
          },
        },
      },
    });

    expect(config['request-detail'].cols.request_data_request_type).toBe('Tipo de solicitud');
    expect(config['request-detail'].cols.form_fields_data_COMPONENTE).toBe('Componente');
    expect(config['request-detail'].cols.form_fields_data_agregar).toBe('Agregar');
    expect(config['request-detail'].draw.general.grid[1].label).toBe('Componente form');
  });
  // ]]]FI
});
