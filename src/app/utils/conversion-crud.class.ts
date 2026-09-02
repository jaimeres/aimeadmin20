import { FormArray, FormGroup } from '@angular/forms';

import { CRUD } from './crud.class';
import { saveOptions } from './types/crud.types';
import { RAW_ATTRIBUTE_PREFIX, SOURCE_VERSION_KEYS, TABLE_ROW_LOCAL_SOURCE_FLAG,
  TABLE_ROW_SOURCE_VERSION_SUFFIX } from './table-row-flags.const';

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

// [[[II ESC:057-83 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-83
// RETIRADA la relajación de `required` del escenario 64.
//
// Proveedor, moneda y sucursal son ELEMENTALES y NO NULABLES en el modelo, así
// que su obligatoriedad no se toca desde el cliente. Sólo una DERIVACIÓN puede
// llenarlos sin que el usuario los capture, y entonces quien lo resuelve es el
// serializer — no una lista de campos relajados en el formulario.
//
// Se conserva el punto de extensión de `formErrors` porque el candado del
// primer elemento sí necesita reafirmarse antes de decidir.
override formErrors(pos = this.pos(), is_file = false): boolean {
  return super.formErrors(pos, is_file);
}
// ]]]FI

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
  const table = this._findNoFormDataTableConfig(this.pos(), ctx?.field);
  const contract = table ? this._tableSourcesContract(table) : null;
  if (!contract) return false;

  // Sin origen elegido la fila es captura manual y no le toca este camino.
  if (!(ctx?.source_row || {})[contract.column]) return false;

  // [[[II ESC:057-57 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-57
  // Fuera del alta hay que distinguir dos filas que se ven iguales: la que
  // acaba de jalarse —local, todavía no existe en el servidor— y la que YA está
  // guardada como partida de este documento y conserva la FK a su origen porque
  // nació de una conversión anterior. Sólo la primera sigue este camino; la
  // segunda es un detalle normal y se edita como tal.
  //
  // Al CREAR no hace falta la distinción: nada está guardado todavía.
  if (this.isCreate()) return true;
  return !!this._tableRowGroup(this.pos(), ctx?.field, ctx?.row_index)
    ?.[TABLE_ROW_LOCAL_SOURCE_FLAG];
}

/** FormGroup de una fila por índice; `null` si la tabla o el índice no existen. */
private _tableRowGroup(pos: any, field: string, index: any): any {
  const control = this.currentForm(pos)?.get(field);
  if (!(control instanceof FormArray)) return null;
  if (index == null || index < 0 || index >= control.length) return null;
  return control.at(index) as any;
}

/**
 * Contrato `sources` de una tabla derivada, ya normalizado.
 *
 * [[[II ESC:055-02 DOC:docs/documents/2026-08-05-055-buscadores-y-sources-reducido.md#escenario-02
 * SEIS llaves planas, sin anidación:
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
 *   required  campos que la partida ORIGEN debe traer con valor para poder
 *             jalarse. Es la normalización por documento (escenario 50 del
 *             documento 057) expresada en configuración: el pedido declara
 *             `product` y así las partidas libres de la solicitud no entran.
 *             Vacío = el documento acepta cualquier partida con saldo.
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
  column: string; quantity: string; version: readonly string[]; filter: string; pending: string[];
  required: string[]; type: string; include: string;
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
    // [[[II ESC:057-105 La versión NO es configuración: la fija
    // `SOURCE_VERSION_KEYS`, que es lo que el servidor sabe leer. ]]]FI
    version: SOURCE_VERSION_KEYS,
    filter: typeof raw?.filter === 'string' ? raw.filter.trim() : '',
    pending: list(raw?.pending),
    required: list(raw?.required),
    // [[[II ESC:057-133 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-133
    // Relaciones que debe traer la partida de ORIGEN. Son OTRAS que las del
    // recurso propio de la tabla, y mezclarlas en `response_include` mandaba al
    // recurso propio rutas que no tiene: 400 y tabla vacía al abrir. ]]]FI
    include: typeof raw?.include === 'string' ? raw.include.trim() : '',
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
// [[[II ESC:057-108 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-108
/**
 * La tabla derivada a la que pertenece un gesto, resuelta por su CAMPO.
 *
 * Antes se tomaba `[0]`: la primera tabla que declarara `sources`. Con una sola
 * tabla por pantalla daba igual, pero una pantalla con DOS —partidas de producto
 * y partidas de servicio, cada una jalando de su documento— habría dejado a la
 * segunda sin jalar nada y sin aviso.
 *
 * El campo es el que decide: cada tabla publica sus buscadores de origen en
 * `_sourceDocumentFields`, así que la pertenencia ya estaba declarada y sólo
 * faltaba usarla. Con una sola tabla el resultado es idéntico al de antes.
 */
protected _conversionSourceTableForField(pos: any, field: any): { table: any; contract: any } | null {
  const nombre = String(field ?? '');
  const tablas = this._conversionSourceTables(pos);
  if (!tablas.length) return null;

  const propia = tablas.find(({ contract }) =>
    this._sourceDocumentFields(pos, contract).includes(nombre));
  if (propia) return propia;

  // Sin coincidencia: sólo se cae a la única tabla cuando NO hay ambigüedad.
  // Con dos declaradas, adivinar sería volver al fallo que esto corrige.
  return tablas.length === 1 ? tablas[0] : null;
}

/** La tabla derivada cuyo FormArray es `field`. */
protected _conversionSourceTableByTableField(pos: any, field: any): { table: any; contract: any } | null {
  const nombre = String(field ?? '');
  return this._conversionSourceTables(pos)
    .find(({ table }) => String(table?.field ?? '') === nombre) || null;
}
// ]]]FI

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
      if (!id) {
        // [[[II ESC:057-73 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-73
        // MISMO predicado que la guarda del gesto. Contaba toda fila sin origen,
        // así que una recién abierta con el `+` —o con un booleano en `false`—
        // abortaba el guardado sin que el usuario hubiera capturado nada. ]]]FI
        if (this._isCapturedManualRow(row, contract)) manualRows++;
        return;
      }

      // [[[II ESC:057-57 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-57
      // Fuera del alta, una fila con FK al origen puede ser una partida YA
      // guardada que nació de una conversión anterior. Volver a mandarla haría
      // que el servidor intentara convertirla otra vez y el saldo la
      // rechazaría. Sólo viajan las que se acaban de jalar. ]]]FI
      if (!this.isCreate() && !row?.[TABLE_ROW_LOCAL_SOURCE_FLAG]) return;

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

// [[[II ESC:057-58 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-58
/**
 * Agrupamiento que el documento destino declara, ya normalizado.
 *
 * `elementary_fields` los impone el servidor y los publica de sólo lectura;
 * `extra_fields` los añade el tenant. El motor no sabe qué significa ninguno:
 * son rutas y se comparan como texto.
 */
