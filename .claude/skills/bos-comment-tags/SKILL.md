---
name: bos-comment-tags
description: "Etiquetas de documentación, mantenimiento y trazabilidad del BOS: DOCUM, TEST, SOLUCIONADO, CONFIG, |||, °°°, [[[II y ]]]FI. Activar cuando se lean o escriban comentarios de mantenimiento, pendientes, documentación técnica o cuando una tarea implique cambios funcionales de código que requieran trazabilidad documental en docs/documents."
---

# BOS Comment Tags Skill

## Objetivo

Este skill define cómo marcar comentarios, pendientes, documentación técnica y cambios de código realizados o modificados por IA, Copilot o cualquier LLM dentro del BOS.

La finalidad es mantener trazabilidad real sin ensuciar innecesariamente el código ni generar documentación inútil por cada ajuste menor.

---

## Uso de etiquetas generales

- `|||` marca algo que requiere atención especial, una decisión importante o un criterio ya definido.
- `°°° Revisar` marca algo pendiente de revisión.
- `DOCUM` indica que también debe quedar documentado en la API o documentación técnica.
- `TEST` indica que también debe cubrirse o documentarse en pruebas.
- `SOLUCIONADO` indica que el comentario, pendiente o problema ya fue resuelto.
- `CONFIG` indica que la solución requiere incluir configuración.
- `[[[II` marca el inicio de un bloque de código nuevo o modificado por IA, Copilot o cualquier LLM.
- `]]]FI` marca el fin de un bloque de código nuevo o modificado por IA, Copilot o cualquier LLM.

---

## Regla principal para cambios hechos por IA

Cuando la IA escriba o modifique código relevante, el bloque modificado debe estar delimitado con los marcadores `[[[II` y `]]]FI` como comentarios propios del lenguaje.

Esto aplica a cambios funcionales, de negocio, seguridad, permisos, autenticación, inventario, costos, configuración crítica, validaciones importantes, integraciones, serializadores, vistas, servicios, modelos, señales, tareas, rutas o cualquier cambio que pueda afectar el comportamiento del sistema.

No se deben usar marcadores para cambios triviales, mecánicos o cosméticos, salvo que formen parte de un cambio funcional ya documentado.

---

## Qué se considera cambio funcional

Se considera cambio funcional cualquier modificación que altere el comportamiento del sistema, por ejemplo:

- Crear o modificar modelos.
- Crear o modificar servicios.
- Crear o modificar validaciones.
- Cambiar permisos.
- Cambiar reglas de negocio.
- Cambiar serializadores, vistas o endpoints.
- Cambiar flujos de inventario, costos, documentos, aprobaciones o auditoría.
- Cambiar configuraciones que afecten la operación.
- Agregar integraciones.
- Corregir errores que afectaban datos, seguridad o comportamiento.
- Agregar lógica nueva aunque sea pequeña.

---

## Qué NO requiere trazabilidad documental nueva

No crear un documento nuevo de trazabilidad para cambios menores como:

- Corrección de typos.
- Ajustes de formato.
- Reordenamiento de imports.
- Cambios de nombres sin impacto funcional.
- Correcciones menores de lint.
- Ajustes de comentarios sin cambio de lógica.
- Cambios derivados del mismo objetivo funcional ya documentado.
- Ajustes pequeños solicitados después de una implementación principal.

Si estos cambios pertenecen a un cambio funcional ya documentado, se debe reutilizar el documento existente.

---

## Regla estricta contra documentos duplicados

Antes de crear cualquier archivo nuevo en `docs/documents/`, se debe buscar documentación existente relacionada con el mismo flujo, componente, servicio, bug o unidad funcional.

La búsqueda debe considerar, como mínimo:

- Slugs y palabras clave del cambio.
- Nombre del componente, servicio o módulo afectado.
- Tipo de control o flujo funcional afectado.
- Documentos anteriores aunque tengan otra fecha.

Si existe documentación relacionada, NO crear un `.md` nuevo. Se debe actualizar el documento existente.

Si existen varios documentos relacionados o duplicados, se debe usar el documento más viejo como fuente principal, sin importar la fecha actual. El contenido útil de documentos más recientes debe migrarse o resumirse en el documento más viejo cuando sea necesario.

Las referencias de código y comentarios deben apuntar al documento más viejo conservado. No se deben agregar referencias a documentos duplicados o recién creados cuando ya existe uno anterior aplicable.

