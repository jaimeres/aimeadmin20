# 2026-06-05_021_crud-onshow-maximize-small-screens

- Fecha: 2026-06-05
- Consecutivo: 021
- Tipo: Cambio funcional

## Resumen de solicitud
Corregir `onShow` en CRUD para que el diálogo se maximice al abrirse desde pantallas pequeñas.
Como continuación, estabilizar el alto y scroll de diálogos CRUD en Android/Capacitor cuando aparece el teclado, evitando invadir safe-area/topbar y sin tocar el layout principal.

## Alcance
- Ajustar la lógica de apertura de diálogo en la clase base CRUD.
- Mantener el comportamiento actual para desktop (sin auto-maximizar).
- Marcar diálogos CRUD con una clase CSS específica.
- Limitar en móvil el alto visual de esos diálogos usando las variables de viewport existentes.
- Mantener intactos topbar, buscador global, menú, `index.html` y Capacitor.
- Probar configuración nativa de Android para que el teclado no redimensione el WebView.

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

## Escenario-02
### Objetivo
Reducir saltos visuales en Android/Capacitor cuando el teclado aparece dentro de un `p-dialog` CRUD con formulario dinámico.

### Decisiones
- Se agrega la clase `crud-form-dialog` desde `crud.class.ts` para no editar cada template de CRUD.
- El CSS queda aislado en `@media (max-width: 991px)` y solo afecta `.p-dialog.crud-form-dialog`.
- Se usa `--vv-h` como alto visible ya calculado por `visualViewport`.
- No se resta `--bottom-inset` porque durante teclado ese valor representa el área ocupada por el teclado y duplicaría la reducción.
- Se respeta `--top-inset` y `--safe-bottom` para no invadir el área del reloj/notificaciones ni la zona segura inferior.
- El scroll se mantiene en `.p-dialog-content`; no se agregan listeners globales ni `scrollIntoView`.
- En la segunda iteración, se prefiere `100lvh` cuando el WebView lo soporta para evitar que el diálogo reduzca su alto durante el resize visual del teclado.

### Validaciones aplicadas
- En esta primera iteración CSS no se modifica `windowSoftInputMode`; el cambio nativo queda separado en el escenario 03.
- No se instala ni configura `@capacitor/keyboard`.
- No se cambian `html`, `body`, topbar, menú ni buscador global.
- Los diálogos no CRUD quedan fuera del selector.

### Archivos modificados
- `src/app/utils/crud.class.ts`
- `src/assets/styles.scss`
- `docs/documents/2026-06-05_021_crud-onshow-maximize-small-screens.md`

### Pruebas sugeridas
1. En OPPO A5 o Android/Capacitor de gama baja, abrir un CRUD con formulario dinámico.
2. Enfocar un input cerca de la parte inferior y confirmar que el teclado no provoca un salto brusco excesivo.
3. Confirmar que el input enfocado sigue visible.
4. Confirmar que el scroll ocurre dentro del cuerpo del diálogo.
5. Probar `textarea`, `p-select`, `p-multiSelect`, `p-treeSelect`, `p-autoComplete`, `p-datepicker` y `listbox`.
6. Abrir un diálogo maximizable, por ejemplo mantenimiento si aplica, y confirmar que no se encima con la zona del sistema.
7. Revisar buscador global, topbar, menú lateral y tabla principal en móvil.
8. Revisar escritorio para confirmar que no cambió.

## Pendientes
- Validar en dispositivo real porque el comportamiento final depende del WebView, teclado OEM y ajuste nativo de Android.

## Escenario-03
### Objetivo
Evitar que Android redimensione el WebView al aparecer el teclado, para que el teclado se superponga a la app en lugar de empujar y achicar el diálogo.

### Decisiones
- Se agrega `android:windowSoftInputMode="adjustNothing"` al `MainActivity`.
- No se instala `@capacitor/keyboard`.
- No se cambia el script de `visualViewport` de `index.html`.
- El cambio es global para Android, por eso debe validarse también fuera de diálogos.

### Riesgos
- En pantallas sin scroll interno suficiente, un input inferior podría quedar cubierto por el teclado.
- Algunos teclados OEM pueden seguir ajustando `visualViewport`, aunque el layout nativo no redimensione el WebView.

### Archivos modificados
- `android/app/src/main/AndroidManifest.xml`

### Pruebas sugeridas
1. Recompilar e instalar APK en Android.
2. Abrir un formulario CRUD y enfocar un input inferior.
3. Confirmar que el diálogo no se achica cuando aparece el teclado.
4. Confirmar que el teclado se superpone sin ocultar completamente el input activo.
5. Probar inputs fuera de diálogos, buscador global y filtros de tabla.
6. Si algún input queda inutilizable, revertir `android:windowSoftInputMode="adjustNothing"` y evaluar `adjustPan`.

