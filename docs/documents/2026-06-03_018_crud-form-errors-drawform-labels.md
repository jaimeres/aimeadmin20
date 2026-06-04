# Nombre del cambio

Labels de drawForm en errores locales de CRUD.

## Fecha

2026-06-03

## Consecutivo

018

## Tipo

Cambio funcional

## Resumen

Se analizo por que `this.messageS.changeMessage` no mostraba el nombre de campos `prefijo_data_*` o `relacion_data_*` en errores locales de formulario, aunque el nombre estaba definido en la configuracion del campo.

## Alcance

Se ajusto `CRUD.formErrors()` para enviar a `MessageService` un mapa de labels enriquecido con `customField()[pos]` y con labels encontrados en el `drawForm` activo.

## Escenario 01: Resolver labels desde drawForm

Los errores locales se recolectan con el nombre real del control Angular. Para campos dinamicos o relacionados, ese nombre puede ser `relacion_data_*`, `prefijo_data_*` u `object_*`, claves que no siempre existen en `customField()[pos]` porque este mapa viene principalmente del schema del modelo principal.

Se agrega un helper que recorre el `drawForm` resuelto por dispositivo y registra `label`, `header` o `title` por `field`. Tambien registra alias con y sin `object_` para cubrir controles ocultos de dropdown-like.

## Decisiones tomadas

- No se modifico `MessageService` ni `MessageComponent`; se conserva su contrato actual de recibir `nameEsp`.
- Se prioriza el label ya existente en `customField()[pos]` y se usa `drawForm` solo como complemento.
- Se agregan aliases `object_<field>` y `<field>` para que los dropdowns obligatorios muestren el mismo nombre visible.

## Validaciones aplicadas

- Revision del flujo `CRUD.formErrors()` -> `MessageService.changeMessage()` -> `MessageComponent`.
- Revision de que `MessageComponent` busca labels con `msg.nameEsp[field]` de forma literal.

## Notas importantes

La causa raiz era que `changeMessage` recibia solo `this.customField()[pos]`. Ese mapa no contenia necesariamente campos definidos solo en `drawForm`, por eso el toast quedaba en `Este campo es requerido.` sin prefijo de nombre.

## Archivos modificados

- `src/app/utils/crud.class.ts`

## Pendientes

Ninguno.

## Pruebas sugeridas

- En un formulario con campos `relacion_data_*` requeridos, intentar guardar vacio y verificar que el toast muestre el label configurado.
- Repetir con un dropdown requerido cuyo control invalido sea `object_relacion_data_*`.