protected _groupingFields(pos: any): string[] {
  const grouping = this.configGeneral()[pos]?.grouping || {};
  const lista = (valor: any): string[] => Array.isArray(valor)
    ? valor.filter((ruta: any) => typeof ruta === 'string' && ruta.trim())
    : [];
  return [...new Set([
    ...lista(grouping.elementary_fields),
    ...lista(grouping.extra_fields),
  ])];
}

/** Cuántos documentos admite emitir esta conversión; 1 si no se declara. */
protected _maxDocuments(pos: any): number {
  const nodo = this.configGeneral()[pos]?.multi_operations || {};
  if (nodo.enabled !== true) return 1;
  const tope = Number(nodo.max_operations);
  return Number.isFinite(tope) && tope > 0 ? tope : 1;
}

/**
 * Avisa ANTES de enviar si las partidas elegidas saldrían como varios documentos
 * y la configuración no lo permite.
 *
 * Agrupa igual que el servidor, con las mismas rutas, pero **sólo por las que la
 * FILA lleva**: una ruta con punto (`request.subsidiary`) cuelga del documento
 * padre y no viaja en la fila, así que ésas las sigue comprobando el servidor.
 * Es un aviso temprano, no una segunda autoridad: nunca deja pasar algo que el
 * servidor rechazaría, sólo evita el viaje cuando ya se sabe.
 *
 * Devuelve el número de documentos que saldrían, o `0` cuando no hay nada que
 * comprobar.
 */
protected _conversionDocumentCount(pos: any): number {
  // [[[II ESC:057-95 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-95
  // Se usan TODAS las rutas, con punto o sin él. Las compuestas las resolvió
  // `_appendSourceRows` contra el `included` de la respuesta y viajan en la
  // fila bajo su propia ruta.
  //
  // Una ruta que no se pudo resolver —porque el recurso no admite ese
  // `include`— deja su valor en `undefined` para TODAS las filas, así que no
  // separa grupos: el aviso queda conservador y nunca deja pasar algo que el
  // servidor aceptaría. El tenant se descarta: no separa nada dentro de una
  // misma sesión.
  const rutas = this._groupingFields(pos)
    .filter((ruta) => !ruta.endsWith('super_user'));
  if (!rutas.length) return 0;
  // ]]]FI

  const claves = new Set<string>();
  for (const { table } of this._conversionSourceTables(pos)) {
    const control = this.currentForm(pos)?.get(table.field);
    if (!(control instanceof FormArray)) continue;

    control.controls.forEach((row: any) => {
      if (row?.[this.derivedTableDraftFlag] === true) return;
      const origen = row?.[this.tableRowSourceFlag] || {};
      if (!Object.keys(origen).length) return;

      claves.add(JSON.stringify(rutas.map((ruta) => {
        const valor = origen[ruta];
        return valor === undefined || valor === null || valor === '' ? null : String(valor);
      })));
    });
  }
  return claves.size;
}
// ]]]FI

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

  // [[[II ESC:057-58 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-58
  // UNA FORMA A LA VEZ. Se intentó permitir la mezcla con una llave de
  // configuración y se retiró: obligaba a que DOS motores escribieran el mismo
  // encabezado —el del detalle sumando importes y el de conversión
  // sobreescribiéndolos— y el importe de las partidas manuales desaparecía.
  //
  // Ya no es un callejón: guardar primero y jalar después suma partidas al
  // documento que acaba de nacer, así que el aviso orienta en vez de negar.
  if (manualRows > 0) {
    this.messageS.changeMessage(
      'Este documento se arma con partidas de origen o con partidas capturadas a '
      + 'mano, no con las dos a la vez. Retire unas u otras; guardar primero no '
      + 'cambia la regla, porque un documento capturado a mano no admite '
      + 'partidas traídas después.',
      null, {}, 'warn');
    return { meta: null, abort: true };
  }
  // ]]]FI

  // [[[II ESC:057-58 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-58
  // El cliente agrupa igual que el servidor y corta antes del viaje si saldrían
  // más documentos de los que la configuración permite. El servidor lo sigue
  // comprobando —es la autoridad—; esto sólo evita que el usuario arme la
  // captura completa para que se la rechacen al guardar.
  const documentos = this._conversionDocumentCount(pos);
  const tope = this._maxDocuments(pos);
  if (documentos > tope) {
    this.messageS.changeMessage(
      `Las partidas elegidas formarían ${documentos} documentos distintos y aquí `
      + `sólo se puede crear ${tope}. No comparten proveedor, moneda, almacén o `
      + 'algún dato de agrupamiento; deje sólo las que vayan juntas.',
      null, {}, 'warn');
    return { meta: null, abort: true };
  }
  // ]]]FI

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

  // [[[II ESC:057-112 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-112
  // EL SALDO NO SE CALCULA AQUÍ. `pending` declara UN campo: el que el servidor
  // publica ya resuelto (`pending_quantity`), con la misma cuenta con la que
  // acepta o rechaza la conversión.
  //
  // Antes declaraba dos —«total, ya convertido»— y esta función restaba en
  // JavaScript. Rompía la regla de autoridad numérica dos veces: duplicaba la
  // fórmula, y la duplicaba en punto flotante binario, donde `0.3 - 0.1` da
  // `0.19999999999999998` y el servidor recibe 17 decimales para un campo de 9.
  //
  // Una declaración con más de un campo se IGNORA en vez de restar: pedir la
  // resta al cliente es exactamente lo que esta corrección cierra, y devolver
  // `undefined` sólo quita el tope visual —el rechazo definitivo lo sigue dando
  // el servidor—.
  if (fields.length > 1) return undefined;
  return row?.[fields[0]];
  // ]]]FI
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

// [[[II ESC:057-54 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-54
/**
 * Cómo se llama en pantalla el documento origen elegido.
 *
 * No se inventa: se usa el `option_label` del buscador que lo trajo, que es el
 * MISMO texto que el usuario acaba de ver en el panel. Se prueban todos los
 * buscadores del documento porque puede haber varios perfiles —por código, por
 * folio— y gana el primero que resuelva algo; si ninguno resuelve, se cae al id,
 * que es feo pero cierto.
 */
protected _sourceDocumentLabel(pos: any, contract: any, raw: any, documentId: any): string {
  if (!raw || typeof raw !== 'object') return documentId ? String(documentId) : '';

  const draw = this._drawFormForDevice(pos);
  const campos = new Set(this._sourceDocumentFields(pos, contract));

  for (const layout of this._collectDrawFormLayouts(draw) || []) {
    for (const key of Object.keys(layout)) {
      const node = layout[key];
      if (!campos.has(String(node?.field ?? ''))) continue;

      const etiqueta = String(node?.option_label || '')
        .split(',').map((parte: string) => parte.trim()).filter((parte: string) => !!parte)
        .map((parte: string) => raw[parte])
        .filter((valor: any) => valor !== undefined && valor !== null && valor !== '')
        .join(' ')
        .trim();
      if (etiqueta) return etiqueta;
    }
  }
  return documentId ? String(documentId) : '';
}