## Escenario-04
### Objetivo
Evitar errores transitorios al cambiar entre componentes y abrir diálogos mientras señales/configuración de tabla o `drawForm` todavía se están recomputando.

### Problemas observados
- `selectedColumns` podía ejecutar `.includes()` sobre `removeColumns()` cuando el signal estaba temporalmente sin array.
- `custom-draw-form` podía leer `drawFormSignal()['grid']` cuando `drawFormSignal()` todavía era `undefined`.

### Decisiones
- `selectedColumns` normaliza `cols()` y `removeColumns()` a arrays seguros antes de filtrar.
- El template de `custom-draw-form` usa optional chaining y alias local `drawGrid` para no leer `grid` sobre `undefined`.
- No se cambia la estructura de `CRUD`; el ajuste queda acotado a guards de lectura.

### Validaciones aplicadas
- `git diff --check` sin errores.
- `npm run build` exitoso; se mantienen warnings existentes de budgets, CommonJS y stylesheet no localizado.

### Archivos modificados
- `src/app/utils/vars.class.ts`
- `src/app/components/custom-draw-form/custom-draw-form.component.html`
- `docs/documents/2026-06-05_021_crud-onshow-maximize-small-screens.md`

## Escenario-05
### Objetivo
Evitar que un `pos` inválido o rezagado en la URL deje el CRUD móvil apuntando a una configuración inexistente al cambiar de ruta sin refrescar.

### Problemas observados
- En `/warehouses/fuel-consumption?pos=inventory-movement` la ruta carga `WarehouseMovementComponent`, pero ese componente registra `inventory-movement-detail`.
- En móvil físico, al reutilizar la vista, el `pos` inválido podía conservarse hasta refrescar; por eso aparecían títulos como `Alta de undefined`, columnas sin nombre o formularios vacíos.
- Si `_pendingUrlPos` no existía en `this.app`, `initCRUD` no lo limpiaba ni normalizaba la URL.

### Decisiones
- No se normalizan tablas ni columnas.
- `CRUD` resuelve el `pos` de ruta contra `this.app`; si no existe, usa `typeDefault` cuando ya está registrado.
- Al resolver un `pos` pendiente inválido, se limpia `_pendingUrlPos` y se escribe la URL válida con `replaceState`.
- Los cambios posteriores de `queryParams` dentro del mismo componente también caen al `typeDefault` cuando el `pos` recibido no existe.

### Validaciones aplicadas
- Se comparó el flujo contra el commit `706972f372c422d292d56bc5f3b88f28f40eae43`.
- Se verificó que `WarehouseMovementComponent` registra `inventory-movement-detail`, no `inventory-movement`.

### Archivos modificados
- `src/app/utils/crud.class.ts`
- `docs/documents/2026-06-05_021_crud-onshow-maximize-small-screens.md`

### Pruebas sugeridas
1. En móvil físico, navegar a `/warehouses/fuel-consumption?pos=inventory-movement`.
2. Confirmar que la URL cambia a `?pos=inventory-movement-detail`.
3. Abrir alta/edición y verificar que no aparezca `Alta de undefined`.
4. Cambiar entre rutas CRUD sin refrescar y confirmar que columnas y formulario cargan con la configuración correcta.

## Escenario-06
### Objetivo
Evitar que `p-inputNumber` y `p-datepicker` desborden columnas estrechas del formulario dinámico.

### Problemas observados
- En campos como fecha inicial/fecha final o minutos/repeticiones, los wrappers de PrimeNG conservaban un ancho intrínseco mínimo.
- Al reducir el contenedor, los controles se encimaban o salían del padding entre columnas en lugar de encogerse dentro de su celda.

### Decisiones
- Se aplica un ajuste global simple sobre controles que ya usan `height-input-custom`.
- `p-inputgroup` y `p-floatlabel` permiten encogerse con `min-width: 0`.
- `p-inputNumber` y `p-datepicker` con `height-input-custom` fuerzan `width/max-width: 100%` y `min-width: 0` tanto en wrapper como en input interno.
- No se cambian templates ni estructura del formulario.

### Archivos modificados
- `src/assets/styles.scss`
- `docs/documents/2026-06-05_021_crud-onshow-maximize-small-screens.md`

### Pruebas sugeridas
1. Abrir un formulario con dos fechas juntas, por ejemplo fecha de inicio y fecha de fin.
2. Reducir el ancho del diálogo y confirmar que cada campo se mantiene dentro de su columna.
3. Probar dos `input-number` juntos y confirmar que respetan el padding entre columnas.
