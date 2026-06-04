# Columnas de form_data y nombres en relaciones tree-select/M2M no tipadas

- **Fecha:** 2026-05-31
- **Consecutivo:** 005
- **Tipo:** Cambio funcional

## Resumen de lo pedido

Que los campos provenientes de la configuración de `form_fields` / `child_form_fields`
(persistidos en `form_data` / `parent_form_data`) se muestren con su valor en las
columnas de la tabla, reutilizando los ciclos existentes de `DJAtoObject`
(`general.service`) en lugar de añadir más complejidad o latencia. Además, que los
campos relacionales tipo `tree-select` con nodo tree (ejemplo `responsible_persons`)
muestren los nombres separados por coma —igual que `requesters`— en vez de los UUID.

Ejemplos enfocados en `http://localhost:4201/assets/maintenance?pos=maintenance`.

## Alcance del cambio

- `src/app/utils/crud.class.ts` → `generateJSONColumns`.
- `src/app/utils/services/general.service.ts` → `DJAtoObject` + helper `_formatDynamicValue`.

## Diagnóstico previo (datos reales)

- En el OPTIONS, `responsible_persons`, `responsible_customers` y
  `responsible_suppliers` llegan como `type: 'GenericField'` con
  `relationship_type: 'ManyToMany'`. Por eso `generateJSONColumns` caía en el `else`
  por defecto y generaba la columna con el campo crudo (`responsible_persons`),
  mostrando el arreglo de UUID. En cambio `requesters` es `type: 'Relationship'` y ya
  generaba `requesters__name`.
- Las columnas `form_data.form_fields_data_*` ya se generaban (encabezado correcto),
  pero la celda quedaba vacía porque el valor real vive anidado en
  `form_data: { form_fields_data_region: { id, code, name }, ... }` y la tabla lee
  `rowData['form_data.form_fields_data_region']` (clave plana, sin resolución anidada).
- El `include` por defecto de maintenance era `asset,workshop,status,requesters`
  (sin `responsible_persons`), por lo que aunque se resolviera el nombre, el servidor
  no devolvía los objetos en `included`.

## Escenario 01: Columnas `__name` para relaciones M2M no tipadas como `Relationship`

En `generateJSONColumns`, antes del `else` por defecto, se agrega una rama para
`relationship_type` `ManyToMany` / `ManyToOne` / `OneToOne`. Estas columnas usan
`<field>__name`. Beneficio adicional: `iniParam` construye el `include` a partir de
las columnas terminadas en `__name`, por lo que la relación se agrega
automáticamente al `include` (igual que `requesters`) y el servidor devuelve los
objetos en `included`.

## Escenario 02: Nombres unidos por coma para `tree-select` en `DJAtoObject`

En el bloque M2M de `DJAtoObject`, la rama que concatena nombres antes solo se
activaba con `cols.multiple.active === true`. Ahora también se activa cuando el campo
es `tree-select` (`isTreeSel`), uniendo los nombres con el separador
(`cols.multiple.separator ?? ','`). Resultado: `responsible_persons` muestra
`"ADRIAN CABALLERO HERNANDEZ,ADAN LUIS PEREZ DOMINGUEZ,..."` en lugar de UUID.

## Escenario 03: Aplanado de `form_data` / `parent_form_data` en `DJAtoObject`

Reutilizando el mismo ciclo registro por registro de `DJAtoObject`, se aplanan
`form_data` y `parent_form_data` hacia claves planas `form_data.<campo>` /
`parent_form_data.<campo>` (el mismo `col.field` que genera `generateJSONColumns`).
El valor se formatea con el nuevo helper `_formatDynamicValue`, que usa el
`option_label` del campo (uniendo varias claves si vienen separadas por coma) y, si el
objeto persistido no expone esas claves, hace fallback a
`name/display_name/label/value/code/id`. Soporta objeto, primitivo y arreglo.

<a id="escenario-04"></a>
## Escenario 04: Solicitar `form_data` solo cuando hay columnas `form_fields_data_*`

Se corrigio `iniParam()` para que, cuando las columnas seleccionadas incluyen
`form_data.form_fields_data_*` o un campo `form_fields_data_*`, la consulta GET pida
el atributo raiz `form_data`.

La API no entrega automaticamente el diccionario `form_data` si no viene en `fields`.
Por eso las columnas dinamicas podian existir en la tabla, pero las celdas quedaban
vacias en recargas/listados aunque el detalle del registro en servidor si tuviera
`attributes.form_data`.

La regla queda limitada: `form_data` solo se agrega cuando alguna columna seleccionada
lo necesita. Si no hay columnas `form_fields_data_*`, no se pide `form_data`.

<a id="escenario-05"></a>
## Escenario 05: Evitar columnas duplicadas por label o campo

Se ajusto el bloque que agrega columnas `form_fields_data_*` desde `drawForm` para
no insertar una columna dinamica si ya existe una columna con el mismo `field` o con
el mismo encabezado visible.

Esto evita duplicados como "Tipo de falla", "Componente", "Cluster" o "Region"
cuando el schema principal ya genero una columna equivalente y el `drawForm` tambien
declara un campo dinamico con el mismo label.

<a id="escenario-06"></a>
## Escenario 06: Preservar contrato de relaciones no-M2M

Se agrego `relationship_type` al registro interno de relaciones construido desde
OPTIONS y se normaliza en `validateRelationships()`.

Si una relacion es `ManyToOne` u `OneToOne`, su `id` se fuerza a valor escalar/null
aunque el control del formulario llegue como arreglo. Esto evita que `baseDJA()`
interprete accidentalmente relaciones como `asset` como M2M y envie
`relationships.asset.data` como lista, cuando el backend espera un resource identifier
object.

## Decisiones tomadas

- No se agregan columnas para campos de `form_data` que no existan en la
  configuración (`form_fields`/`child_form_fields`); las columnas siguen siendo
  dirigidas por configuración. El aplanado solo rellena datos.
- Se mantiene el conteo (`{e} elemento(s)`) para `multi-select` sin
  `cols.multiple.active`; el cambio de unión por coma se limita a `tree-select` para
  no alterar el comportamiento existente de otros campos.
- No se modificó configuración ni `include` de forma manual: el `include` se ajusta
  solo por el cambio de campo de columna a `__name`.
- No se pide `form_data` siempre; `iniParam()` lo agrega a `fields` solo si alguna
  columna seleccionada usa `form_fields_data_*`.
- La deduplicacion se limita al momento de agregar columnas dinamicas
  `form_fields_data_*`; no cambia `DJAtoObject` ni la generacion base de columnas.
- Solo `ManyToMany` conserva arreglos en `relationships`; `ManyToOne` y `OneToOne`
  se normalizan a valor escalar antes de construir JSON:API.

## Validaciones aplicadas

- En `/assets/maintenance?pos=maintenance` (261 registros):
  - `form_data.form_fields_data_region` → `"NORESTE"`, `_cluster` → `"N1"`,
    `_componente` → `"Cabina"` (antes vacío).
  - `responsible_persons__name` → nombres unidos por coma (antes UUID).
  - `include` resultante incluye `responsible_persons`.
  - Columnas visibles incluyen `responsible_persons__name` y las 4
    `form_data.form_fields_data_*`.

## Archivos modificados

- `src/app/utils/crud.class.ts`
- `src/app/utils/services/general.service.ts`

## Pruebas sugeridas

- Verificar registros con `parent_form_data` (flujo hijo) para confirmar el aplanado
  `parent_form_data.<campo>`.
- Verificar campos `form_data` con valor primitivo o arreglo de objetos.
