# PENDIENTES Y DEUDA TÉCNICA

> Documento unificado de elementos pendientes, notas técnicas sueltas y deuda acumulada.
> Consolidado a partir de marcadores `°°°`, `//QUITAR`, `//temporal`, `TODO` y comentarios sueltos
> hallados en los componentes principales.

---

## ÍNDICE

1. [Configuración de columnas en móvil](#1-configuración-de-columnas-en-móvil)
2. [Fix pendiente en backend — módulo `maintenance`](#2-fix-pendiente-en-backend--módulo-maintenance)
3. [drawForm2 desconectado en vars.class.ts](#3-drawform2-desconectado-en-varsclassts)
4. [maintenance.component.ts — código temporal a limpiar](#4-maintenancecomponentts--código-temporal-a-limpiar)
5. [crud.class.ts — pendientes técnicos](#5-crudclassts--pendientes-técnicos)
6. [crud.service.ts — método obsoleto](#6-crudservicets--método-obsoleto)
7. [custom-draw-form — buscador de evidencias](#7-custom-draw-form--buscador-de-evidencias)
8. [custom-button-footer — estilos por JS](#8-custom-button-footer--estilos-por-js)
9. [config.service.ts — herencia innecesaria y colorSelectedRow](#9-configservicets--herencia-innecesaria-y-colorselectedrow)
10. [form-cache.service.ts — detección de Electron](#10-form-cacheservicets--detección-de-electron)
11. [general.service.ts — detección de plataforma temporal](#11-generalservicets--detección-de-plataforma-temporal)
12. [vars.class.ts — resetForm deprecado e itemsRemove vacío](#12-varsclassts--resetform-deprecado-e-itemsremove-vacío)
13. [vars.class.ts — nota suelta sobre selectedColumns](#13-varsclassts--nota-suelta-sobre-selectedcolumns)

---

## 1. Configuración de columnas en móvil

**Fuente:** Sesión de análisis responsivo — formulario de mantenimiento  
**Tag:** `°°° Revisar / CONFIG`

### Problema

Al crear la configuración de un módulo en el backend (`draw.general.grid`), si se asigna
`class` directamente en `fields[fieldName]` sin sobreescribirlo en `draw.general.grid[n].class`,
el campo hereda ese ancho en **todos** los breakpoints, incluyendo móvil.

La lógica de `processDrawSection` en `auth.service.ts` aplica la siguiente prioridad:

```
resultado[key].class = draw.general.grid[n].class  (si existe)
               ↑ sino usa fields[fieldName].class
```

### Guía práctica de anchos en móvil (360 px — grid 12 columnas)

| `class`       | Ancho aprox. | Uso recomendado                                 |
|---------------|-------------|-------------------------------------------------|
| `col-span-3`  | ~90 px      | Solo iconos / botones sin texto                 |
| `col-span-4`  | ~120 px     | Código corto, toggle, campos numéricos pequeños |
| `col-span-6`  | ~180 px     | **Default** — mayoría de inputs                 |
| `col-span-8`  | ~240 px     | Inputs con label larga                          |
| `col-span-9`  | ~270 px     | Input principal destacado                       |
| `col-span-12` | 100%        | Textarea, multi-select, file upload             |

> **Regla:** Si un campo necesita más de `col-span-6` en desktop, declarar explícitamente
> `"class": "col-span-6"` en `draw.general.grid[n]` para forzar el ancho correcto en móvil,
> y usar `class_md` para el desktop (ej. `"class_md": "md:col-span-9"`).

### Pendiente al crear nueva configuración

- [ ] Siempre especificar `class` en el nodo de `draw.general.grid` (no depender del default de `fields`).
- [ ] Validar en simulador móvil (360 px) antes de publicar la config.
- [ ] Considerar que los WebViews Android/iOS pueden tener DPR alto y renderizar distinto a Chrome DevTools.

---

## 2. Fix pendiente en backend — módulo `maintenance`

**Fuente:** Análisis responsivo — campos `name2` y `maintenance_document_data_files`  
**Tag:** `CONFIG`

### Problema

Los campos `name2` (índice 3) y `maintenance_document_data_files` (índice 8) en
`draw.general.grid` del módulo `maintenance` **no declaran `class`**, por lo que heredan:

- `fields.name2.class = "col-span-9"` → demasiado ancho en móvil
- `fields.maintenance_document_data_files.class = "col-span-12"` → ocupa toda la fila

### Fix en backend

Agregar `"class": "col-span-6"` en los nodos correspondientes:

```json
"3": { "field": "name2", "class": "col-span-6" },
"8": { "field": "maintenance_document_data_files", "class": "col-span-6" }
```

- [ ] Aplicar fix en la configuración del backend
- [ ] Verificar en simulador móvil tras el cambio

---

## 3. drawForm2 desconectado en vars.class.ts

**Archivo:** `src/app/utils/vars.class.ts` — línea 443  
**Tag:** `°°° Revisar`

`drawForm2` es un `signal<any>` inicializado con configuraciones locales completas para:
`unit`, `currency`, `product-variation`, `alternate-equivalent`, `web-product`,
`asset-document`, `inventory`, `warehouse-output`.

**Problema:** Esta señal **nunca se lee en runtime**. El sistema usa `drawForm` (línea 441),
que se carga desde el servidor vía `crud.service.ts:drawForm(module)` → `authS.config[module]['draw']`.

```typescript
// vars.class.ts:441 — usada en runtime (carga desde servidor)
public drawForm = signal<any>({});

// vars.class.ts:443 — NUNCA leída, configuración local desconectada
public drawForm2 = signal<any>({ unit: {...}, currency: {...}, ... });
```

Además, dentro de `drawForm2` existe el comentario:

```typescript
//falta espesificar para los moviles
```

en los nodos `dialog` de cada módulo (sin altura específica para móvil).

### Opciones pendientes

- [ ] **Opción A:** Conectar `drawForm2` como fallback cuando el servidor no devuelve config para el módulo.
- [ ] **Opción B:** Mover los valores de `drawForm2` al backend para cada módulo y eliminar la señal.
- [ ] **Opción C:** Eliminar `drawForm2` si ya no se va a usar (confirmar con el equipo).
- [ ] Definir los valores de `dialog.height` para móvil en cada módulo de `drawForm2`.

---

## 4. maintenance.component.ts — código temporal a limpiar

**Archivo:** `src/app/assets/maintenance/maintenance.component.ts`  
**Tag:** `°°° / //QUITAR / //temporal`

### Imports marcados para quitar (línea 36)

```typescript
//QUITAR
TagModule,
TableModule,
ToastModule,
ButtonModule,
InputTextModule,
```

Estos módulos están importados pero no son necesarios en el componente final (ya están en `PRIME_MODULES` o `LOCAL_BASE`).

### Código temporal de notas (línea 164)

```typescript
//°°°temporal notas
getInitials(user: string | null): string { ... }
```

Función auxiliar para avatares de chat/notas. No está integrada a ningún diseño definitivo.

### Código temporal de instalaciones (línea 179)

```typescript
//°°°Temporal instalaciones
dealogInstalacionesVisible = false
desecho() { this.dealogInstalacionesVisible = true; }
```

Dialog de instalaciones en prototipo. Sin template ni lógica definitiva.

### Override temporal de onSelection (línea 186)

```typescript
//temporal
override onSelection(event: any[]) {
  super.onSelection(event);
  this.startMenu().push({ label: 'Instalaciones', command: () => this.desecho() });
}
```

Agrega una opción "Instalaciones" al menú de inicio de forma hardcodeada. Temporal hasta definir la arquitectura del módulo.

### type comentado (línea sin número exacto)

```typescript
//this.type['maintenance-document-maintenance'] = 'maintenance-document'
```

Tipo de recurso JSON:API para el subdocumento comentado. Revisar si es necesario descomentarlo cuando el flujo de documentos de mantenimiento esté completo.

### Error pendiente en campo de archivos (línea 109)

```typescript
//°°° falta solucionar el errore para que acepte el array de files
```

El campo de archivos en el formulario de mantenimiento no acepta correctamente un array de files. Relacionado con el campo `maintenance_document_data_files`.

---

## 5. crud.class.ts — pendientes técnicos

**Archivo:** `src/app/utils/crud.class.ts`

### 5.1 — Parche `quitar temporal is_active` (línea 368)

```typescript
//quitar temporal is_active
//this.filter = this.crudS.buildFilterString(this.crudS.fieldsForm(pos));
```

Filtro automático desde configuración del servidor comentado. Revisar si `buildFilterString` ya funciona correctamente y habilitar.

### 5.2 — Documentos no se pasan al crear nuevo elemento (línea 4000)

```typescript
//aqui voy, falta pasar el nuevo elemento creado a documentos, tambien el edit
```

Al crear un nuevo elemento secundario (relación hija), los documentos adjuntos
no se vinculan automáticamente al nuevo registro. El flujo de edición tiene el mismo problema.

### 5.3 — isShowDocumentsTab debe limpiarse (línea 4124)

```typescript
// aqui voy debo quitar el documernts
isShowDocumentsTab = signal<any[]>([]);
```

La señal y el método `onTabChange` cargan documentos al cambiar a la pestaña 4 (hardcodeada).
Debe refactorizarse para que el índice de la pestaña de documentos sea dinámico y no hardcodeado.

### 5.4 — fields `object_` en flattenFormData (línea 5028)

```typescript
//aqui voy debo establecer el mismo proceso para los campos que inician en object_
```

En `_flattenFormData`, los campos `object_*` de tipo dropdown dentro de `form_data` 
no están siendo procesados con el mismo flujo que los campos regulares.

### 5.5 — Diálogo de preferencias importación/exportación (línea 4216)

```typescript
//°°° DEBE HABER UN DIALOGO QUE INDICA LAS PREFERENCIAS DE EXPORTACION/IMPORTACION?
```

Al exportar/importar datos, falta un diálogo de preferencias (formato, columnas a incluir, etc.).
El código de los ítems de menú de importar/exportar está comentado esperando esta funcionalidad.

### 5.6 — °°°PROBANDO en read_only (línea 1964)

```typescript
if (fieldObj.read_only) {
  //°°°PROBANDO
  //continue;
}
```

Campos `read_only` del servidor se deshabilitan pero no se excluyen del FormGroup.
Hay un `continue` comentado que los excluiría. Decidir si excluirlos o mantenerlos deshabilitados.

### 5.7 — documents en grid (línea 2067)

```typescript
//°°°aqui caen los documents deberia llamar a la configuración y agregar elementos por documents_ y algo
```

Los campos de tipo `documents_*` deberían procesarse con lógica de configuración similar a `fields_prefixes`,
pero actualmente se manejan como campos genéricos.

### 5.8 — default_field no implementado (línea 2160)

```typescript
//°°°aqui deberia implementar 'default_field': 'name'
```

En la resolución de relaciones para el formulario, falta implementar `default_field`
para que use un campo específico (ej. `name`) al mostrar el valor seleccionado.

### 5.9 — additionalFieldsAppCols deprecado (línea 5192)

```typescript
/*°°°realmente esta pensado para el productos o campos que tiene el mismo principio, debo deprecarlo
  ya que cols de la configuración ya hace eso*/
```

El parámetro `additionalFieldsAppCols` de `DJAtoObject` ya está obsoleto;
la configuración `cols` del servidor cubre esa funcionalidad. Programar su eliminación.

### 5.10 — TODOs en métodos stub (líneas 5114–5173)

```
// TODO: Agregar lógica para crear nuevo registro
// TODO: Mostrar mensaje de error al usuario
// TODO: Agregar lógica para actualizar registro existente
// TODO: Agregar confirmación antes de eliminar
// TODO: Agregar lógica para eliminar registro
// TODO: Agregar lógica adicional después de resetear
// TODO: Agregar lógica para cancelar y volver al estado anterior
// TODO: Agregar lógica de búsqueda
```

Métodos stub sin implementación real. Verificar si son hooks para sobrescribir en subclases
o código pendiente de implementar en la clase base.

---

## 6. crud.service.ts — método obsoleto

**Archivo:** `src/app/utils/services/crud.service.ts` — línea 523  
**Tag:** `°°°`

```typescript
/** °°°SE TIENE QUE ELIMINAR Y CAMBIAR POR GETOBJECT
 * Consulta al servidor los datos.
 * ...
```

El método `get` (o equivalente) debe ser reemplazado por `getObject`.
Identificar todos los usos del método obsoleto y migrarlos antes de eliminar.

También en líneas 634 y 663:

```typescript
//°°°DEL FILTER NO ESTOY SEGURO
```

La construcción del string de `filter` en las consultas no está completamente validada.
Revisar los casos donde `filter` puede generar parámetros incorrectos.

---

## 7. custom-draw-form — buscador de evidencias

**Archivo:** `src/app/components/custom-draw-form/custom-draw-form.component.html` — línea 629  
**Tag:** `°°° / TODO`

Comentario dentro del template:

```html
<!-- quitar el > 10
  necesito 2 modificaciones:
  1. El buscador de evidencias debe ocupar todo el ancho del contenedor.
     Cuando escribes debe aparecer que está buscando.
     En lugar de mostrar el ID debe mostrar el nombre del archivo.
  2. ...
-->
<div *ngIf="fileSearchFields().length > 10" ...>
```

- [ ] Quitar la condición `> 10` (el buscador no se muestra nunca en práctica).
- [ ] Buscador de evidencias: ancho 100% del contenedor.
- [ ] Mostrar indicador de carga mientras busca.
- [ ] Mostrar nombre del archivo en lugar del ID.

---

## 8. custom-button-footer — estilos por JS

**Archivo:** `src/app/components/custom-button-footer/custom-button-footer.component.html` — línea 42  
**Tag:** `°°°`

```html
<!--°°°no funciona los stylo por eso lo hago con js, no estoy seguro con esta solucion
porque no se si es la mejor que hay un observable-->
```

Los estilos de visibilidad de botones se manejan con JS porque los estilos CSS no funcionaban.
Revisar si con la versión actual de PrimeNG/Angular se puede resolver con clases Tailwind o
variables CSS en lugar del enfoque JS.

---

## 9. config.service.ts — herencia innecesaria y colorSelectedRow

**Archivo:** `src/app/auth/services/config.service.ts` — líneas 16, 44  
**Tag:** `°°°`

### Herencia de GeneralService

```typescript
// °°° no deberia de heredar de GeneralService para evitar redundancia ya que estos
// servicios (GeneralService y ConfigService) son llamados en crud.service.ts
```

`ConfigService` extiende `GeneralService`, lo que crea dependencia circular potencial
dado que ambos se usan en `CrudService`.

### colorSelectedRow sin configuración

```typescript
// °°° DEBIDO A LO PESADO QUE ES LLAMAR A LA FUNCIÓN POR CADA LINEA DEBE SER
// POR CONFIGURACIÓN POR DEFECTO DESHABILITADO
colorSelectedRow(...): boolean { ... }
```

La función `colorSelectedRow` se llama por cada fila de la tabla (O(n) por render).
Debe deshabilitarse por default y habilitarse solo cuando el módulo lo requiera explícitamente.

---

## 10. form-cache.service.ts — detección de Electron

**Archivo:** `src/app/utils/services/form-cache.service.ts` — línea 79  
**Tag:** `TODO`

```typescript
// TODO: detectar Electron como 'desktop' cuando se requiera
```

La detección de plataforma (`mobile` / `web`) no contempla Electron.
Si se va a soportar como app de escritorio, agregar la rama de detección.

---

## 11. general.service.ts — detección de plataforma temporal

**Archivo:** `src/app/utils/services/general.service.ts` — línea 767  
**Tag:** `//temporal`

```typescript
//es temporal, hasta que tenga una forma mejor de detectar si es desktop o web
```

El método `isMobile()` usa una heurística provisional. Cuando se implemente detección
robusta de plataforma (Capacitor `Device`, User-Agent, etc.) actualizar aquí.

---

## 12. vars.class.ts — resetForm deprecado e itemsRemove vacío

**Archivo:** `src/app/utils/vars.class.ts`  
**Tag:** `°°° DEPRECADO`

### resetForm (línea 210)

```typescript
//°°° DEPRECADO
public resetForm: any[] = [{ name: '', description: '', ... }]
```

`resetForm` fue reemplazado por el mecanismo de valores por defecto del servidor (`default.value`).
Verificar que ningún componente lo use y eliminar.

### itemsRemove (línea 200)

```typescript
public itemsRemove: string[][] = [
  //ya no son necesarios, el servidor tra una bandera que dice si se muestra o no
];
```

Array vacío que antes contenía campos a excluir de la tabla. El servidor ahora controla
la visibilidad. Confirmar si el array puede eliminarse o si algún componente lo sobrescribe.

### déberian venir del servidor (línea 196)

```typescript
/*°°° deberian venir del servidor por ejemplo: ['id', 'description', 'sys_data'] */
```

Los campos por defecto de `itemsRemove` deberían configurarse desde el servidor.
Queda pendiente cuando se revise la configuración de columnas por módulo.

---

## 13. vars.class.ts — nota suelta sobre selectedColumns

**Archivo:** `src/app/utils/vars.class.ts` — línea 1582  
**Tag:** `°°° / |||`

```
°°° Tengo que revisar porque los @Input de selectedColumns se llaman muchas veces cuando cargo datos.

- Los botones de delete y edit no tienen la opción de splitButton porque para que un registro
  se pueda eliminar o editar necesita estar visible en la tabla.

||| DECIDÍ QUE LAS CONSULTAS SE DEBEN REALIZARSE EN BASE A LAS COLUMNAS QUE SE MUESTRAN,
    EN LUGAR DE TODOS LOS CAMPOS, Y CUANDO EDITE SE CONSULTE AL SERVIDOR CON TODOS LOS DATOS.
    Ventaja: la consulta al servidor trae menos datos; evita ciclos extra para formatear campos.
    Desventaja: se hace una consulta adicional por cada edición, y se debe recargar datos al
    agregar un nuevo campo visible.
```

Decisión de arquitectura ya tomada (`|||`) pero con nota de revisión pendiente (`°°°`):
- [ ] Investigar por qué `selectedColumns` dispara múltiples cambios al cargar datos.
- [ ] Evaluar si el patrón actual de consulta (por columnas visibles + GET en edición) está
  completamente implementado o si hay módulos que aún consultan todos los campos.

---

## RESUMEN DE PRIORIDADES

| # | Elemento | Impacto | Urgencia |
|---|----------|---------|----------|
| 2 | Fix backend `maintenance` (`col-span-6`) | Visual / UX | Alta |
| 5.2 | Documentos no se pasan al crear | Funcional | Alta |
| 5.3 | `onTabChange` tab index hardcodeado | Funcional | Media |
| 4 | Limpieza código temporal maintenance | Deuda técnica | Media |
| 6 | Reemplazar método obsoleto `get` | Arquitectura | Media |
| 3 | Decidir futuro de `drawForm2` | Arquitectura | Media |
| 7 | Buscador de evidencias | UX | Baja |
| 1 | Guía col-span aplicada en nuevas configs | Proceso | Baja |
| 12 | Eliminar `resetForm` deprecado | Limpieza | Baja |