/**
 * Documentos origen que hoy alimentan la tabla derivada, con cuántas filas puso
 * cada uno.
 *
 * NO es una estructura aparte que haya que mantener sincronizada: se DERIVA de
 * las filas en cada lectura. Una fila que se quita a mano desaparece de la
 * cuenta sola, y un documento cuyas filas se quitaron todas deja de aparecer sin
 * que nadie lo borre de ninguna lista.
 */
conversionSourceDocuments(pos: any = null): {
  field: string; id: any; label: string; rows: number;
}[] {
  // La plantilla la llama en cada ciclo de detección de cambios. Es una tira
  // informativa: si algo aquí lanzara, rompería el formulario entero. No puede
  // costar eso, así que ante cualquier fallo devuelve vacío y desaparece.
  try {
    return this._conversionSourceDocuments(pos);
  } catch {
    return [];
  }
}

private _conversionSourceDocuments(pos: any): {
  field: string; id: any; label: string; rows: number;
}[] {
  const posicion = pos ?? this.pos();
  const documentos: { field: string; id: any; label: string; rows: number }[] = [];
  if (!this.currentForm(posicion)) return documentos;

  for (const { table } of this._conversionSourceTables(posicion)) {
    const control = this.currentForm(posicion)?.get(table.field);
    if (!(control instanceof FormArray)) continue;

    const porDocumento = new Map<string, { field: string; id: any; label: string; rows: number }>();
    control.controls.forEach((row: any) => {
      const marca = row?.[TABLE_ROW_LOCAL_SOURCE_FLAG];
      if (!marca?.document) return;

      const clave = String(marca.document);
      const actual = porDocumento.get(clave);
      if (actual) { actual.rows++; return; }
      porDocumento.set(clave, {
        field: table.field,
        id: marca.document,
        label: marca.label || clave,
        rows: 1,
      });
    });
    documentos.push(...porDocumento.values());
  }
  return documentos;
}

/**
 * Retira un documento origen completo: se van sus filas y ninguna otra.
 *
 * Es la reversa del gesto que las trajo. Ocurre sólo en el cliente —las filas no
 * existen todavía en el servidor— y volver a elegir el mismo documento las trae
 * de nuevo, releídas, que es justo lo que se quiere cuando alguien se arrepiente.
 */
removeConversionSourceDocument(field: string, documentId: any, pos: any = null): void {
  const posicion = pos ?? this.pos();
  const control = this.currentForm(posicion)?.get(field);
  if (!(control instanceof FormArray) || documentId == null) return;

  let quitadas = 0;
  for (let indice = control.length - 1; indice >= 0; indice--) {
    const marca = (control.at(indice) as any)?.[TABLE_ROW_LOCAL_SOURCE_FLAG];
    if (!marca?.document || String(marca.document) !== String(documentId)) continue;
    control.removeAt(indice, { emitEvent: false });
    quitadas++;
  }
  if (!quitadas) return;

  control.markAsDirty();
  control.root?.markAsDirty();
  control.updateValueAndValidity();
  // [[[II ESC:057-64 Sin filas traídas se vuelve a captura manual, y el
  // encabezado vuelve a ser obligatorio. ]]]FI
  // [[[II ESC:057-82 Sin partidas traídas el encabezado vuelve a ser del
  // usuario: se devuelven los campos que el buscador había cerrado. ]]]FI
  if (!control.length) {
    // [[[II ESC:057-108 La tabla se resuelve por SU campo, no por ser la
    // primera: con dos tablas, reabrir los campos de la otra sería un error. ]]]FI
    const acuerdo = this._conversionSourceTableByTableField(posicion, field)?.contract;
    this._sourceDocumentFields(posicion, acuerdo)
      .forEach((campo) => this._applyNodeFieldLocks(campo, 'enable'));
  }
  this.messageS.changeMessage(
    `Se retiraron ${quitadas} partida(s). El documento de origen queda intacto.`,
    null, {}, 'success', 'Aviso');
}
// ]]]FI

// [[[II ESC:057-47 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-47
/**
 * Elegir el documento origen JALA sus partidas. No hay botón.
 *
 * Antes hacía falta un segundo gesto —un botón `pull_sources`— para algo que el
 * usuario ya había pedido al elegir el documento. Peor: ese botón leía el
 * documento del CONTROL del buscador (`_pickSourceDocument`), y si el control no
 * lo conservaba no ocurría nada y sin aviso.
 *
 * Aquí se pasa el objeto SELECCIONADO directamente, así que no depende de dónde
 * quedó guardado. Sirve igual para Enter —la coincidencia exacta única llama a
 * este mismo handler— que para elegir del panel.
 */
override onSelectAutoComplete(e: any): void {
  // [[[II ESC:057-76 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-76
  // EL RECHAZO ES ATÓMICO DESDE EL GESTO. Antes se aplicaba primero la
  // selección —con sus `children/derived`— y sólo después se comprobaba si
  // podía traerse. Resultado: elegir por error un documento sobre una captura
  // manual mostraba el aviso de rechazo, pero el control quedaba seleccionado y
  // sus derivaciones ya habían escrito proveedor, moneda o sucursal. La jalada
  // no ocurría, pero había modificado un documento manual.
  //
  // Si el gesto se va a rechazar, se rechaza ANTES de aplicar nada.
  if (this._rejectSourceDocumentSelection(e)) return;
  // ]]]FI
  // [[[II ESC:057-111 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-111
  // COPIAR de otro documento del MISMO tipo. Es un camino aparte de la jalada:
  // no crea saldos, no arrastra impuestos congelados y no liga la copia con su
  // plantilla. Se atiende antes de aplicar nada de la conversión, porque este
  // buscador NO es un buscador de origen y no debe pasar por sus candados.
  if (this._copyDetailsField(this.pos()) === String(e?.field ?? '')) {
    super.onSelectAutoComplete(e);
    this._copyDetailsFrom(e);
    return;
  }
  // ]]]FI
  // [[[II ESC:057-98 La jalada es ASÍNCRONA: la foto se toma ANTES de que la
  // derivación escriba el encabezado, para poder devolverlo si no entra
  // ninguna partida. ]]]FI
  this._snapshotSourceGesture(e);
  super.onSelectAutoComplete(e);
  this._pullOnSourceDocumentSelected(e);
  // [[[II ESC:057-82 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-82
  // Traer un documento puede fijar campos del encabezado. Lo declara el NODO
  // que dispara, con el MISMO contrato que el botón `no_form_data_agregar` de
  // la solicitud —`fields_disable` / `fields_enable`—, y lo aplica el MISMO
  // `customUser`. No hay llave nueva ni un segundo aplicador.
  this._applyNodeFieldLocks(e?.field, 'disable');
  // ]]]FI
}

// [[[II ESC:057-82 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-82
/**
 * Aplica `fields_disable` / `fields_enable` del nodo que disparó la acción.
 *
 * Reutiliza `customUser`, que es quien ya sabe cerrar y abrir un control junto
 * con su espejo `object_<campo>`. Aquí sólo se localiza el nodo por su `field`
 * dentro del `drawForm` y se le pasa su propia configuración.
 */
