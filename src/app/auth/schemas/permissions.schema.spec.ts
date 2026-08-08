import {
  hasDeclaredPermissionPath,
  parsePermissionTreeResponse,
  projectPermissionTree,
} from './permissions.schema';

// [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01
describe('permissions schema', () => {
  const response = {
    data: {
      attributes: {
        user: 'user-1',
        assets: {
          maintenance: {
            update: { value: true, label: 'Modificar mantenimiento', field_permissions: 'permissions2', position: 49 },
            'update.start_date': { value: false, label: 'Modificar fecha inicio', field_permissions: 'assets_per', position: 17 },
          },
        },
      },
    },
  };

  it('accepts the exact granular path published by the server', () => {
    const tree = parsePermissionTreeResponse(response);
    expect(hasDeclaredPermissionPath(tree, 'assets.maintenance.update.start_date')).toBeTrue();
    expect(hasDeclaredPermissionPath(tree, 'assets.maintenance.update.other_date')).toBeFalse();
  });

  it('rejects an undeclared nested object as a new route', () => {
    expect(() => parsePermissionTreeResponse({
      assets: {
        maintenance: {
          update: {
            start_date: { value: true },
          },
        },
      },
    })).toThrowError(TypeError);
  });

  it('projects values only over paths declared by the loaded schema', () => {
    const declared = parsePermissionTreeResponse(response);
    const candidate: any = structuredClone(declared);
    candidate.assets.maintenance['update.start_date'].value = true;
    candidate.assets.maintenance['update.not_declared'] = {
      value: true,
      label: 'No declarado',
      field_permissions: 'assets_per',
      position: 99,
    };

    const projected = projectPermissionTree(declared, candidate);
    expect(projected['assets']['maintenance']['update.start_date'].value).toBeTrue();
    expect(projected['assets']['maintenance']['update.not_declared']).toBeUndefined();
  });
});
// ]]]FI
