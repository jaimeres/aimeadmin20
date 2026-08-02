# `option_label` manda también sobre relaciones anidadas

- Fecha: 2026-07-31
- Consecutivo: 035
- Tipo: Corrección funcional

## Resumen

`DJAtoObject` resolvía la etiqueta de una relación (`<campo>__name`) leyendo
**sólo los atributos propios del recurso incluido**. Si `option_label` nombraba
una clave `<relación>_data_<atributo>` —es decir, un dato que vive una relación
más adentro— esa clave quedaba `undefined`, la etiqueta salía vacía y parecía
que el fallback `username || name` era la única vía.

El resolvedor de ese contrato **ya existía** en el mismo servicio
(`_applyRelationDataFields`, el que usan las sugerencias de autocomplete). El
aplanado de filas simplemente no lo usaba: código anterior que no se reunificó.

## Escenario 01: cuándo manda cada cosa

El orden real, verificado con pruebas:

```text
1. Se construye una REGLA por campo, sólo si `fields[campo].option_label` existe
   Y (para no tree/multi) NO es exactamente 'name' ni 'display_name'.
   Esos dos se saltan a propósito: ya son el fallback.

2. Con regla    -> `option_label` decide. Se leen sus claves del recurso
                   incluido; varias claves se concatenan con espacio.

3. Sin regla    -> fallback `inc.attributes.username || inc.attributes.name || ''`.
```

O sea: **`option_label` siempre manda cuando está declarado**. El fallback no
compite con él, sólo cubre el caso de que no haya nada declarado.

Lo que fallaba era el paso 2 cuando la clave era `<relación>_data_<atributo>`.

## Escenario 02: la corrección

En la rama FK de `DJAtoObject`, antes de aplicar la regla, el recurso incluido
se enriquece con el mismo resolvedor compartido:

```ts
const source = { id: inc.id, ...inc.attributes, relationships: inc.relationships };
this._applyRelationDataFields(source, included, lfRule.option_label_join || []);
this._applyLabelField(temp, lfRule, source);
```

Conservar `relationships` es la pieza que faltaba: de ahí cuelga la relación
anidada que `_applyRelationDataFields` sigue hasta `included`.

### Caso que lo motivó

`ProductByUserSerializer` excluye `name` y `code` a propósito: la etiqueta de un
producto vive en `base_product`. Con `option_label: "base_product_data_name"` e
`include=product.base_product`, la celda ahora muestra `DIESEL` en vez de vacío.

## Escenario 03: qué NO se tocó

La rama M2M de `DJAtoObject` tiene el mismo patrón (`_applyLabelField` sobre
`inc.attributes` sin enriquecer) y por tanto la misma limitación. **No se
modificó**: ninguna configuración actual la necesita y tocarla afectaría a todos
los listados con relaciones múltiples. Queda reportado como hallazgo.

## Validaciones aplicadas

- `npx ng test --watch=false --browsers=ChromeHeadless`: 131 aprobadas frente a
  127 de línea base; las mismas 55 fallas preexistentes de scaffolding.
- Las 4 pruebas nuevas prueban el contrato completo, no sólo el caso feliz:
  - `option_label` con relación anidada resuelve la etiqueta;
  - varias claves de `option_label` se concatenan;
  - sin `option_label` cae al fallback y queda vacío (el bug anterior);
  - `option_label: 'name'` se ignora a propósito y usa el fallback.
- `npx tsc --noEmit`: sin errores nuevos (5 preexistentes en
  `biometric-setup.component.ts`).

## Archivos modificados

- `src/app/utils/services/general.service.ts`
- `src/app/utils/services/general.service.spec.ts`
- `docs/documents/2026-07-31-035-option-label-relacion-anidada.md`

## Pendientes

1. Decidir si la rama M2M debe compartir el mismo enriquecimiento.
2. `_applyLabelField` sigue leyendo `src[key]` crudo; podría delegar en
   `resolveRelationDataValue` para cubrir también las formas `<rel>_data: {...}`
   y `<rel>: {...}` sin depender del enriquecimiento previo.
