# 2026-06-08_022_crud-set-status-time-zone

- Fecha: 2026-06-08
- Consecutivo: 022
- Tipo: Cambio funcional

## Resumen de solicitud
Agregar a `setStatus` en CRUD el campo `time_zone` y, como continuación del mismo cambio funcional, también `latitude` y `longitude`, para que viajen junto con la llamada a `edit`, tomando los valores desde `this.generalS.getLocationSnapshot()`.

## Alcance
- Ajustar el payload de cambio de estado en la clase base CRUD.
- Reutilizar la fuente de ubicación ya existente en `generalS`.
- No modificar el flujo general de `save`, formularios ni otros llamados a `edit`.

## Escenario-01
### Objetivo
Enviar `time_zone`, `latitude` y `longitude` también cuando el usuario cambia el estado de un registro desde `setStatus`.

### Decisiones
- `setStatus` obtiene un snapshot actual de ubicación con `this.generalS.getLocationSnapshot()`.
- Los valores se envían como `formData.latitude`, `formData.longitude` y `formData.time_zone`, porque `crudS.edit` serializa `formData` dentro de `attributes`.
- Se mantiene intacto el arreglo `relationships` para que el cambio de estado siga usando el mismo mecanismo actual.

### Validaciones aplicadas
- Se verificó el contrato de `crudS.edit` para confirmar que acepta `formData` y `relationships` en la misma llamada.
- Se revisó `getLocationSnapshot()` para confirmar que siempre retorna un objeto con `time_zone`.

### Archivos modificados
- `src/app/utils/crud.class.ts`
- `docs/documents/2026-06-08_022_crud-set-status-time-zone.md`

### Pruebas sugeridas
1. Seleccionar un registro y cambiar su estado desde el menú de acciones.
2. Verificar en red/backend que el PATCH incluya `attributes.latitude`, `attributes.longitude` y `attributes.time_zone`.
3. Confirmar que el estado siga actualizando correctamente y que la tabla refleje el cambio.

## Notas
- Si el snapshot no trae zona horaria válida, el código envía cadena vacía para no romper el flujo de cambio de estado.
- Si el snapshot no trae coordenadas válidas, el código envía `null` para `latitude` y `longitude`.