import { PermissionTree, parsePermissionTreeResponse } from './permissions.schema';

export interface PermissionCatalogAccess {
  alternatives: string[];
  preferred: string | null;
  mode: 'referencia' | 'completo' | 'implícito legado' | 'local';
  granted: boolean;
  requires_full: boolean;
  warning: string;
}

export interface PermissionCatalogField {
  path: string;
  label: string;
  control_type: string;
  source_resource: string | null;
  source_app: string | null;
  required: boolean;
  local: boolean;
  access: PermissionCatalogAccess;
}

export interface PermissionCatalogForm {
  label: string;
  resource_label: string;
  direct_permission: string;
  configuration_source: 'tenant' | 'usuario';
  fields: PermissionCatalogField[];
}

export interface PermissionCatalogConsumer {
  form: string;
  field: string | null;
  field_label?: string;
  kind: string;
}

export interface PermissionCatalog {
  userId: string;
  permissions: PermissionTree;
  forms: Record<string, PermissionCatalogForm>;
  consumers_by_permission: Record<string, PermissionCatalogConsumer[]>;
  configuration_context: {
    resolved_levels: string[];
    resource_sources: Record<string, string>;
    contextual_subsidiaries: number;
    warning: string;
  };
}

function record(value: unknown, path: string): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Catálogo inválido en '${path}'.`);
  }
  return value as Record<string, any>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new TypeError(`Texto inválido en '${path}'.`);
  return value;
}

// [[[II ESC:037-02 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-02
export function parsePermissionCatalogResponse(response: unknown): PermissionCatalog {
  const root = record(response, 'response');
  const data = record(root['data'], 'data');
  if (data['type'] !== 'permission-catalog') throw new TypeError('Tipo de catálogo inválido.');
  const attributes = record(data['attributes'], 'data.attributes');
  const formsRaw = record(attributes['forms'], 'forms');
  const forms: Record<string, PermissionCatalogForm> = {};

  for (const [formPath, rawForm] of Object.entries(formsRaw)) {
    const form = record(rawForm, `forms.${formPath}`);
    if (!Array.isArray(form['fields'])) throw new TypeError(`Campos inválidos en '${formPath}'.`);
    forms[formPath] = {
      label: text(form['label'], `${formPath}.label`),
      resource_label: text(form['resource_label'], `${formPath}.resource_label`),
      direct_permission: text(form['direct_permission'], `${formPath}.direct_permission`),
      configuration_source: form['configuration_source'] === 'usuario' ? 'usuario' : 'tenant',
      fields: form['fields'].map((rawField: unknown, index: number) => {
        const field = record(rawField, `${formPath}.fields.${index}`);
        const access = record(field['access'], `${formPath}.fields.${index}.access`);
        if (!Array.isArray(access['alternatives']) || access['alternatives'].some((item: unknown) => typeof item !== 'string')) {
          throw new TypeError(`Alternativas inválidas en '${formPath}.${index}'.`);
        }
        return {
          path: text(field['path'], `${formPath}.${index}.path`),
          label: text(field['label'], `${formPath}.${index}.label`),
          control_type: text(field['control_type'], `${formPath}.${index}.control_type`),
          source_resource: typeof field['source_resource'] === 'string' ? field['source_resource'] : null,
          source_app: typeof field['source_app'] === 'string' ? field['source_app'] : null,
          required: field['required'] === true,
          local: field['local'] === true,
          access: {
            alternatives: [...access['alternatives']],
            preferred: typeof access['preferred'] === 'string' ? access['preferred'] : null,
            mode: ['referencia', 'completo', 'implícito legado', 'local'].includes(access['mode'])
              ? access['mode'] : 'implícito legado',
            granted: access['granted'] === true,
            requires_full: access['requires_full'] === true,
            warning: typeof access['warning'] === 'string' ? access['warning'] : '',
          },
        };
      }),
    };
  }

  const consumersRaw = record(attributes['consumers_by_permission'], 'consumers_by_permission');
  const consumers: Record<string, PermissionCatalogConsumer[]> = {};
  for (const [permission, rawItems] of Object.entries(consumersRaw)) {
    if (!Array.isArray(rawItems)) throw new TypeError(`Consumidores inválidos en '${permission}'.`);
    consumers[permission] = rawItems.map((rawItem, index) => {
      const item = record(rawItem, `${permission}.${index}`);
      return {
        form: text(item['form'], `${permission}.${index}.form`),
        field: typeof item['field'] === 'string' ? item['field'] : null,
        field_label: typeof item['field_label'] === 'string' ? item['field_label'] : undefined,
        kind: text(item['kind'], `${permission}.${index}.kind`),
      };
    });
  }

  const context = record(attributes['configuration_context'], 'configuration_context');
  return {
    userId: text(data['id'], 'data.id'),
    permissions: parsePermissionTreeResponse(attributes['permissions']),
    forms,
    consumers_by_permission: consumers,
    configuration_context: {
      resolved_levels: Array.isArray(context['resolved_levels'])
        ? context['resolved_levels'].filter((item: unknown) => typeof item === 'string') : [],
      resource_sources: record(context['resource_sources'], 'configuration_context.resource_sources'),
      contextual_subsidiaries: Number.isInteger(context['contextual_subsidiaries'])
        ? context['contextual_subsidiaries'] : 0,
      warning: typeof context['warning'] === 'string' ? context['warning'] : '',
    },
  };
}
// ]]]FI
