# Componente Table - Guía de Implementación

## Descripción
Se ha implementado un nuevo tipo de componente `table` en el sistema de formularios dinámicos que permite renderizar tablas editables con PrimeNG Table.

## Configuración del Componente

### Estructura Básica
```json
{
  "class": "col-span-12",
  "class_md": "md:col-span-12",
  "field": "parent_form_data_PARTICIPANTES",
  "type": "table",
  "label": "PARTICIPANTES",
  "required": true,
  "hide": false,
  "readonly": false,
  "autofocus": false,
  "default": {
    "active": true,
    "value": [],
    "edit": true
  },
  "table_config": {
    "initial_rows": 3,
    "editable": true,
    "add_row": true,
    "delete_row": true,
    "sort": true,
    "filter": false,
    "export": false,
    "selection_mode": "single",
    "show_grid_lines": true,
    "striped_rows": true,
    "responsive_layout": "scroll",
    "paginator": false,
    "allow_editing": true,
    "row_number": true,
    "frozen_rows": {
      "top": 0,
      "bottom": 0
    },
    "frozen_columns": {
      "left": 0,
      "right": 0
    },
    "column_groups": [],
    "row_group": {
      "field": "",
      "header": false
    },
    "row_span": {
      "expandable": false,
      "template": ""
    },
    "column_resizing": true
  },
  "columns": [
    {
      "field": "nombre",
      "header": "NOMBRE",
      "type": "input-text",
      "sortable": true,
      "editable": true,
      "required": true,
      "width": "40%",
      "validation": {
        "max_length": 100,
        "min_length": 2
      },
      "tag": {
        "active": true,
        "type": "uppercase",
        "severity": "info"
      },
      "hide": false
    },
    {
      "field": "empresa",
      "header": "EMPRESA",
      "type": "input-text",
      "sortable": true,
      "editable": true,
      "required": true,
      "width": "35%",
      "validation": {
        "max_length": 100,
        "min_length": 2
      },
      "hide": false
    },
    {
      "field": "cargo",
      "header": "CARGO",
      "type": "input-text",
      "sortable": true,
      "editable": true,
      "required": true,
      "width": "25%",
      "validation": {
        "max_length": 100,
        "min_length": 2
      },
      "hide": false
    }
  ]
}
```

## Propiedades de Configuración

### `default`
Configuración de valores por defecto del componente:
- **`active`**: (boolean) Si el componente está activo
- **`value`**: (array) Valores iniciales de la tabla (array de objetos)
- **`edit`**: (boolean) Si permite edición

### `table_config`
- **`initial_rows`**: Número de filas iniciales a crear
- **`editable`**: Si la tabla permite edición
- **`add_row`**: Mostrar botón para agregar filas
- **`delete_row`**: Mostrar botón para eliminar filas
- **`sort`**: Habilitar ordenamiento
- **`filter`**: Habilitar filtros (no implementado aún)
- **`export`**: Habilitar exportación (no implementado aún)
- **`selection_mode`**: Modo de selección ("single", "multiple", null)
- **`show_grid_lines`**: Mostrar líneas de la grilla
- **`striped_rows`**: Filas rayadas
- **`responsive_layout`**: Layout responsivo ("scroll", "stack")
- **`paginator`**: Habilitar paginación
- **`row_number`**: Mostrar columna de número de fila
- **`column_resizing`**: Permitir redimensionar columnas
- **`frozen_rows`**: (object) Filas congeladas (pendiente implementación)
  - `top`: (number) Número de filas congeladas en la parte superior
  - `bottom`: (number) Número de filas congeladas en la parte inferior
- **`frozen_columns`**: (object) Columnas congeladas (pendiente implementación)
  - `left`: (number) Número de columnas congeladas a la izquierda
  - `right`: (number) Número de columnas congeladas a la derecha
- **`column_groups`**: (array) Agrupación de columnas (pendiente implementación)
  - Array de objetos con `header` (string) y `columns` (array de strings)
- **`row_group`**: (object) Agrupación de filas (pendiente implementación)
  - `field`: (string) Campo por el cual agrupar
  - `header`: (boolean) Si mostrar cabecera de grupo
- **`row_span`**: (object) Expansión de filas (pendiente implementación)
  - `expandable`: (boolean) Si las filas son expandibles
  - `template`: (string) Nombre de la plantilla para el detalle

### Configuración de Columnas
Cada columna tiene las siguientes propiedades:

- **`field`**: Nombre del campo en los datos
- **`header`**: Título de la columna
- **`type`**: Tipo de input ("input-text", más tipos pendientes)
- **`sortable`**: Si la columna es ordenable
- **`editable`**: Si la columna es editable
- **`required`**: Si el campo es requerido
- **`width`**: Ancho de la columna
- **`hide`**: Ocultar la columna
- **`validation`**: Validaciones del campo
  - `max_length`: Longitud máxima
  - `min_length`: Longitud mínima
- **`tag`**: Configuración para mostrar valores como tags
  - `active`: Si los tags están activos
  - `type`: Tipo de transformación ("uppercase", "lowercase", "capitalize", "capitalize-words", "none")
  - `severity`: Severidad del tag ("info", "success", "warning", "danger")

## Eventos Disponibles

El componente emite los siguientes eventos:

- **`onTableRowSelect`**: Cuando se selecciona una fila
- **`onTableRowUnselect`**: Cuando se deselecciona una fila
- **`onTableAddRow`**: Cuando se agrega una nueva fila
- **`onTableEditRow`**: Cuando se edita una fila
- **`onTableDeleteRow`**: Cuando se elimina una fila
- **`onTableCellEdit`**: Cuando se edita una celda