Si durante la tarea se creó por error un documento nuevo duplicado, se debe quitar ese documento y mover la documentación útil al documento más viejo aplicable, siempre que el documento nuevo haya sido creado por la IA en la misma tarea.

---

## Trazabilidad documental obligatoria de cambios funcionales

Cuando una tarea implique un cambio funcional de código, se debe crear o actualizar un documento de trazabilidad en:

`docs/documents/`

La regla correcta no es “un documento por cada prompt”.

La regla correcta es:

> Un documento por cambio funcional, ticket, tarea o unidad lógica de trabajo.

Si una solicitud posterior continúa, corrige, ajusta o amplía el mismo cambio funcional, se debe actualizar el documento existente, agregando un nuevo escenario, nota o sección. No se debe crear un documento nuevo innecesario.

---

## Archivo de trazabilidad

### Cuándo crear un archivo nuevo

Crear un archivo nuevo solo cuando exista una unidad funcional nueva y se haya confirmado que no existe documentación anterior relacionada.

Ejemplos:

- Crear módulo de conversaciones.
- Implementar permisos secundarios para relaciones.
- Agregar flujo de inventario asignado.
- Corregir una falla de seguridad.
- Cambiar la lógica de costos.
- Agregar integración con un servicio externo.
- Crear una configuración nueva de app.

### Cuándo reutilizar un archivo existente

Reutilizar el documento existente cuando:

- El usuario pide corregir algo de la misma implementación.
- Se agrega un campo menor al mismo flujo.
- Se ajusta una validación del mismo cambio.
- Se cambia el nombre de algo dentro de la misma tarea.
- Se corrige un bug encontrado durante la misma unidad funcional.
- El cambio es una continuación clara de un documento anterior.
- Existe cualquier documento anterior sobre el mismo componente, servicio, control, flujo o bug, aunque tenga otra fecha o un consecutivo más viejo.
- El cambio toca una implementación ya documentada y solo agrega un escenario nuevo.

---

## Nombre del archivo

El archivo debe seguir el patrón:

`YYYY-MM-DD-NNN-slug-del-cambio.md`

Donde:

- `YYYY-MM-DD` es la fecha actual de trabajo.
- `NNN` es un consecutivo de 3 dígitos.
- `slug-del-cambio` resume el cambio en pocas palabras.

Ejemplo:

`2026-05-15-001-conversaciones-modulo.md`

Antes de crear el archivo, se deben revisar los archivos existentes en `docs/documents/` para determinar el siguiente consecutivo disponible.

Si no se puede confirmar el consecutivo porque el contexto disponible es incompleto, se debe usar el consecutivo más probable y dejar una nota dentro del documento indicando que debe verificarse.

---

## Contenido mínimo del documento de trazabilidad

Cada documento debe incluir como mínimo:

1. Nombre del cambio.
2. Fecha.
3. Consecutivo.
4. Tipo: `Cambio funcional`.
5. Resumen fiel de lo pedido por el usuario.
6. Alcance del cambio.
7. Escenarios numerados.
8. Decisiones tomadas.
9. Validaciones aplicadas.
10. Notas importantes.
11. Archivos modificados.
12. Pendientes, si existen.
13. Pruebas sugeridas o necesarias, si aplica.

---

## Escenarios

Los escenarios sirven para separar motivos funcionales dentro del mismo cambio.

Usar escenarios cuando un mismo documento incluya más de una razón de cambio.

Ejemplo:

```md
## Escenario 01: Crear estructura base de conversaciones

## Escenario 02: Ocultar texto de mensajes eliminados

## Escenario 03: Agregar permisos de auditoría para ver mensajes eliminados
```

Si varios bloques de código responden al mismo motivo funcional, pueden compartir el mismo escenario.

Si la solicitud tiene motivos distintos o partes claramente separadas, se deben separar en escenarios diferentes.

---

## Referencia obligatoria dentro del código

Cada bloque funcional nuevo o modificado por IA debe llevar referencia al documento y al escenario junto con `[[[II`.

Formato recomendado:

```txt
ESC:001-01 DOC:docs/documents/2026-05-15-001-mi-cambio.md#escenario-01
```

Donde:

