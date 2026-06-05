# 2026-06-05_021_crud-onshow-maximize-small-screens

- Fecha: 2026-06-05
- Consecutivo: 021
- Tipo: Cambio funcional

## Resumen de solicitud
Corregir `onShow` en CRUD para que el diálogo se maximice al abrirse desde pantallas pequeñas.

## Alcance
- Ajustar la lógica de apertura de diálogo en la clase base CRUD.
- Mantener el comportamiento actual para desktop (sin auto-maximizar).

## Escenario-01
### Objetivo
Maximizar automáticamente el `p-dialog` solo cuando la app se abre en viewport pequeño.

### Decisiones
- Se usa `generalS.isMobileScreen()` como criterio de pantalla pequeña.
- Si no hay referencia de diálogo o no es pantalla pequeña, no se ejecuta maximizado automático.
- Se conserva `requestAnimationFrame`/`setTimeout` para asegurar que el diálogo ya esté renderizado.

### Validaciones aplicadas
- Firma de `onShow` acepta referencia genérica de diálogo (`any`) para evitar fricción de tipos en plantillas.
- Se evita maximizar si el diálogo ya está maximizado.

### Archivos modificados
- `src/app/utils/crud.class.ts`

### Pruebas sugeridas
1. Abrir formulario en viewport menor o igual a 991px: debe abrir maximizado.
2. Abrir formulario en viewport mayor a 991px: debe abrir con tamaño normal.
3. Verificar que no arroje error de tipos en plantillas que pasan referencia del `p-dialog`.

## Notas
- Cambio acotado al evento `onShow`; no modifica configuración de tamaño (`styleClassDialog`).
