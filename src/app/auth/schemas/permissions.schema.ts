// [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01
export interface PermissionLeaf {
  value: boolean;
  label: string;
  field_permissions: string;
  position: number;
  description?: string;
}

export type PermissionTree = Record<string, Record<string, Record<string, PermissionLeaf>>>;
export type PermissionStrings = Record<string, string>;
export type PermissionSpec = number | string;

export interface PermissionTreeEntry {
  app: string;
  resource: string;
  action: string;
  path: string;
  leaf: PermissionLeaf;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function unwrapAttributes(response: unknown): Record<string, unknown> {
  if (!isRecord(response)) return {};
  const data = isRecord(response['data']) ? response['data'] : null;
  return data && isRecord(data['attributes'])
    ? data['attributes']
    : (isRecord(response['attributes']) ? response['attributes'] : response);
}

function parseLeaf(value: unknown, path: string): PermissionLeaf {
  if (!isRecord(value)
    || typeof value['value'] !== 'boolean'
    || typeof value['label'] !== 'string'
    || typeof value['field_permissions'] !== 'string'
    || !Number.isInteger(value['position'])
    || Number(value['position']) < 0
    || (value['description'] != null && typeof value['description'] !== 'string')) {
    throw new TypeError(`Permiso inválido recibido en '${path}'.`);
  }
  return {
    value: value['value'],
    label: value['label'],
    field_permissions: value['field_permissions'],
    position: Number(value['position']),
    ...(typeof value['description'] === 'string' ? { description: value['description'] } : {}),
  };
}

/** Acepta exclusivamente las hojas publicadas por el servidor desde el mixin. */
export function parsePermissionTreeResponse(response: unknown): PermissionTree {
  const attributes = unwrapAttributes(response);
  const tree: PermissionTree = {};
  for (const [app, resourcesValue] of Object.entries(attributes)) {
    if (app === 'user' || app === 'strings') continue;
    if (!app || !isRecord(resourcesValue)) throw new TypeError(`Aplicación inválida: '${app}'.`);
    const resources: PermissionTree[string] = {};
    for (const [resource, actionsValue] of Object.entries(resourcesValue)) {
      if (!resource || !isRecord(actionsValue)) {
        throw new TypeError(`Recurso inválido: '${app}.${resource}'.`);
      }
      const actions: Record<string, PermissionLeaf> = {};
      for (const [action, leafValue] of Object.entries(actionsValue)) {
        if (!action) throw new TypeError(`Acción vacía en '${app}.${resource}'.`);
        actions[action] = parseLeaf(leafValue, `${app}.${resource}.${action}`);
      }
      resources[resource] = actions;
    }
    tree[app] = resources;
  }
  return tree;
}

export function parsePermissionStringsResponse(response: unknown): PermissionStrings {
  const attributes = unwrapAttributes(response);
  const source = isRecord(attributes['strings']) ? attributes['strings'] : attributes;
  const strings: PermissionStrings = {};
  for (const [field, value] of Object.entries(source)) {
    if (field === 'user') continue;
    if (typeof value !== 'string' || !/^[01]*$/.test(value)) {
      throw new TypeError(`Cadena de permisos inválida: '${field}'.`);
    }
    strings[field] = value;
  }
  return strings;
}

export function clonePermissionTree(tree: PermissionTree): PermissionTree {
  return structuredClone(tree ?? {});
}

export function permissionTreeEntries(tree: PermissionTree): PermissionTreeEntry[] {
  const entries: PermissionTreeEntry[] = [];
  for (const [app, resources] of Object.entries(tree ?? {})) {
    for (const [resource, actions] of Object.entries(resources ?? {})) {
      for (const [action, leaf] of Object.entries(actions ?? {})) {
        entries.push({ app, resource, action, path: `${app}.${resource}.${action}`, leaf });
      }
    }
  }
  return entries;
}

/** Proyecta cambios solo sobre el schema declarado durante la carga. */
export function projectPermissionTree(declaredTree: PermissionTree, candidateTree: PermissionTree): PermissionTree {
  const projected = clonePermissionTree(declaredTree);
  for (const entry of permissionTreeEntries(projected)) {
    const candidate = candidateTree?.[entry.app]?.[entry.resource]?.[entry.action];
    if (candidate && typeof candidate.value === 'boolean') entry.leaf.value = candidate.value;
  }
  return projected;
}

export function hasDeclaredPermissionPath(tree: PermissionTree, path: string): boolean {
  const [app, resource, ...actionParts] = String(path ?? '').split('.');
  if (!app || !resource || actionParts.length === 0) return false;
  return !!tree?.[app]?.[resource]?.[actionParts.join('.')];
}
// ]]]FI