- `ESC:001-01` significa documento `001`, escenario `01`.
- `DOC:` apunta al archivo de trazabilidad y al ancla del escenario.
- Si el editor no convierte la ruta en enlace clicable, se deja de todos modos la ruta exacta en texto plano.

---

## Sintaxis según lenguaje

### Python

```python
# [[[II ESC:001-01 DOC:docs/documents/2026-05-15-001-mi-cambio.md#escenario-01
def mi_funcion():
    pass
# ]]]FI
```

### JavaScript / TypeScript

```typescript
// [[[II ESC:001-01 DOC:docs/documents/2026-05-15-001-mi-cambio.md#escenario-01
function miFuncion() {
  return true;
}
// ]]]FI
```

### YAML

```yaml
# [[[II ESC:001-01 DOC:docs/documents/2026-05-15-001-mi-cambio.md#escenario-01
mi_clave: valor
# ]]]FI
```

### Markdown

```md
<!-- [[[II ESC:001-02 DOC:docs/documents/2026-05-15-001-mi-cambio.md#escenario-02 -->
Texto nuevo o modificado.
<!-- ]]]FI -->
```

---

## Reglas para delimitar bloques

- Si se agrega código nuevo dentro de un bloque existente, delimitar solo el fragmento nuevo.
- Si se modifica una función completa por razones funcionales, delimitar la función completa.
- Si se modifica una clase completa por razones funcionales, delimitar la clase completa.
- Si el cambio es puntual dentro de una función grande, delimitar solo el fragmento modificado.
- Los marcadores deben ir en su propia línea.
- Los marcadores deben ser comentarios independientes.
- No anidar marcadores.
- Si hay código nuevo dentro de otro bloque nuevo, basta con los marcadores del bloque externo.
- No marcar archivos completos salvo que el archivo completo sea nuevo o haya sido reestructurado funcionalmente.

---

## Cambios críticos

En cambios críticos, los marcadores y la trazabilidad documental son obligatorios.

Se consideran críticos los cambios relacionados con:

- Permisos.
- Seguridad.
- Autenticación.
- Autorización.
- Auditoría.
- Inventario.
- Costos.
- Facturación.
- Movimientos de stock.
- Borrado lógico.
- Evidencias.
- Aprobaciones.
- Integridad de datos.
- Multi-tenant.
- Configuración dinámica.
- Integraciones externas.
- Procesos financieros o fiscales.

Si hay duda entre documentar o no documentar un cambio crítico, se debe documentar.

---

## Cambios menores dentro de un cambio funcional

Si un cambio menor forma parte de una tarea funcional mayor, no crear documento nuevo.

En su lugar:

- Reutilizar el documento existente.
- Agregar una nota si el ajuste es relevante.
- Usar el mismo escenario si pertenece al mismo motivo funcional.
- Crear un escenario nuevo solo si el ajuste representa una decisión o comportamiento diferente.

---

## Comentarios existentes

Cuando se encuentre un comentario con:

- `°°° Revisar`
- `|||`
- `DOCUM`
- `TEST`
- `CONFIG`

La IA debe respetarlo y no eliminarlo sin justificación.

Si el comentario queda resuelto por el cambio, se puede marcar como `SOLUCIONADO`, pero no debe borrarse automáticamente si forma parte de la trazabilidad histórica.

---

## Limpieza de código

La trazabilidad no debe convertir el código en basura visual.

Por eso:

- No agregar marcadores en cambios irrelevantes.
- No crear documentos por cada prompt.
- No duplicar escenarios sin necesidad.
- No repetir el mismo resumen en muchos archivos.
- No marcar bloques enormes si solo cambió una línea puntual.
- No usar los marcadores como sustituto de buenos nombres, buenas pruebas o buena documentación.

---

## Regla para este propio skill

No marcar el propio archivo del skill con `[[[II` y `]]]FI`, salvo dentro de ejemplos de sintaxis.

Este archivo define la regla, pero no debe ensuciarse con su propia trazabilidad interna.

---

## Criterio final

La trazabilidad debe ayudar a responder estas preguntas:

1. ¿Qué se cambió?
2. ¿Por qué se cambió?
3. ¿Qué pidió el usuario?
4. ¿Qué escenario funcional cubre?
5. ¿Qué archivos fueron tocados?
6. ¿Qué debe probarse?
7. ¿Qué parte fue escrita o modificada por IA?

Si la marca o el documento no ayudan a responder eso, probablemente no deberían agregarse.