protected _applyNodeFieldLocks(field: any, modo: 'disable' | 'enable'): void {
  try {
    const nodo = this._drawFormNode(field);
    if (!nodo) return;
    let lista = modo === 'disable' ? nodo?.fields_disable : nodo?.fields_enable;
    if (!Array.isArray(lista) || !lista.length) return;

    // [[[II ESC:057-121 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-121
    // NO SE CIERRA UN CAMPO VACÍO. Comprobado en el navegador: al jalar una
    // solicitud cuya partida no trae proveedor, la derivación no llenaba nada y
    // el candado cerraba igual. El servidor respondía
    //
    //   «Ni la partida ni el pedido traen: Proveedor. Captúrelos en el pedido…»
    //
    // …y el campo estaba DESHABILITADO: el usuario no podía guardar ni podía
    // corregir. Un callejón sin salida, que es justo lo que la regla principal
    // del BOS prohíbe.
    //
    // Cerrar un campo lleno protege una coherencia real —el documento y sus
    // partidas dicen lo mismo—. Cerrar uno vacío no protege nada y sí impide
    // trabajar, así que ése se queda abierto.
    if (modo === 'disable') {
      const valores = this.currentForm(this.pos())?.getRawValue() || {};
      lista = lista.filter((campo: string) => {
        const valor = valores[campo];
        return valor !== undefined && valor !== null && valor !== '';
      });
      if (!lista.length) return;
    }
    // ]]]FI

    this.customUser({
      action: modo,
      config: modo === 'disable'
        ? { fields_disable: lista }
        : { fields_enable: lista },
      formValues: this.currentForm(this.pos())?.getRawValue(),
    });
  } catch {
    // Cerrar campos es una comodidad: si algo falla, la captura sigue.
  }
}

/** Nodo del `drawForm` que declara ese `field`, o `null`. */
protected _drawFormNode(field: any): any {
  const nombre = String(field ?? '');
  if (!nombre) return null;
  const draw = this._drawFormForDevice(this.pos());
  for (const layout of this._collectDrawFormLayouts(draw) || []) {
    for (const key of Object.keys(layout)) {
      const nodo = layout[key];
      if (String(nodo?.field ?? '') === nombre) return nodo;
    }
  }
  return null;
}
// ]]]FI

// [[[II ESC:057-111 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-111
/**
 * Campo que DIBUJA la copia, declarado por la capacidad del recurso.
 *
 * `general.copy_details.enabled` dice si la capacidad existe y `field` nombra el
 * buscador. Sin las dos cosas no se copia: una capacidad encendida sin campo no
 * dibuja nada, y un campo sin capacidad no hace nada.
 */
protected _copyDetailsField(pos: any): string {
  try {
    const general = this.crudS.authS.config?.[pos]?.general?.copy_details;
    if (!general || general.enabled !== true) return '';
    return String(general.field || '');
  } catch {
    return '';
  }
}

/**
 * Copia las partidas del documento elegido como PLANTILLA.
 *
 * Las pide al servidor —`/<recurso>/<id>/copy-details/`— y no con un `GET` del
 * detalle, por dos razones:
 *
 * 1. **El permiso.** Copiar es un privilegio aparte de capturar: usar un
 *    documento ajeno de plantilla expone sus productos, precios y condiciones.
 *    Un permiso que sólo comprobara el cliente no sería un permiso.
 * 2. **Las reglas de qué NO se copia** —el saldo, los impuestos congelados, la
 *    ForeignKey al documento inferior— son de dominio, y el cliente no es quien
 *    debe conocerlas.
 *
 * Las filas entran como captura MANUAL: sin marca de origen, editables, y sin
 * `data.meta.sources` en el guardado. Para el servidor, el documento nuevo es
 * una captura que el usuario no tuvo que teclear.
 */
protected _copyDetailsFrom(e: any): void {
  const pos = this.pos();
  const seleccionado = e?.event?.value ?? e?.event?.item ?? e?.event;
  const id = (seleccionado && typeof seleccionado === 'object')
    ? (seleccionado.id ?? seleccionado.value) : seleccionado;
  if (!id) return;

  // [[[II ESC:057-108 Misma regla que la jalada: con una sola tabla se usa
  // ésa; con dos y sin forma de saber cuál, no se adivina. ]]]FI
  const tablas = this._conversionSourceTables(pos);
  const table = tablas.length === 1 ? tablas[0].table : null;
  const control = table ? this.currentForm(pos)?.get(table.field) : null;
  if (!(control instanceof FormArray)) {
    this.messageS.changeMessage(
      'No se pudo determinar a qué tabla van las partidas copiadas.',
      null, {}, 'warn');
    return;
  }

  // [[[II ESC:057-114 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-114
  // La exclusividad vale en ESTA captura: no se mezcla lo que se acaba de traer
  // con lo que se acaba de copiar, porque el POST no puede llevar las dos formas.
  //
  // °°° Se mira SÓLO la marca de sesión, por decisión del usuario: *«está bien
  // que se pueda copiar de un documento viejo, parcial o totalmente
  // convertido»*. Una fila guardada que nació de una conversión anterior no
  // lleva la marca, y copiar sobre ese documento es legítimo — las filas nuevas
  // son un alta normal y no viajan en `meta.sources`.
  if (control.controls.some((row: any) => !!row?.[TABLE_ROW_LOCAL_SOURCE_FLAG])) {
    this.messageS.changeMessage(
      'Ya hay partidas traídas de otro documento en esta captura. Retírelas '
      + 'antes de copiar de una plantilla.', null, {}, 'warn');
    return;
  }
  // ]]]FI

  const appTypeEntry = this.crudS.getAppType(pos);
  if (!appTypeEntry?.app || !appTypeEntry?.type) return;

  // [[[II ESC:057-118 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-118
  // UNA sola petición. La acción responde JSON:API del DETALLE con sus
  // `included`, así que el mismo `DJAtoObject` de la jalada resuelve la
  // etiqueta —«DIESEL» y no el UUID— sin una segunda lectura.
  //
  // El recurso sale de `data_type.type` de la TABLA, que es el detalle propio.
  // El contrato `sources` NO sirve aquí: apunta al documento INFERIOR.
  const detalle = this.crudS.getAppType(table?.data_type?.type);
  if (!detalle?.type) return;

  // MISMO guardián que la jalada: sin la configuración del recurso hijo
  // cargada, el aplanado no sabe resolver `option_label` y la celda cae al UUID.
  if (!this.ensureConfigForPos(detalle.type, () => this._copyDetailsFrom(e))) return;

  const childConfig = this.crudS.authS.config?.[detalle.type];
  this.showBlocked();
  // La RUTA va en `app`, que es el segmento del endpoint; `type` sólo alimenta
  // `fields[]`.
  // [[[II ESC:057-119 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-119
  // El `include` sale de la CAPACIDAD, no del `response_include` de la tabla:
  // ése describe el detalle del documento INFERIOR y trae relaciones que el
  // detalle propio no tiene, así que el servidor respondía 400 y la copia no
  // traía nada. Comprobado en el navegador.
  const incluir = String(
    this.crudS.authS.config?.[pos]?.general?.copy_details?.include || '');
  // ]]]FI
  this.crudS.getObject({
    app: `${appTypeEntry.app}/${id}/copy-details`,
    type: detalle.type,
    include: incluir,
  }).subscribe({
    next: (resp: any) => {
      this.showBlocked(false);
      const filas = this.DJAtoObject({
        resp, pos: detalle.type,
        customField: childConfig?.cols || {},
        fields: childConfig?.fields || {},
      });
      // [[[II ESC:057-129 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-129
      // Las columnas `<relación>_data_<campo>` no son campos de la partida: se
      // resuelven desde el `included` que ya viaja en esta misma respuesta. Sin
      // esto, `Código` y `Descripción` llegaban vacías. ]]]FI
      const conDerivados = this.generalS.enrichRowRelationDataFromColumns(
        Array.isArray(filas) ? filas : [filas], resp, table?.columns);
      this._applyCopiedRows(pos, table, conDerivados, e);
    },
    error: (err: any) => {
      this.showBlocked(false);
      this.messageS.changeMessage(
        'No se pudieron copiar las partidas de ese documento.', err,
        this.customField()[pos]);
    },
  });
  // ]]]FI
}

