import { FormArray, FormGroup } from '@angular/forms';

import { CRUD } from './crud.class';
import { saveOptions } from './types/crud.types';
import { RAW_ATTRIBUTE_PREFIX, TABLE_ROW_SOURCE_VERSION_SUFFIX } from './table-row-flags.const';

/**
 * [[[II ESC:054-02 DOC:docs/documents/2026-08-05-054-configuracion-por-documento.md#escenario-02
 * CRUD de documentos que se alimentan de un documento INFERIOR.
 *
 * `CRUD` lo carga TODO el sistema: cada módulo paga su tamaño aunque no convierta
 * nada. La conversión por `data.meta.sources` sólo la usan los documentos con
 * cadena padre-hijo entre documentos —hoy compras—, así que vive aquí y no allá.
 *
 * `CRUD` conserva únicamente los puntos de extensión, que en la base son no-ops:
 * `_conversionMetaForCreate`, `_finishConversionResponse`, `_resetConversionState`,
 * `_isLocalConversionRow` y `_tableSourcesContract`. Un componente que no herede
 * de esta clase se comporta exactamente como antes de que la conversión existiera.
 *
 * Los componentes de compras extienden `ConversionCRUD`; el resto sigue con `CRUD`.
 * ]]]FI
 */
export abstract class ConversionCRUD extends CRUD {

// [[[II ESC:036-03 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-03
// CONVERSIÓN: la tabla derivada arma `data.meta.sources` del POST del documento
// DESTINO. No hay ruta propia ni segundo flujo visual — las cuatro rutas planas
// `*-to-*` se retiraron del servidor — y sin filas origen el payload no cambia
// en absoluto: sigue siendo el CRUD de siempre.
//
// El servidor deduce la transición del par (tipo del destino, tipo de las
// fuentes). El cliente sólo dice de qué recurso viene cada fila, y eso ya lo
// declara el `data_type` de la columna origen: no hay llave nueva que pudiera
// divergir, ni ningún recurso nombrado en este archivo.

/** Llave de idempotencia viva por pos (ver `_conversionIdempotencyKey`). */
private conversionIdempotencyKeys: { [pos: string]: string } = {};

/**
 * Llave de idempotencia de la conversión en curso.
 *
 * El servidor la exige al convertir: es lo único que impide que un reintento
 * —doble clic, reenvío tras un error de red— cree el documento dos veces. Por
 * eso debe ser la MISMA mientras se reintenta la misma captura; se conserva por
 * pos y sólo se renueva cuando la conversión terminó y el formulario se
 * reinicia. Una llave reusada con OTRO payload el servidor la rechaza, así que
 * renovarla al reiniciar no es opcional.
 */
protected _conversionIdempotencyKey(pos: any): string {
  const key = String(pos);
  if (!this.conversionIdempotencyKeys[key]) {
    this.conversionIdempotencyKeys[key] = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  return this.conversionIdempotencyKeys[key];
}

/** Otra captura es otra conversión: la llave no puede sobrevivir al reinicio. */
protected _clearConversionIdempotencyKey(pos: any): void {
  delete this.conversionIdempotencyKeys[String(pos)];
}

/**
 * Fila que viajará en `data.meta.sources` en vez de persistirse sola.
 *
 * Sólo al CREAR: sobre un documento ya guardado no hay conversión que ejecutar
 * —`CONVERSION_SERVICES` del servidor está indexado por el alta del destino—,
 * así que ahí la fila sigue el flujo de detalle de siempre.
 */
protected override _isLocalConversionRow(ctx: any): boolean {
  if (!this.isCreate()) return false;

  const table = this._findNoFormDataTableConfig(this.pos(), ctx?.field);
  const contract = table ? this._tableSourcesContract(table) : null;
  if (!contract) return false;

  // Sin origen elegido la fila es captura manual y no le toca este camino.
  return !!(ctx?.source_row || {})[contract.column];
}

/**
 * Contrato `sources` de una tabla derivada, ya normalizado.
 *
 * [[[II ESC:055-02 DOC:docs/documents/2026-08-05-055-buscadores-y-sources-reducido.md#escenario-02
 * CINCO llaves planas, sin anidación:
 *
 *   column    columna origen; de su `data_type` salen el `id` y el `type` de
 *             cada entrada de `meta.sources`
 *   quantity  columna cuya captura viaja como `meta.quantity`
 *   version   atributos del origen que forman `source_version`
 *   filter    ForeignKey de la partida hacia su documento. Sirve para DOS cosas:
 *             filtrar las partidas al jalar, y resolver el recurso del documento
 *             con `getAppType`, que ya tolera `_` contra `-`. Por eso no hace
 *             falta declarar el recurso aparte.
 *   pending   saldo = primero menos segundo
 *
 * Desapareció `amount` —vacío hasta que exista remisión → factura—, el bloque
 * anidado `document` y `match`, que se fue al `data_type.filter` del buscador,
 * donde ya vivían las restricciones remotas.
 * ]]]FI
 *
 * `null` cuando la tabla no lo declara: es la única llave que distingue una
 * tabla de captura manual de una que además puede jalar partidas de un
 * documento origen, y sin ella nada de este flujo corre.
 */
protected override _tableSourcesContract(table: any): {
  column: string; quantity: string; version: string[]; filter: string; pending: string[];
  type: string;
} | null {
  const raw = table?.sources;
  const columnField = typeof raw?.column === 'string' ? raw.column.trim() : '';
  if (!columnField) return null;

  const columns = this.generalS.configuredTableColumns(table?.columns);
  const column = columns.find((candidate: any) => candidate?.field === columnField);
  // El `type` de cada fuente sale del `data_type` de la columna origen: el
  // mismo dato que ya gobierna su buscador.
  const type = column?.data_type?.type || '';
  if (!type) return null;

  const list = (value: any): string[] => String(value || '')
    .split(',').map((part: string) => part.trim()).filter((part: string) => !!part);

  return {
    column: columnField,
    quantity: typeof raw?.quantity === 'string' ? raw.quantity.trim() : '',
    version: list(raw?.version),
    filter: typeof raw?.filter === 'string' ? raw.filter.trim() : '',
    pending: list(raw?.pending),
    type,
  };
}

/**
 * Recorre las tablas derivadas del formulario y arma `sources`.
 *
 * Cuenta aparte las filas SIN origen porque el servidor no puede mezclarlas:
 * con `meta.sources` presente el POST entero se vuelve una conversión y las
 * partidas capturadas a mano no se materializan nunca. Perderlas en silencio
 * sería una regresión, así que quien llama debe impedir el envío.
 */
/**
 * Tablas derivadas del formulario que declaran `sources`.
 *
 * Se recorre el draw en vez de apoyarse en `_parentChildTables()`: el papel
 * padre-hijo y la conversión son dos contratos independientes, y una tabla que
 * declarara `sources` sin `fields_prefixes` quedaría sin efecto en silencio.
 */
protected _conversionSourceTables(pos: any): { table: any; contract: any }[] {
  const draw = this._drawFormForDevice(pos);
  if (!draw) return [];

  const tables: { table: any; contract: any }[] = [];
  for (const layout of this._collectDrawFormLayouts(draw)) {
    for (const key of Object.keys(layout)) {
      const node = layout[key];
      if (node?.type !== 'table' || !this._isNoFormDataField(node?.field)) continue;
      const contract = this._tableSourcesContract(node);
      if (contract) tables.push({ table: node, contract });
    }
  }
  return tables;
}

protected _collectConversionSources(pos: any): { sources: any[]; manualRows: number } {
  const sources: any[] = [];
  let manualRows = 0;

  for (const { table, contract } of this._conversionSourceTables(pos)) {
    const control = this.currentForm(pos)?.get(table.field);
    if (!(control instanceof FormArray)) continue;

    control.controls.forEach((row: any) => {
      // Vista previa derivada del autocomplete: nunca se persiste ni viaja.
      if (row?.[this.derivedTableDraftFlag] === true) return;

      const source = row?.[this.tableRowSourceFlag] || {};
      const id = source[contract.column];
      if (!id) { manualRows++; return; }

      const rowValue = typeof row?.getRawValue === 'function' ? row.getRawValue() : {};
      const meta: any = {};

      const version = source[`${contract.column}${TABLE_ROW_SOURCE_VERSION_SUFFIX}`];
      if (version !== undefined && version !== null && version !== '') {
        meta.source_version = version;
      }

      // Cantidad e importe viajan como TEXTO: el servidor los lee con
      // `Decimal(str(...))` y admite hasta nueve decimales. Un número de
      // JavaScript los redondearía antes de salir del cliente.
      [['quantity', contract.quantity]].forEach(([key, field]) => {
        if (!field) return;
        const value = rowValue[field] ?? source[field];
        if (value !== undefined && value !== null && value !== '') meta[key as string] = String(value);
      });

      sources.push({ type: contract.type, id, meta });
    });
  }

  return { sources, manualRows };
}

/**
 * `data.meta` del POST cuando hay filas origen.
 *
 * `meta: null` sin `abort` es el caso normal —no hay conversión— y deja el
 * payload idéntico al de siempre: la captura manual no se toca. `abort` corta
 * el guardado; NO se degrada a un POST normal, porque eso crearía el documento
 * con las filas manuales y perdería las de origen sin avisar.
 */
protected override _conversionMetaForCreate(pos: any): { meta: any | null; abort: boolean } {
  const { sources, manualRows } = this._collectConversionSources(pos);
  if (!sources.length) return { meta: null, abort: false };

  if (manualRows > 0) {
    // El servidor no puede mezclar: con `meta.sources` presente los atributos
    // capturados a mano no se materializan y esas filas se perderían en
    // silencio. Se corta aquí en vez de dejar que ocurra.
    this.messageS.changeMessage(
      'Un documento se crea de partidas de origen o de partidas capturadas a mano, '
      + 'pero no de las dos a la vez. Retire las partidas sin origen o quite las de origen.',
      null, {}, 'warn');
    return { meta: null, abort: true };
  }

  return {
    meta: {
      idempotency_key: this._conversionIdempotencyKey(pos),
      sources,
    },
    abort: false,
  };
}

// [[[II ESC:036-06 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-06
// JALAR EL DOCUMENTO ORIGEN COMPLETO.
//
// La otra mitad del buscador: en vez de resolver una partida por fila, se elige
// UN documento y entran todas sus partidas con saldo. Es lo mismo que hacer la
// búsqueda por partida N veces, así que produce filas idénticas —mismo `id`,
// misma versión, misma bandera de origen— y de ahí en adelante el flujo es el
// ya probado: `data.meta.sources` del POST del documento destino.
//
// El buscador del documento NO es un componente nuevo: es un campo del
// formulario con su `data_type`, que ya trae autocomplete, panel, `search_key`,
// umbral y `result_position`. Puede haber VARIOS —uno por código con Enter, otro
// general— y el motor no necesita saber cuántos: los reconoce por su `data_type`.

/** Cantidad pendiente de una partida origen, según `sources.document.pending`. */
protected _sourcePendingQuantity(row: any, contract: any): any {
  const fields = contract?.pending || [];
  if (!fields.length) return undefined;

  // `pending` declara «total, ya convertido»: el saldo es la resta. Con un solo
  // campo se toma tal cual, que es el caso de un origen que ya publica su saldo.
  const total = Number(row?.[fields[0]] ?? 0);
  if (fields.length === 1) return row?.[fields[0]];
  const used = Number(row?.[fields[1]] ?? 0);
  const pending = total - used;
  return pending > 0 ? pending : 0;
}

/**
 * Trae las partidas del documento origen elegido y las agrega a la tabla.
 *
 * Las filas se AGREGAN: jalar un segundo documento no borra el primero, porque
 * una remisión puede recibir partidas de varios pedidos. Una partida ya
 * presente no se duplica.
 */
/**
 * Campos del formulario que buscan el documento ORIGEN de esta tabla.
 *
 * No se declaran: se RECONOCEN. Un campo `no_form_data_*` cuyo `data_type`
 * resuelve al mismo recurso que la ForeignKey `sources.filter` es, por
 * definición, un buscador de ese documento. Así la configuración publica uno,
 * dos o ninguno sin que el motor se entere.
 */
protected _sourceDocumentFields(pos: any, contract: any): string[] {
  const draw = this._drawFormForDevice(pos);
  const objetivo = this.crudS.getAppType(contract?.filter)?.type;
  if (!draw || !objetivo) return [];

  const encontrados: string[] = [];
  for (const layout of this._collectDrawFormLayouts(draw)) {
    for (const key of Object.keys(layout)) {
      const node = layout[key];
      const field = node?.field;
      if (typeof field !== 'string' || !this._isNoFormDataField(field)) continue;
      if (this.crudS.getAppType(node?.data_type?.type)?.type === objetivo) encontrados.push(field);
    }
  }
  return encontrados;
}

/** Primer buscador con valor; `null` si ninguno lo tiene. */
protected _pickSourceDocument(pos: any, contract: any): any {
  const form = this.currentForm(pos);
  for (const field of this._sourceDocumentFields(pos, contract)) {
    const value = form?.get(field)?.value;
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

protected pullSourceDocument(options: { pos?: any; document?: any } = {}): void {
  const pos = options.pos ?? this.pos();
  const entry = this._conversionSourceTables(pos)[0];
  if (!entry?.contract?.filter) return;

  const { table, contract } = entry;
  const control = this.currentForm(pos)?.get(table.field);
  if (!(control instanceof FormArray)) return;

  // [[[II ESC:055-03 DOC:docs/documents/2026-08-05-055-buscadores-y-sources-reducido.md#escenario-03
  // El documento puede venir de CUALQUIER buscador del formulario que apunte al
  // recurso origen. Gana el que tenga valor, así que agregar un perfil de
  // búsqueda más es configuración y no toca este archivo.
  const raw = options.document ?? this._pickSourceDocument(pos, contract);
  // ]]]FI
  const documentId = (raw && typeof raw === 'object') ? (raw.id ?? raw.value) : raw;
  if (!documentId) {
    this.messageS.changeMessage(
      'Elija primero el documento del que quiere jalar las partidas.', null, {}, 'warn');
    return;
  }

  // `getAppType` sigue siendo el único punto que resuelve app/type, y aquí se
  // resuelve el recurso de las PARTIDAS, no el del documento.
  const appTypeEntry = this.crudS.getAppType(contract.type);
  const app = appTypeEntry?.app;
  const type = appTypeEntry?.type;
  if (!app || !type || !contract.filter) return;

  const childConfig = this.crudS.authS.config?.[type];
  const include = table?.response_include || '';
  const sort = table?.ordering || '';

  this.showBlocked();
  this.crudS.getObject({
    app, type, include, sort,
    filter: `filter[${contract.filter}]=${documentId}`,
  }).subscribe({
    next: (resp: any) => {
      this.showBlocked(false);
      const rows = this.DJAtoObject({
        resp, pos: type,
        customField: childConfig?.cols || {},
        fields: childConfig?.fields || {},
      });
      this._appendSourceRows(
        pos, table, contract, Array.isArray(rows) ? rows : [rows], resp,
      );
    },
    error: (err: any) => {
      this.showBlocked(false);
      this.messageS.changeMessage(
        `Hay un error al cargar las partidas de ${type}.`, err, this.customField()[pos]);
    },
  });
}

/** Versión del origen tal como la emitió el servidor, no como se muestra. */
private _rawSourceVersion(row: any, attributes: any): string {
  const source = attributes || row || {};
  const value = source.modified_at
    ?? source.created_at
    ?? row?.[`${RAW_ATTRIBUTE_PREFIX}modified_at`]
    ?? row?.[`${RAW_ATTRIBUTE_PREFIX}created_at`]
    ?? '';
  return value ? String(value) : '';
}

/** Proyecta las partidas traídas como filas ORIGEN de la tabla. */
private _appendSourceRows(
  pos: any, table: any, contract: any, rows: any[], resp: any = null,
): void {
  const control = this.currentForm(pos)?.get(table.field);
  if (!(control instanceof FormArray)) return;

  // Una partida ya jalada no se repite: el servidor la rechazaría por saldo y,
  // peor, el usuario no vería por qué.
  const present = new Set<string>();
  control.controls.forEach((row: any) => {
    const id = (row?.[this.tableRowSourceFlag] || {})[contract.column];
    if (id) present.add(String(id));
  });

  // [[[II ESC:036-07 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-07
  // La versión se toma de los atributos CRUDOS de la respuesta: el aplanado
  // convierte las fechas en texto local y el servidor no puede parsearlo.
  const rawAttributes = new Map<string, any>();
  (Array.isArray(resp?.data) ? resp.data : []).forEach((entry: any) => {
    if (entry?.id != null) rawAttributes.set(String(entry.id), entry.attributes || {});
  });
  // ]]]FI

  let added = 0;
  let skipped = 0;
  rows.forEach((row: any) => {
    if (!row?.id) return;
    if (present.has(String(row.id))) { skipped++; return; }

    const pending = this._sourcePendingQuantity(row, contract);
    if (pending !== undefined && Number(pending) <= 0) { skipped++; return; }

    const projected = this._completeCreatedLocalTableRow(pos, table, row);
    if (contract.quantity && pending !== undefined) projected[contract.quantity] = pending;

    const group = this._createNoFormDataTableRowFormGroup(table, projected);
    // Misma forma que deja el buscador por partida: sin esto la fila sería
    // captura manual y no viajaría en `data.meta.sources`.
    (group as any)[this.tableRowSourceFlag] = {
      ...((group as any)[this.tableRowSourceFlag] || {}),
      [contract.column]: row.id,
      [`${contract.column}${TABLE_ROW_SOURCE_VERSION_SUFFIX}`]:
        this._rawSourceVersion(row, rawAttributes.get(String(row.id))),
    };
    control.push(group, { emitEvent: false });
    present.add(String(row.id));
    added++;
  });

  // [[[II ESC:036-10 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-10
  // MISMO cierre que usa el alta de fila ya probada: `markAsDirty` en el
  // control y en la raíz, y `updateValueAndValidity()` SIN silenciar el
  // evento. Silenciarlo era el bug: las filas entraban al FormArray pero la
  // tabla no se enteraba —se suscribe a `valueChanges`—, así que el aviso
  // decía «se agregaron 2 partidas» sobre una tabla vacía.
  control.markAsDirty();
  control.root?.markAsDirty();
  control.updateValueAndValidity();
  // ]]]FI

  this.messageS.changeMessage(
    added
      ? `Se agregaron ${added} partida(s)` + (skipped ? `; ${skipped} sin saldo o ya presentes.` : '.')
      : 'El documento no tiene partidas con saldo por jalar.',
    null, {}, added ? 'success' : 'warn', 'Aviso');
}
// ]]]FI

// [[[II ESC:036-04 DOC:docs/documents/2026-08-04-036-meta-sources-tabla-derivada.md#escenario-04
/**
 * Cierre de una conversión aceptada por el servidor.
 *
 * La respuesta no trae recursos: el servidor agrupa las partidas origen y pudo
 * crear más de un documento, ninguno de los cuales viaja como resource object.
 * La única forma correcta de reflejarlo en el listado es releerlo.
 *
 * `replayed` distingue un reintento de la misma llave —que devuelve el mismo
 * resultado sin volver a crear nada— de una ejecución nueva.
 */
protected override _finishConversionResponse(pos: any, resp: any, options: saveOptions): boolean {
// Sólo una respuesta de conversión trae `conversion_run_id`; cualquier otra
// sigue el camino normal de creación.
if (!resp?.meta?.conversion_run_id) return false;
  // Sólo aquí se renueva la llave: mientras se reintenta la MISMA captura debe
  // conservarse, o el reintento crearía un segundo documento.
  this._clearConversionIdempotencyKey(pos);
  this.files = [];
  this.files64 = [];

  this.messageS.changeMessage(
    resp?.meta?.replayed === true
      ? 'Esta conversión ya se había ejecutado; no se creó un documento nuevo.'
      : 'Conversión ejecutada.',
    null, {}, 'success', 'Aviso');

  this.commonVisibilityDialog(options);
  this.getAll({ pos, force: true });
  return true;
}
// ]]]FI
// ]]]FI
}
