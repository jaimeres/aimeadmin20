# 2026-05-25 · 003 · Dynamic children field loading en cascada de dropdowns

## Prompt original (resumen literal)
- "analiza y dime si esta configuración es suficiente para que el campo workshop se llene de forma automatica"
- "implementa el cambio"

## Escenarios

### Escenario 01: Implementar rama `dynamic` en `_processChildrenFields`

- **Archivo:** `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- **Método:** `_processChildrenFields`
- **Problema:** La rama `fieldType === 'dynamic'` era un no-op (`// dynamic: no-op de momento`). Los campos hijo definidos en `children.fields.dynamic` nunca se consultaban ni auto-seleccionaban al cambiar el padre.
- **Solución:**
  1. Resolver `app`/`type` desde `data_type.type` usando `crudS.getAppType`.
  2. Extraer el valor del padre con `filter_group` (default `'id'`). Si no hay opción seleccionada ni `currentValue`, limpiar opciones y valor del control.
  3. Construir el filtro JSON:API inyectando `parentValue` como `default_value` en cada entrada del `data_type.filter` que tenga `forced: true`. Entradas estáticas (`active: true`, sin `forced`) se pasan tal cual.
  4. Llamar a `crudS.getObject` con el filtro construido.
  5. Aplicar `result_position` (`first`|`last`|`all`) sobre los resultados.
  6. Actualizar `dropdownOptionsSignal` con los resultados filtrados.
  7. Si `selected: true`, auto-setear el `FormControl` con `rows[0][option_value]`; si no hay resultados, setear `null`.

- **Propiedades de configuración soportadas:**

| Propiedad | Nivel | Descripción |
|---|---|---|
| `filter_group` | campo hijo | Propiedad del padre usada como valor del filtro (default `'id'`) |
| `data_type.type` | campo hijo | Tipo de recurso del endpoint hijo |
| `data_type.filter[*].forced` | campo hijo | `true` → inyectar `parentValue` como `default_value` |
| `data_type.filter[*].active` | campo hijo | `true` → incluir como filtro estático |
| `result_position` | campo hijo | `'first'`, `'last'` o `'all'` |
| `selected` | campo hijo | `true` → auto-setear el control con el primer resultado |
| `option_value` | campo hijo | Campo del objeto resultado usado como valor del control (default `'id'`) |

- **Ejemplo de configuración (Python/backend):**
```python
"workshop": {
    **child_dynamic,
    "filter_group": "id",
    "data_type": {
        **data_type,
        "type": "workshop",
        "filter": {
            "subsidiaries__assetsubsidiary__asset": {
                "forced": True,
                "active": True,
                "ops": ["exact"],
                "default": "exact",
            }
        }
    },
    "result_position": "first",
    "selected": True,
}
```
