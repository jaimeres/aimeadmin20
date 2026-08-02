# Tabla derivada padre-hijo en el CRUD existente

- Fecha: 2026-07-31
- Consecutivo: 034
- Tipo: Cambio funcional

## Resumen

`CRUD` interpreta el contrato transversal `parent_child` que el servidor publica
dentro del campo de tabla derivada (`no_form_data_table_derived`). Con él, el
formulario sabe si está editando **un hijo** o **al padre** y se comporta en
consecuencia, sin clases base, componentes, pantallas ni rutas nuevas.

No se creó `MasterDetailCRUD` ni ninguna abstracción paralela: el mecanismo vive
dentro de `crud.class.ts` y reutiliza el formulario dinámico, la tabla derivada y
`save({ table_row })` que ya existían.

## Escenario 01: dos roles, un solo motor

El contrato lo resuelve el servidor a partir de la relación real entre modelos.
El cliente **no nombra ningún recurso**: por eso declarar una tabla derivada en
otro formulario no obliga a tocar este archivo.

| Momento | `role='child'` | `role='parent'` |
|---|---|---|
| Crear | tabla visible, hermanos locales, `save({ table_row })` intacto | igual, hijos locales |
| Editar | tabla **oculta** y campos `<fk>_data_*` **deshabilitados** | tabla **carga todos los hijos** y admite agregar más |

En `role='child'` el formulario lleva al padre embebido por prefijo. Al editar
una partida concreta la tabla estorba: la unidad editada es esa fila y el padre
ya existe, así que se oculta y sus campos se bloquean.

En `role='parent'` el formulario **es** el del padre. Ahí sí se cargan todos los
hijos filtrando por la `ForeignKey` que publica el contrato
(`filter[<fk>]=<id del padre>`), con el `include` declarado para que las celdas
de relación muestren etiqueta y no UUID.

## Escenario 02: dónde se engancha

Todo ocurre en `_applyParentChildTables()`, llamado desde `unifyRestoreForm()`,
que es el punto único por el que pasan alta y edición.

El orden importa y es la razón de ese punto exacto:

```text
resetFormDialog()   -> vacía las tablas no_form_data (initial_rows)
enableForm()        -> restituye la habilitación configurada (readonly incluidos)
_applyParentChildTables() -> aplica el contrato
showFormDialog()
```

Aplicarlo antes chocaría con el vaciado de tablas; aplicarlo después de
`showFormDialog()` mostraría un parpadeo con el estado anterior.

`_disableParentPrefixFields()` **sólo deshabilita**. La rehabilitación es
responsabilidad de `enableForm()`, que ya corrió y respeta los `readonly` de
configuración; volver a habilitar desde aquí los pisaría.

## Escenario 03: visibilidad de la tabla

El nodo del `draw` es el mismo objeto entre aperturas del diálogo, así que
ocultar la tabla al editar no puede dejarla oculta para el alta siguiente.
`_setParentChildTableHidden()` memoriza en un `WeakMap` el `hide` configurado
**antes** de la primera escritura y lo restituye al crear.

Como `hide` se muta in place, se desfragmenta la señal
(`this.drawForm.set({ ...this.drawForm() })`) para forzar el redibujo; es el
mismo patrón que ya usa `replaceValDrawForm`.

## Escenario 04: en rol padre, las filas se aplanan con la config del hijo

En `role='parent'` las filas pertenecen a **otro recurso** que el del formulario.
`DJAtoObject` usa `fields` para resolver el `option_label` de las relaciones y
`cols` para las etiquetas; si se le pasara la configuración del padre, las celdas
de relación quedarían sin `<campo>__name` y mostrarían UUID.

Por eso `_loadParentChildRows()` resuelve
`crudS.authS.config[<recurso hijo>]` y le pasa explícitamente su `fields` y sus
`cols`. En `role='child'` el hijo es el mismo recurso del formulario, así que el
comportamiento no cambia.

## Escenario 05: contrato sin resolver

El servidor distingue "no configurado" de "configurado y sin resolver": cuando no
puede deducir la relación publica `active=false`, `resolved=false` y el motivo en
`parent_child.error`.

El cliente exige `active === true && resolved === true`. Si no se cumple, ignora
el bloque por completo en vez de aplicar un rol inventado: la tabla se comporta
como hasta ahora y ningún campo se bloquea.

## Validaciones aplicadas

- `npx tsc --noEmit`: sin errores nuevos. Los 5 errores de
  `biometric-setup.component.ts` son preexistentes; se confirmó con la misma
  compilación sin este cambio (5 errores en ambos casos).
- `npx ng test --watch=false --browsers=ChromeHeadless`: 127 aprobadas y 55
  fallidas. La línea base antes del cambio era 123 aprobadas y **las mismas 55**
  fallidas, que son fallos preexistentes de scaffolding (`No provider found for
  ActivatedRoute` / `HttpClient`). Las 4 nuevas son las de este contrato.
- Las 4 pruebas cubren: rol hijo al editar, secuencia editar→crear que restituye
  la tabla, rol padre cargando hijos con su filtro, y contrato sin resolver.

## Archivos modificados

- `src/app/utils/crud.class.ts`
- `src/app/purchases/request/request.component.spec.ts`
- `docs/documents/2026-07-31-034-tabla-derivada-padre-hijo.md`

El contrato del servidor se documenta en
`aimeServidor2/docs/documents/2026-07-31-042-tabla-derivada-padre-hijo.md`.

## Primer consumidor de `role='parent'`

El formulario de Pedido (`supplier-request`) declaró su tabla de
`supplier-request-detail` y al editar carga sus partidas. **No requirió ningún
cambio en el cliente**: ni componente, ni plantilla, ni registro de `this.app` /
`this.module` del hijo. La consulta usa `child.app` y `child.resource` del propio
contrato, así que sólo las pantallas padre necesitan sus registros, que ya
tienen.

## Pendientes

1. Revisar si la carga de hijos necesita paginación cuando un padre tenga muchas
   partidas; hoy se consulta sin `limit`.
2. La tabla de Pedido es de sólo consulta (`add_row: false`): el servidor no
   permite crear partidas por API mientras `requested` sea de sólo lectura. Si
   eso cambia, habrá que cablear `delegateTableSave` / `onTableRowSave` en
   `supplier-request.component.html`, igual que en Solicitudes.