/** Mete en la tabla las filas de la plantilla, ya aplanadas. */
protected _applyCopiedRows(pos: any, table: any, filas: any[], e: any = null): void {
  const control = this.currentForm(pos)?.get(table?.field);
  if (!(control instanceof FormArray)) return;

  const validas = (filas || []).filter((fila: any) => fila && typeof fila === 'object');
  if (!validas.length) {
    this.messageS.changeMessage(
      'Ese documento no tiene partidas que se puedan copiar.',
      null, {}, 'warn', 'Aviso');
    return;
  }

  // [[[II ESC:057-118 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-118
  // Aquí NO se filtra nada. Qué campos viajan lo decidió el SERVIDOR, que es
  // donde vive la regla dura —no se copia la ForeignKey al documento inferior,
  // ni el saldo, ni los impuestos congelados, ni las autorizaciones—. Repetir
  // esa lista aquí sería la segunda copia de una regla de dominio, que es
  // exactamente lo que este trabajo lleva corrigiendo.
  validas.forEach((fila: any) => {
    const proyectada = this._completeCreatedLocalTableRow(pos, table, fila);
    control.push(this._createNoFormDataTableRowFormGroup(table, proyectada),
      { emitEvent: false });
  });
  // ]]]FI

  control.markAsDirty();
  control.root?.markAsDirty();
  control.updateValueAndValidity();
  // [[[II ESC:057-116 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-116
  // La copia CIERRA el encabezado igual que la jalada, y por el mismo camino:
  // `fields_disable` del nodo que disparó. Sólo cuando entraron filas — si no
  // entró ninguna, el gesto no ocurrió y no hay nada que cerrar.
  this._applyNodeFieldLocks(e?.field, 'disable');
  // ]]]FI
  this.messageS.changeMessage(
    `Se copiaron ${validas.length} partida(s). Puede editarlas antes de guardar.`,
    null, {}, 'success', 'Aviso');
}

// [[[II ESC:057-98 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-98
/**
 * EL GESTO DE JALAR TIENE QUE PODER DESHACERSE, y no podía.
 *
 * El escenario 76 hizo atómico el rechazo que se decide en el acto —mezclar con
 * captura manual—, pero la jalada es ASÍNCRONA: la derivación escribe proveedor,
 * moneda y sucursal, y los candados cierran esos campos, ANTES de que el
 * servidor conteste. Si la respuesta no trae ninguna partida —el documento ya se
 * consumió— el aviso llegaba sobre un encabezado ya escrito y ya cerrado, por un
 * documento del que no entró nada.
 *
 * Aquí se fotografían los campos que el gesto puede escribir, para devolverlos
 * si no entra nada. Se guardan también los espejos `object_<campo>`, que son los
 * que sostienen la etiqueta del autocomplete.
 */
private _sourceGesture: {
  pos: any; field: string; values: { [campo: string]: any }; hadPulledRows: boolean;
} | null = null;

protected _snapshotSourceGesture(e: any): void {
  this._sourceGesture = null;
  try {
    const pos = this.pos();
    const campo = String(e?.field ?? '');
    // [[[II ESC:057-108 ]]]FI
    const entry = this._conversionSourceTableForField(pos, campo);
    if (!entry?.contract?.filter) return;
    if (!this._sourceDocumentFields(pos, entry.contract).includes(campo)) return;

    const form = this.currentForm(pos);
    if (!form) return;

    // Lo que el gesto puede escribir: los destinos que DERIVA el nodo y los
    // campos que CIERRA. Las dos listas las declara la configuración; no hay
    // una tercera fuente ni una lista fija de nombres.
    const nodo = this._drawFormNode(campo);
    const derivados = this.generalS
      .configuredChildNodes(nodo?.children?.fields?.derived)
      .map((hijo: any) => String(hijo?.field ?? ''));
    const cerrados = Array.isArray(nodo?.fields_disable) ? nodo.fields_disable : [];
    const campos = new Set<string>(
      [...derivados, ...cerrados, campo].filter((nombre: any) => !!nombre),
    );

    const values: { [nombre: string]: any } = {};
    campos.forEach((nombre) => {
      values[nombre] = form.get(nombre)?.value ?? null;
      values[`object_${nombre}`] = form.get(`object_${nombre}`)?.value ?? null;
    });

    this._sourceGesture = {
      pos, field: campo, values,
      hadPulledRows: this._hasPulledRows(pos, entry.table),
    };
  } catch {
    this._sourceGesture = null;
  }
}

/** ¿La tabla ya tiene partidas TRAÍDAS de algún documento? */
protected _hasPulledRows(pos: any, table: any): boolean {
  const control = this.currentForm(pos)?.get(table?.field);
  if (!(control instanceof FormArray)) return false;
  return control.controls.some((row: any) => !!row?.[TABLE_ROW_LOCAL_SOURCE_FLAG]);
}

/**
 * Deshace el gesto cuando no entró ninguna partida.
 *
 * El buscador se limpia SIEMPRE: dejarlo con el documento elegido dice que se
 * aceptó algo que no se aceptó.
 *
 * El encabezado sólo se devuelve cuando la tabla NO tenía partidas traídas. Si
 * ya las tenía, ese encabezado es de AQUELLA jalada —no de ésta— y devolverlo
 * dejaría el documento contradiciendo a sus propias partidas, que es justo lo
 * que los candados existen para impedir.
 */
