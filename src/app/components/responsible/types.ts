/**
 * Tipos y validadores para los editores de campo:
 *  - <app-responsible>        → edita drawForm[*].conditions (editor_type: 'rule_tree')
 *  - <app-responsible-action> → edita drawForm[*].action     (editor_type: 'rule_action')
 *
 * El catálogo NUNCA se inventa en cliente. Se obtiene íntegramente del backend
 * a través del field-config (drawForm[*]).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Modelos del field-config (provistos por el backend)
// ─────────────────────────────────────────────────────────────────────────────

export type OpValueType = 'scalar' | 'array' | 'between' | 'path' | null;

export interface OpMeta {
  value_type: OpValueType;
  ctx?: boolean;
  desc?: string;
}

export interface PathMeta {
  ops: string[];
  /** Etiqueta legible para mostrar en el dropdown (en lugar del path crudo). */
  label?: string;
  /** Descripción auxiliar opcional. */
  desc?: string;
}

export interface CatalogPathSet {
  paths: Record<string, PathMeta>;
}

/** Field-config para `conditions` (editor_type: 'rule_tree'). */
export interface ConditionsFieldConfig {
  catalogs: Record<string, CatalogPathSet>;
  ops_meta: Record<string, OpMeta>;
  allowed_ops: string[];
  depends_on?: string;
  catalog_version?: string;
  editor_type?: string;
}