## Integración con FormGroup

Los datos de la tabla se almacenan automáticamente en el `FormControl` correspondiente al campo especificado. El valor es un array de objetos donde cada objeto representa una fila de la tabla.

Ejemplo de estructura de datos:
```javascript
[
  {
    "nombre": "JUAN PÉREZ",
    "empresa": "EMPRESA ABC",
    "cargo": "GERENTE"
  },
  {
    "nombre": "MARÍA GARCÍA",
    "empresa": "EMPRESA XYZ",
    "cargo": "ANALISTA"
  }
]
```

## Valores por Defecto de Campos Vacíos

### `default`
Valores por defecto que debe contener:
```json
{
  "default": {
    "active": true,      // (boolean) Componente activo
    "value": [],         // (array) Datos iniciales de la tabla
    "edit": true         // (boolean) Permite edición
  }
}
```

### `frozen_rows`
Valores por defecto para filas congeladas:
```json
{
  "frozen_rows": {
    "top": 0,      // (number) Filas congeladas arriba (0 = ninguna)
    "bottom": 0    // (number) Filas congeladas abajo (0 = ninguna)
  }
}
```

### `frozen_columns`
Valores por defecto para columnas congeladas:
```json
{
  "frozen_columns": {
    "left": 0,     // (number) Columnas congeladas a la izquierda (0 = ninguna)
    "right": 0     // (number) Columnas congeladas a la derecha (0 = ninguna)
  }
}
```

### `column_groups`
Valores por defecto para agrupación de columnas:
```json
{
  "column_groups": []    // (array) Array vacío = sin agrupación
}
```

Ejemplo con valores:
```json
{
  "column_groups": [
    {
      "header": "Datos Personales",    // (string) Título del grupo
      "columns": ["nombre", "edad"]    // (array) Campos que pertenecen al grupo
    },
    {
      "header": "Datos Laborales", 
      "columns": ["empresa", "cargo"]
    }
  ]
}
```

### `row_group`
Valores por defecto para agrupación de filas:
```json
{
  "row_group": {
    "field": "",        // (string) Campo por el cual agrupar (vacío = sin agrupación)
    "header": false     // (boolean) Mostrar cabecera de grupo
  }
}
```

Ejemplo con valores:
```json
{
  "row_group": {
    "field": "empresa",    // Agrupar por campo empresa
    "header": true         // Mostrar cabecera del grupo
  }
}
```

### `row_span`
Valores por defecto para expansión de filas:
```json
{
  "row_span": {
    "expandable": false,   // (boolean) Filas expandibles
    "template": ""         // (string) Plantilla para el detalle (vacío = sin plantilla)
  }
}
```

Ejemplo con valores:
```json
{
  "row_span": {
    "expandable": true,         // Habilitar expansión
    "template": "detail_row"    // Nombre de la plantilla de detalle
  }
}
```

## Campos Pendientes de Implementación

## Uso en el Componente Padre

```typescript
// En el componente padre
export class MiComponente {
  formGroup: FormGroup;
  drawForm: any;

  constructor(private fb: FormBuilder) {
    this.formGroup = this.fb.group({
      parent_form_data_PARTICIPANTES: this.fb.control([])
    });

    this.drawForm = {
      grid: {
        1: {
          // Configuración de la tabla aquí
        }
      }
    };
  }

  onTableRowSelect(event: any) {
    console.log('Fila seleccionada:', event);
  }

  onTableAddRow(event: any) {
    console.log('Fila agregada:', event);
  }

  onTableDeleteRow(event: any) {
    console.log('Fila eliminada:', event);
  }

  onTableCellEdit(event: any) {
    console.log('Celda editada:', event);
  }
}
```

```html
<!-- En el template del componente padre -->
<app-custom-draw-form
  [formGroup]="formGroup"
  [drawForm]="drawForm"
  (onTableRowSelect)="onTableRowSelect($event)"
  (onTableAddRow)="onTableAddRow($event)"
  (onTableDeleteRow)="onTableDeleteRow($event)"
  (onTableCellEdit)="onTableCellEdit($event)">
</app-custom-draw-form>
```

## Funcionalidades Implementadas

✅ **Básicas:**
- Renderizado de tabla con columnas dinámicas
- Edición inline de celdas
- Agregado y eliminación de filas
- Validación de campos requeridos
- Integración con FormGroup
- Numeración de filas
- Ordenamiento de columnas
- Redimensionamiento de columnas
- Layouts responsivos

✅ **Visualización:**
- Tags con transformación de texto (uppercase, lowercase, etc.)
- Severidad de tags configurable
- Grillas y filas rayadas
- Tooltips en botones de acción

⏳ **Pendientes:**
- Filtros de columnas
- Exportación de datos
- Filas y columnas congeladas
- Agrupación de columnas
- Agrupación de filas
- Expansión de filas
- Más tipos de input en columnas (dropdown, date, etc.)
- Paginación avanzada

## Notas Importantes

1. **FormControl**: Los datos de la tabla se sincronizan automáticamente con el FormControl especificado en el campo `field`.

2. **Validación**: Las validaciones se aplican en tiempo real al editar las celdas.

3. **Eventos**: Todos los eventos incluyen información completa sobre el estado actual de la tabla.

4. **Performance**: Se usa `trackBy` para optimizar el rendimiento del renderizado de columnas.

5. **Botones CRUD**: Se utiliza el componente `app-custom-button-crud` para las acciones de la tabla.