protected _undoSourceGesture(): void {
  const gesto = this._sourceGesture;
  this._sourceGesture = null;
  if (!gesto) return;
  try {
    const form = this.currentForm(gesto.pos);
    if (!form) return;

    form.get(gesto.field)?.setValue(gesto.values[gesto.field] ?? null, { emitEvent: false });
    form.get(`object_${gesto.field}`)
      ?.setValue(gesto.values[`object_${gesto.field}`] ?? null, { emitEvent: false });
    if (gesto.hadPulledRows) return;

    Object.keys(gesto.values).forEach((nombre) => {
      form.get(nombre)?.setValue(gesto.values[nombre] ?? null, { emitEvent: false });
    });
    this._applyNodeFieldLocks(gesto.field, 'enable');
  } catch {
    // Deshacer es una comodidad: si algo falla, la captura sigue.
  }
}
// ]]]FI

// [[[II ESC:057-76 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-76
/**
 * ¿Este gesto elige un documento ORIGEN que no puede traerse? Entonces se
 * deshace por completo: aviso, control limpio y ninguna derivación aplicada.
 */
protected _rejectSourceDocumentSelection(e: any): boolean {
  try {
    const pos = this.pos();
    const campo = String(e?.field ?? '');
    // [[[II ESC:057-108 La tabla la decide el CAMPO del gesto. ]]]FI
    const entry = this._conversionSourceTableForField(pos, campo);
    if (!entry?.contract?.filter) return false;
    if (!this._sourceDocumentFields(pos, entry.contract).includes(campo)) return false;
    if (!this._manualRowsWithContent(pos, entry.table, entry.contract)) return false;

    this.messageS.changeMessage(
      'Ya hay partidas capturadas a mano, así que este documento se arma de esa '
      + 'forma. Retire las capturadas para traerlas de otro documento, o cree un '
      + 'documento nuevo con las traídas.',
      null, {}, 'warn');

    // El control no puede quedarse con el documento elegido: si se quedara, un
    // guardado posterior lo mandaría como si se hubiera aceptado.
    const form = this.currentForm(pos);
    form?.get(campo)?.setValue(null, { emitEvent: false });
    form?.get(`object_${campo}`)?.setValue(null, { emitEvent: false });
    return true;
  } catch {
    return false;
  }
}
// ]]]FI

/** Trae las partidas si el campo elegido es un buscador del documento ORIGEN. */
private _pullOnSourceDocumentSelected(e: any): void {
  try {
    const pos = this.pos();
    const campo = String(e?.field ?? '');
    // [[[II ESC:057-108 La tabla la decide el CAMPO del gesto, no el orden en
    // que se declararon las tablas. ]]]FI
    const entry = this._conversionSourceTableForField(pos, campo);
    if (!entry?.contract?.filter) return;

    // Los buscadores del documento origen son los que apuntan a SU recurso; los
    // resuelve el mismo helper de siempre, así que agregar otro perfil de
    // búsqueda sigue siendo configuración y no toca este archivo.
    const campos = this._sourceDocumentFields(pos, entry.contract);
    if (!campos.includes(campo)) return;

    const seleccionado = e?.event?.value ?? e?.event?.item ?? e?.event;
    if (!seleccionado || typeof seleccionado !== 'object') return;

    this.pullSourceDocument({ pos, document: seleccionado, field: campo });
  } catch {
    // Traer las partidas es una comodidad: si algo falla, la captura sigue.
  }
}
// ]]]FI

// [[[II ESC:057-63 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-63
/**
 * ¿Hay partidas CAPTURADAS A MANO con algo dentro?
 *
 * Una fila sin la marca de origen es captura manual. Se exige que tenga al
 * menos un valor: la fila recién abierta con el `+`, todavía vacía, no puede
 * bloquear nada —el usuario aún no capturó—, y la de vista previa del
 * autocomplete no se persiste nunca.
 */
protected _manualRowsWithContent(pos: any, table: any, contract: any = null): boolean {
  const control = this.currentForm(pos)?.get(table?.field);
  if (!(control instanceof FormArray)) return false;

  const acuerdo = contract || this._conversionSourceTables(pos)
    .find((entrada) => entrada.table?.field === table?.field)?.contract;
  return control.controls.some((row: any) => this._isCapturedManualRow(row, acuerdo));
}

// [[[II ESC:057-73 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-73
/**
 * PREDICADO ÚNICO de «fila capturada a mano CON algo dentro».
 *
 * Antes había dos definiciones y no coincidían: la guarda del gesto ignoraba la
 * fila vacía y el colector del guardado contaba toda fila sin origen aunque
 * estuviera vacía. Con los booleanos de la remisión, que nacen en `false`, una
 * fila recién abierta con el `+` ya bloqueaba jalar.
 *
 * Dos condiciones, y las dos importan:
 *
 * 1. **Sin origen.** No basta la marca de sesión: una fila LEÍDA del servidor
 *    que nació de una conversión anterior no la lleva —sólo se pone al jalar en
 *    esta sesión— pero SÍ trae la ForeignKey al origen en la columna que declara
 *    `sources.column`. Contarla como manual era lo que hacía imposible «guarde y
 *    jale después»: cualquier documento con partidas ya guardadas quedaba
 *    bloqueado, y el aviso ofrecía una salida que no existía.
 *
 * 2. **Con contenido capturado.** Un `false` booleano es el valor con el que
 *    nace la fila, no algo que el usuario escribiera; no cuenta. Tampoco la
 *    fila de vista previa del autocomplete, que nunca se persiste.
 */
protected _isCapturedManualRow(row: any, contract: any): boolean {
  if (row?.[TABLE_ROW_LOCAL_SOURCE_FLAG]) return false;
  if (row?.[this.derivedTableDraftFlag] === true) return false;

  const fuente = row?.[this.tableRowSourceFlag] || {};
  const valores = typeof row?.getRawValue === 'function' ? row.getRawValue() : {};

  const columnaOrigen = contract?.column;
  if (columnaOrigen) {
    const origen = fuente[columnaOrigen] ?? valores[columnaOrigen];
    if (origen !== undefined && origen !== null && origen !== '') return false;
  }

  return Object.keys(valores).some((campo) => {
    const valor = valores[campo];
    if (valor === undefined || valor === null || valor === '') return false;
    if (valor === false) return false;
    return true;
  });
}
// ]]]FI
// ]]]FI