/** Field-config para `action` (editor_type: 'rule_action'). */
export interface ActionFieldConfig {
  fixed_targets: Record<string, { data_type: string; desc?: string }>;
  auto_users: {
    paths: Record<string, PathMeta>;
    ops_meta: Record<string, OpMeta>;
    applies_to?: string;
    where_logic?: string;
  };
  allowed_ops: string[];
  editor_type?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modelos de datos (lo que se guarda en el FormControl / se envía al backend)
// ─────────────────────────────────────────────────────────────────────────────

export interface SimpleExpr {
  path: string;
  op: string;
  /** Ausente cuando ops_meta[op].value_type === null (p.ej. exists). */
  value?: any;
}

export type ConditionGroupAll = { all: ConditionNode[] };
export type ConditionGroupAny = { any: ConditionNode[] };
export type ConditionEmpty = Record<string, never>;
export type ConditionNode = ConditionEmpty | ConditionGroupAll | ConditionGroupAny | SimpleExpr;

export interface ActionPayload {
  fixed?: {
    users?: string[];
    suppliers?: string[];
    customers?: string[];
  };
  auto_users?: {
    where: SimpleExpr[];
  };
}

export interface ValidationError {
  /** Ruta dentro del documento, ej: 'all[1].any[0].op' o 'fixed.users[2]'. */
  path: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de tipo
// ─────────────────────────────────────────────────────────────────────────────

export function isAll(n: any): n is ConditionGroupAll {
  return n && typeof n === 'object' && Array.isArray(n.all);
}
export function isAny(n: any): n is ConditionGroupAny {
  return n && typeof n === 'object' && Array.isArray(n.any);
}
export function isSimple(n: any): n is SimpleExpr {
  return n && typeof n === 'object' && typeof n.path === 'string' && typeof n.op === 'string';
}
export function isEmpty(n: any): boolean {
  return n && typeof n === 'object' && !Array.isArray(n) && Object.keys(n).length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validadores
// ─────────────────────────────────────────────────────────────────────────────

const CONDITION_ROOT_KEYS = new Set(['all', 'any', 'path', 'op', 'value']);
const ACTION_ROOT_KEYS = new Set(['fixed', 'auto_users']);
const FIXED_KEYS = new Set(['users', 'suppliers', 'customers']);
const WHERE_ITEM_KEYS = new Set(['path', 'op', 'value']);

export function validateConditions(
  node: any,
  cfg: ConditionsFieldConfig,
  type: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const catalog = cfg?.catalogs?.[type];
  if (!catalog) {
    if (type) errors.push({ path: '', message: `Catálogo no encontrado para tipo "${type}".` });
    return errors;
  }
  const paths = catalog.paths ?? {};
  const opsMeta = cfg.ops_meta ?? {};
  const allowedOps = new Set(cfg.allowed_ops ?? []);
  walkNode(node, '', errors, paths, opsMeta, allowedOps, type);
  return errors;
}

function walkNode(
  node: any,
  path: string,
  errors: ValidationError[],
  paths: Record<string, PathMeta>,
  opsMeta: Record<string, OpMeta>,
  allowedOps: Set<string>,
  type: string,
): void {
  if (node == null || typeof node !== 'object' || Array.isArray(node)) {
    errors.push({ path, message: 'Nodo inválido (debe ser objeto).' });
    return;
  }
  // {} — siempre válido (la regla aplica siempre)
  if (isEmpty(node)) return;

  const keys = Object.keys(node);
  for (const k of keys) {
    if (!CONDITION_ROOT_KEYS.has(k)) {
      errors.push({ path: path ? `${path}.${k}` : k, message: `Clave no permitida "${k}".` });
    }
  }

  if (isAll(node) || isAny(node)) {
    const opKey = isAll(node) ? 'all' : 'any';
    const arr: any[] = (node as any)[opKey];
    if (!Array.isArray(arr) || arr.length === 0) {
      errors.push({
        path: path ? `${path}.${opKey}` : opKey,
        message: `"${opKey}" debe contener al menos un nodo.`,
      });
      return;
    }
    arr.forEach((child, i) =>
      walkNode(child, `${path ? path + '.' : ''}${opKey}[${i}]`, errors, paths, opsMeta, allowedOps, type),
    );
    return;
  }

  // simple expr
  if (!isSimple(node)) {
    errors.push({ path, message: 'Estructura inválida (esperaba {path, op, value?} o {all|any}).' });
    return;
  }
  const { path: p, op, value } = node as SimpleExpr;
  if (!p) errors.push({ path: path ? `${path}.path` : 'path', message: 'path requerido.' });
  if (!op) errors.push({ path: path ? `${path}.op` : 'op', message: 'op requerido.' });
  if (op && !allowedOps.has(op)) {
    errors.push({ path: path ? `${path}.op` : 'op', message: `Operador "${op}" no permitido.` });
  }
  if (p && !paths[p]) {
    errors.push({ path: path ? `${path}.path` : 'path', message: `Path "${p}" no existe en catálogo "${type}".` });
  }
  if (p && op && paths[p] && !paths[p].ops.includes(op)) {
    errors.push({ path: path ? `${path}.op` : 'op', message: `Operador "${op}" no permitido en "${p}".` });
  }
  if (op) validateValue(op, value, opsMeta[op], path, errors, paths);
}

function validateValue(
  op: string,
  value: any,
  meta: OpMeta | undefined,
  parentPath: string,
  errors: ValidationError[],
  paths: Record<string, PathMeta>,
  /**
   * Si es `true`, no se exige que el path-value exista en `paths`.
   * Útil para `eq_ctx` dentro de `auto_users.where` del action: ahí el path
   * referencia el contexto de la regla padre (asset.*, etc.), no las paths
   * propias de `auto_users` (user / person / employee). El backend hace la
   * validación cruzada final.
   */
  ctxPathOptional = false,
): void {
  if (!meta) {
    errors.push({ path: parentPath ? `${parentPath}.op` : 'op', message: `ops_meta sin "${op}".` });
    return;
  }
  const vp = parentPath ? `${parentPath}.value` : 'value';
  switch (meta.value_type) {
    case null:
      if (value !== undefined) {
        errors.push({ path: vp, message: `"${op}" no debe llevar value.` });
      }
      return;
    case 'scalar':
      if (value === undefined || value === null || (typeof value === 'object')) {
        errors.push({ path: vp, message: `"${op}" requiere value escalar.` });
      }
      return;
    case 'array':
      if (!Array.isArray(value) || value.length === 0) {
        errors.push({ path: vp, message: `"${op}" requiere arreglo no vacío.` });
      }
      return;
    case 'between':
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push({ path: vp, message: `"${op}" requiere objeto {min,max}.` });
        return;
      }
      const k = Object.keys(value);
      if (k.length === 0 || k.some(x => x !== 'min' && x !== 'max')) {
        errors.push({ path: vp, message: `"${op}" solo admite claves min/max.` });
      }
      return;
    case 'path':
      if (typeof value !== 'string' || !value) {
        errors.push({ path: vp, message: `"${op}" requiere string referenciando otro path.` });
        return;
      }
      if (ctxPathOptional) {
        // Sólo validamos formato mínimo `entidad.campo`.
        if (!/^[a-zA-Z_][\w]*\.[\w.]+$/.test(value)) {
          errors.push({ path: vp, message: `"${op}" requiere path con formato "entidad.campo".` });
        }
        return;
      }
      if (!paths[value]) {
        errors.push({ path: vp, message: `"${op}" referencia path inexistente "${value}".` });
      }
      return;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function validateAction(
  payload: any,
  cfg: ActionFieldConfig,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push({ path: '', message: 'action debe ser objeto.' });
    return errors;
  }
  for (const k of Object.keys(payload)) {
    if (!ACTION_ROOT_KEYS.has(k)) {
      errors.push({ path: k, message: `Clave no permitida "${k}".` });
    }
  }
  if (payload.fixed !== undefined) {
    if (!payload.fixed || typeof payload.fixed !== 'object' || Array.isArray(payload.fixed)) {
      errors.push({ path: 'fixed', message: 'fixed debe ser objeto.' });
    } else {
      const allowed = new Set(Object.keys(cfg?.fixed_targets ?? {}));
      for (const k of Object.keys(payload.fixed)) {
        if (!FIXED_KEYS.has(k) || !allowed.has(k)) {
          errors.push({ path: `fixed.${k}`, message: `Target no permitido "${k}".` });
          continue;
        }
        const arr = payload.fixed[k];
        if (!Array.isArray(arr)) {
          errors.push({ path: `fixed.${k}`, message: `Debe ser arreglo de IDs.` });
        } else {
          arr.forEach((id: any, i: number) => {
            if (typeof id !== 'string' || !id.trim()) {
              errors.push({ path: `fixed.${k}[${i}]`, message: 'ID inválido.' });
            }
          });
        }
      }
    }
  }
  if (payload.auto_users !== undefined) {
    if (!payload.auto_users || typeof payload.auto_users !== 'object' || Array.isArray(payload.auto_users)) {
      errors.push({ path: 'auto_users', message: 'auto_users debe ser objeto.' });
    } else {
      const keys = Object.keys(payload.auto_users);
      const extras = keys.filter(k => k !== 'where');
      extras.forEach(k => errors.push({ path: `auto_users.${k}`, message: `Clave no permitida "${k}".` }));
      if (!Array.isArray(payload.auto_users.where)) {
        errors.push({ path: 'auto_users.where', message: 'where debe ser arreglo.' });
      } else {
        const paths = cfg?.auto_users?.paths ?? {};
        const opsMeta = cfg?.auto_users?.ops_meta ?? {};
        const allowedOps = new Set(cfg?.allowed_ops ?? []);
        payload.auto_users.where.forEach((item: any, i: number) => {
          const base = `auto_users.where[${i}]`;
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            errors.push({ path: base, message: 'item debe ser {path,op,value?}.' });
            return;
          }
          for (const k of Object.keys(item)) {
            if (!WHERE_ITEM_KEYS.has(k)) {
              errors.push({ path: `${base}.${k}`, message: `Clave no permitida "${k}".` });
            }
          }
          if (!item.path) errors.push({ path: `${base}.path`, message: 'path requerido.' });
          if (!item.op) errors.push({ path: `${base}.op`, message: 'op requerido.' });
          if (item.op && !allowedOps.has(item.op)) {
            errors.push({ path: `${base}.op`, message: `Operador "${item.op}" no permitido.` });
          }
          if (item.path && !paths[item.path]) {
            errors.push({ path: `${base}.path`, message: `Path "${item.path}" no existe.` });
          }
          if (item.path && item.op && paths[item.path] && !paths[item.path].ops.includes(item.op)) {
            errors.push({ path: `${base}.op`, message: `Operador "${item.op}" no permitido en "${item.path}".` });
          }
          if (item.op) validateValue(item.op, item.value, opsMeta[item.op], base, errors, paths, true);
        });
      }
    }
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanitización: elimina claves desconocidas antes de enviar al backend
// ─────────────────────────────────────────────────────────────────────────────

export function sanitizeConditions(node: any): ConditionNode {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return {};
  if (isEmpty(node)) return {};
  if (Array.isArray(node.all)) return { all: node.all.map(sanitizeConditions) };
  if (Array.isArray(node.any)) return { any: node.any.map(sanitizeConditions) };
  const out: SimpleExpr = { path: String(node.path ?? ''), op: String(node.op ?? '') };
  if (node.value !== undefined) out.value = node.value;
  return out;
}

export function sanitizeAction(payload: any): ActionPayload {
  const out: ActionPayload = {};
  if (payload?.fixed && typeof payload.fixed === 'object') {
    const f: any = {};
    for (const k of ['users', 'suppliers', 'customers'] as const) {
      const arr = payload.fixed[k];
      if (Array.isArray(arr)) f[k] = arr.filter((x: any) => typeof x === 'string' && x);
    }
    if (Object.keys(f).length) out.fixed = f;
  }
  if (payload?.auto_users && typeof payload.auto_users === 'object' && Array.isArray(payload.auto_users.where)) {
    out.auto_users = {
      where: payload.auto_users.where.map((it: any) => {
        const r: SimpleExpr = { path: String(it?.path ?? ''), op: String(it?.op ?? '') };
        if (it?.value !== undefined) r.value = it.value;
        return r;
      }),
    };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Localizador de field-config dentro de un drawForm[pos]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca recursivamente dentro de la sección de drawForm de un pos
 * (`drawForm()[pos]`) el primer nodo cuyo `editor_type` coincida con el
 * solicitado. Recorre `grid` / `card` / `fieldset` / `fields`.
 * Retorna `null` si no existe.
 */
export function findRuleField(drawFormSection: any, editor_type: string): any | null {
  if (!drawFormSection || typeof drawFormSection !== 'object') return null;
  const visit = (node: any): any => {
    if (!node) return null;
    if (Array.isArray(node)) {
      for (const it of node) { const f = visit(it); if (f) return f; }
      return null;
    }
    if (typeof node === 'object') {
      if (node.editor_type === editor_type) return node;
      for (const k of Object.keys(node)) {
        const f = visit(node[k]);
        if (f) return f;
      }
    }
    return null;
  };
  return visit(drawFormSection);
}
