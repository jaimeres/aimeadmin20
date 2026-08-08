import { parsePermissionCatalogResponse } from './permission-catalog.schema';

// [[[II ESC:037-02 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-02
describe('permission catalog schema', () => {
  const response = {
    data: {
      type: 'permission-catalog',
      id: 'user-1',
      attributes: {
        permissions: {
          assets: {
            maintenance: {
              update: { value: true, label: 'Modificar', field_permissions: 'permissions2', position: 49 },
            },
          },
        },
        forms: {
          'assets.maintenance.update': {
            label: 'Modificar mantenimiento', resource_label: 'mantenimientos',
            direct_permission: 'assets.maintenance.update', configuration_source: 'tenant',
            fields: [{
              path: 'asset', label: 'Activo', control_type: 'dropdown', source_resource: 'asset',
              source_app: 'assets', required: true, local: false,
              access: { alternatives: ['assets.asset.ref_select'], preferred: 'assets.asset.ref_select',
                mode: 'referencia', granted: false, requires_full: false, warning: '' },
            }],
          },
        },
        consumers_by_permission: {
          'assets.asset.ref_select': [{ form: 'assets.maintenance.update', field: 'asset', field_label: 'Activo', kind: 'mínimo de interfaz' }],
        },
        configuration_context: { resolved_levels: ['tenant'], resource_sources: {}, contextual_subsidiaries: 0, warning: '' },
      },
    },
  };

  it('accepts the catalog contract and preserves Spanish server labels', () => {
    const catalog = parsePermissionCatalogResponse(response);
    expect(catalog.forms['assets.maintenance.update'].fields[0].label).toBe('Activo');
    expect(catalog.forms['assets.maintenance.update'].fields[0].access.preferred).toBe('assets.asset.ref_select');
  });

  it('rejects malformed field dependencies', () => {
    const malformed = structuredClone(response) as any;
    malformed.data.attributes.forms['assets.maintenance.update'].fields[0].access.alternatives = 'assets.asset.list';
    expect(() => parsePermissionCatalogResponse(malformed)).toThrowError(TypeError);
  });
});
// ]]]FI