protected pullSourceDocument(options: { pos?: any; document?: any; field?: any } = {}): void {
  const pos = options.pos ?? this.pos();
  // [[[II ESC:057-108 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-108
  // `field` es el buscador que disparó la jalada; con él se sabe A QUÉ tabla
  // van las partidas. Sin él —una llamada directa— se conserva el
  // comportamiento anterior sólo si hay una sola tabla. ]]]FI
  const entry = options.field !== undefined
    ? this._conversionSourceTableForField(pos, options.field)
    : this._conversionSourceTableForField(pos, '');
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

  // [[[II ESC:057-63 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-63
  // LA GUARDA SIMÉTRICA. Si el usuario ya capturó partidas a mano, ganó esa
  // forma y traer un documento tampoco puede salir bien.
  //
  // Se comprobaba sólo al guardar, y el aviso llegaba con el documento entero
  // ya armado. Aquí llega en el gesto, antes de pedir nada al servidor.
  if (this._manualRowsWithContent(pos, table)) {
    this.messageS.changeMessage(
      'Ya hay partidas capturadas a mano, así que este documento se arma de esa '
      + 'forma. Retire las capturadas para traerlas de otro documento, o cree un '
      + 'documento nuevo con las traídas.',
      null, {}, 'warn');
    // [[[II ESC:057-98 ]]]FI
    this._undoSourceGesture();
    return;
  }
  // ]]]FI
  const documentId = (raw && typeof raw === 'object') ? (raw.id ?? raw.value) : raw;
  const documentLabel = this._sourceDocumentLabel(pos, contract, raw, documentId);
  if (!documentId) {
    this.messageS.changeMessage(
      'Elija primero el documento del que quiere tomar las partidas.', null, {}, 'warn');
    return;
  }

  // `getAppType` sigue siendo el único punto que resuelve app/type, y aquí se
  // resuelve el recurso de las PARTIDAS, no el del documento.
  const appTypeEntry = this.crudS.getAppType(contract.type);
  const app = appTypeEntry?.app;
  const type = appTypeEntry?.type;
  if (!app || !type || !contract.filter) return;

  // [[[II ESC:057-62 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-62
  // LA CONFIGURACIÓN DEL RECURSO ORIGEN TIENE QUE ESTAR CARGADA ANTES DE APLANAR.
  //
  // `authS.config` se carga POR MÓDULO y bajo demanda. Estando en Pedido, el
  // módulo cargado es `supplier-request`; `request-detail` —que es de OTRA
  // pantalla— puede no estarlo. Y el getter de `config` no devuelve `undefined`
  // cuando falta: devuelve un módulo vacío (`buildTransientEmptyConfigModule`),
  // así que `childConfig?.fields || {}` NO protege nada y `DJAtoObject` recibe
  // `fields: {}`.
  //
  // Sin `fields` no hay regla de `option_label`, no se calcula `product__name`,
  // y `_tableCellValueForCrud` cae al valor crudo: la celda Producto muestra el
  // UUID. No es un fallo de configuración ni del servidor —los dos están bien—,
  // es que se leyó una configuración que aún no existía en memoria.
  //
  // `ensureConfigForPos` es el guardián que YA usan `getAll`, `openNew` y
  // `_buildSecundaryDetail` para exactamente esto; este camino era el único que
  // leía la configuración de otro recurso sin pasar por él. No se introduce
  // mecanismo nuevo: se aplica el existente al módulo que declara el contrato.
  if (!this.ensureConfigForPos(type, () => this.pullSourceDocument(options))) return;
  // ]]]FI

  const childConfig = this.crudS.authS.config?.[type];
  // [[[II ESC:057-133 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-133
  // El include de la JALADA lo declara `sources`, no `response_include`: aquí se
  // lee el documento INFERIOR, cuyas relaciones son otras. Mezclar los dos en
  // una sola llave hacía que al ABRIR un documento se mandaran a su propio
  // recurso rutas que no tiene, y el servidor respondía 400.
  //
  // Sin `sources.include` se cae a `response_include`, que es el comportamiento
  // anterior: una configuración que no declare la llave sigue funcionando.
  const include = contract?.include || table?.response_include || '';
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
      // [[[II ESC:057-129 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-129
      // Mismo resolvedor que la copia: la partida ORIGEN tampoco guarda el
      // código ni la descripción, cuelgan de su producto. ]]]FI
      const conDerivados = this.generalS.enrichRowRelationDataFromColumns(
        Array.isArray(rows) ? rows : [rows], resp, table?.columns);
      this._appendSourceRows(
        pos, table, contract, conDerivados, resp,
        { id: documentId, label: documentLabel },
      );
    },
    error: (err: any) => {
      this.showBlocked(false);
      // [[[II ESC:057-109 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-109
      // El `type` es el nombre TÉCNICO del recurso: «supplier-request-detail»
      // no significa nada para quien captura. El mensaje se queda con lo único
      // que el usuario necesita saber —qué falló y qué hacer—; el detalle
      // técnico ya viaja en `err`, que es donde lo busca quien depura. ]]]FI
      this.messageS.changeMessage(
        'No se pudieron cargar las partidas del documento. Vuelva a intentarlo.',
        err, this.customField()[pos]);
      // [[[II ESC:057-98 No entró nada, así que el gesto tampoco queda a
      // medias. ]]]FI
      this._undoSourceGesture();
    },
  });
}

/** Versión del origen tal como la emitió el servidor, no como se muestra. */
private _rawSourceVersion(row: any, attributes: any): string {
  const source = attributes || row || {};
  // [[[II ESC:057-105 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-105
  // MISMA fuente que la selección por celda. Antes esta lista estaba escrita
  // aquí y la otra salía de la configuración: coincidían por casualidad, y
  // cambiar la llave habría dejado esta jalada mandando un `source_version`
  // que el servidor no sabe leer, sin ningún error que lo delatara. ]]]FI
  for (const key of SOURCE_VERSION_KEYS) {
    const value = source[key] ?? row?.[`${RAW_ATTRIBUTE_PREFIX}${key}`];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '';
}

/** Proyecta las partidas traídas como filas ORIGEN de la tabla. */
private _appendSourceRows(
  pos: any, table: any, contract: any, rows: any[], resp: any = null,
  document: { id: any; label: string } = { id: null, label: '' },
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

  // [[[II ESC:057-95 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-95
  // RUTAS CON PUNTO DEL AGRUPAMIENTO. `request.subsidiary` cuelga del documento
  // PADRE, no de la partida, así que la fila aplanada no lo trae y el conteo de
  // documentos las descartaba: agrupaba por un subconjunto del criterio del
  // servidor y podía contar uno donde el servidor cuenta dos.
  //
  // Se resuelven aquí, contra el `included` que la respuesta ya trae porque el
  // `response_include` de la tabla las pide. No hay consulta extra ni contrato
  // nuevo: es el mismo grafo JSON:API, recorrido por la ruta declarada.
  const porTipoId = new Map<string, any>();
  (Array.isArray(resp?.included) ? resp.included : []).forEach((entry: any) => {
    if (entry?.type != null && entry?.id != null) {
      porTipoId.set(`${entry.type}|${entry.id}`, entry);
    }
  });
  const rutasCompuestas = this._groupingFields(pos).filter((ruta) => ruta.includes('.'));
  const resolverRuta = (entrada: any, ruta: string): any => {
    const partes = ruta.split('.');
    let actual = entrada;
    for (let i = 0; i < partes.length; i++) {
      const parte = partes[i];
      const rel = (actual?.relationships || {})[parte]?.data;
      if (rel && !Array.isArray(rel)) {
        // Último segmento y ES relación: la llave de grupo es su id.
        if (i === partes.length - 1) return rel.id;
        actual = porTipoId.get(`${rel.type}|${rel.id}`);
        if (!actual) return undefined;
        continue;
      }
      // No es relación: se lee como atributo del recurso actual.
      const valor = (actual?.attributes || {})[parte];
      return i === partes.length - 1 ? valor : undefined;
    }
    return undefined;
  };
  const compuestasPorId = new Map<string, any>();
  (Array.isArray(resp?.data) ? resp.data : []).forEach((entry: any) => {
    if (entry?.id == null || !rutasCompuestas.length) return;
    const valores: any = {};
    rutasCompuestas.forEach((ruta) => { valores[ruta] = resolverRuta(entry, ruta); });
    compuestasPorId.set(String(entry.id), valores);
  });
  // ]]]FI

  let added = 0;
  let skipped = 0;
  const descartes: any[] = [];
  rows.forEach((row: any) => {
    if (!row?.id) { descartes.push({ motivo: 'la fila no trae id', row }); return; }
    if (present.has(String(row.id))) {
      skipped++; descartes.push({ motivo: 'ya presente', id: row.id }); return;
    }

    // [[[II ESC:057-50 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-50
    // NORMALIZACIÓN POR DOCUMENTO. La solicitud admite partidas libres; el
    // pedido y todo lo que sigue, no. Los campos que la partida origen debe
    // traer los declara la configuración en `sources.required`, así que el
    // motor no nombra ningún recurso ni ningún campo de compras.
    //
    // El servidor bloquea lo mismo al convertir. Filtrar aquí no lo sustituye:
    // evita que el usuario arme un documento entero para que se lo rechacen
    // al guardar.
    const faltantes = (contract?.required || []).filter((campo: string) => {
      const valor = row?.[campo];
      return valor === undefined || valor === null || valor === '';
    });
    if (faltantes.length) {
      skipped++;
      descartes.push({ motivo: 'sin normalizar', id: row.id, faltantes });
      return;
    }
    // ]]]FI

    const pending = this._sourcePendingQuantity(row, contract);
    if (pending !== undefined && Number(pending) <= 0) {
      skipped++;
      descartes.push({ motivo: 'saldo <= 0', id: row.id, pending,
                       campos_pending: contract?.pending,
                       valores: (contract?.pending || []).map((c: string) => [c, row?.[c]]) });
      return;
    }

    const projected = this._completeCreatedLocalTableRow(pos, table, row);
    if (contract.quantity && pending !== undefined) projected[contract.quantity] = pending;

    const group = this._createNoFormDataTableRowFormGroup(table, projected);
    // Misma forma que deja el buscador por partida: sin esto la fila sería
    // captura manual y no viajaría en `data.meta.sources`.
    (group as any)[this.tableRowSourceFlag] = {
      ...((group as any)[this.tableRowSourceFlag] || {}),
      // [[[II ESC:057-95 Las rutas con punto viajan con la fila para que el
      // conteo de documentos use el criterio COMPLETO. ]]]FI
      ...(compuestasPorId.get(String(row.id)) || {}),
      [contract.column]: row.id,
      [`${contract.column}${TABLE_ROW_SOURCE_VERSION_SUFFIX}`]:
        this._rawSourceVersion(row, rawAttributes.get(String(row.id))),
    };
    // [[[II ESC:057-52 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-52
    // La fila NO es un registro de esta tabla: es la partida del documento de
    // abajo, mostrada aquí. Quitarla se resuelve en el cliente y el documento
    // origen queda intacto.
    //
    // [[[II ESC:057-54 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-54
    // Con la marca viaja lo que la tabla necesita para obedecer sin saber qué es
    // una conversión: de qué documento salió la fila, qué columna admite edición
    // y cuál es su tope. Los tres los declara `sources`.
    (group as any)[TABLE_ROW_LOCAL_SOURCE_FLAG] = {
      document: row?.[contract.filter] ?? document.id ?? null,
      label: document.label || '',
      editable: contract.quantity || '',
      max: pending,
    };
    // ]]]FI
    // ]]]FI
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

  // [[[II ESC:057-64 Ya hay filas traídas: el encabezado que resuelve el
  // agrupamiento deja de exigirse en este documento. ]]]FI


  // [[[II ESC:057-51 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-51
  // El aviso distingue POR QUÉ no entró una partida. Antes decía «sin saldo»
  // para los dos casos, así que volver a elegir el mismo documento —cuyas
  // partidas YA estaban en la tabla— acusaba un problema de saldo que no
  // existía, y mandaba a revisar el documento equivocado.
  const repetidas = descartes.filter((d) => d.motivo === 'ya presente').length;
  const sinNormalizar = descartes.filter((d) => d.motivo === 'sin normalizar').length;
  const sinSaldo = skipped - repetidas - sinNormalizar;
  // Los campos exigidos se nombran con el ENCABEZADO de su columna: el motor no
  // sabe qué significan, la configuración sí. Si no hay columna, se usa la
  // llave declarada antes que dejar el aviso mudo.
  const columnas = this.generalS.configuredTableColumns(table?.columns);
  const exigidos = (contract?.required || []).map((campo: string) =>
    columnas.find((columna: any) => columna?.field === campo)?.header || campo,
  ).join(', ');

  const motivos = [
    repetidas ? `${repetidas} ya estaba(n) en la tabla` : '',
    sinSaldo ? `${sinSaldo} sin saldo disponible` : '',
    sinNormalizar ? `${sinNormalizar} sin ${exigidos}` : '',
  ].filter(Boolean);

  let aviso: string;
  if (added) {
    aviso = `Se agregaron ${added} partida(s)`
      + (motivos.length ? `; ${motivos.join(' y ')}.` : '.');
  } else if (motivos.length === 1 && repetidas) {
    aviso = 'Las partidas de ese documento ya están en la tabla.';
  } else if (motivos.length === 1 && sinSaldo) {
    aviso = 'El documento no tiene partidas con saldo disponible.';
  } else if (motivos.length === 1 && sinNormalizar) {
    // Se dice QUÉ hacer, no sólo que no se pudo: la partida libre se corrige
    // en la solicitud poniéndole producto.
    aviso = `Ese documento sólo trae partidas sin ${exigidos}. Este documento no `
      + `las admite: complete ${exigidos} en el documento de origen y vuelva a `
      + 'intentarlo.';
  } else if (motivos.length) {
    aviso = `No se agregó ninguna partida: ${motivos.join(', ')}.`;
  } else {
    aviso = 'El documento no tiene partidas.';
  }
  this.messageS.changeMessage(aviso, null, {}, added ? 'success' : 'warn', 'Aviso');
  // ]]]FI
  // [[[II ESC:057-98 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-98
  // Si no entró ninguna partida, el gesto se deshace: el aviso no puede llegar
  // sobre un encabezado que ese documento ya escribió y cerró.
  if (added) this._sourceGesture = null;
  else this._undoSourceGesture();
  // ]]]FI
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
