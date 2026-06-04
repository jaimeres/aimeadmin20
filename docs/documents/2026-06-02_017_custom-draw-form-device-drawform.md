# Custom Draw Form: resolucion por dispositivo y type_mobile

## Datos

- Fecha: 2026-06-02
- Consecutivo: 017
- Tipo: Cambio funcional

## Resumen

Se agrego soporte para que `custom-draw-form` acepte `drawForm` en estructura legacy (`grid` o `stepper` directo) y en estructura por dispositivo (`mobile` / `desktop`). Tambien se agrego normalizacion de `type_mobile` para que, en pantalla movil, el componente renderice e inicialice cada campo con el tipo efectivo.

## Alcance

- Resolver una sola vez la rama `mobile` o `desktop` cuando cambia el input `drawForm`.
- Mantener compatibilidad con `drawForm.grid` y `drawForm.stepper` directos.
- Normalizar `type_mobile` a `type` solo en pantalla movil y solo si trae valor.
- Guardar en `drawFormSignal` la estructura ya resuelta para que grid, stepper, dropdowns, tablas, firmas, emails-chips y archivos sigan usando el flujo existente.
- No modificar inputs, outputs, eventos ni el HTML.

<a id="escenario-01"></a>
## Escenario 01: Resolver drawForm y tipo efectivo antes del render

El componente decide internamente si usa `mobile`, `desktop` o la estructura legacy al sincronizar el input `drawForm`. La decision usa `GeneralService.isMobileScreen()` desde TypeScript y no desde el template.

Cuando la pantalla es movil, el componente recorre la rama seleccionada una sola vez para copiar la configuracion y sustituir `type` por `type_mobile` cuando `type_mobile` existe y no esta vacio. En escritorio, `type_mobile` se ignora y se conserva el `type` original.

<a id="escenario-02"></a>
## Escenario 02: Medir y reducir costo de resolucion/cache

Se agregaron logs de rendimiento con `performance.now()` en el flujo de `ngOnChanges`, resolucion de `drawForm`, inicializacion de campos y cache automatico. Los logs usan el prefijo `[CustomDrawForm][perf]` y se emiten en puntos de ciclo, no desde el HTML ni durante cada render.

La normalizacion movil usa cache por referencia de rama seleccionada y estrategia copy-on-write: solo clona el camino que realmente cambia por `type_mobile`, evitando recrear todo el `drawForm` si no hay tipos moviles aplicables.

Tambien se instrumentaron las cargas de dropdown/listbox con `[CustomDrawForm][dropdown-preload]`, `[CustomDrawForm][tree-load]` y `[DynamicDropdownData][perf]` para separar tiempo de cola, HTTP, parseo `DJAtoObject`, cache movil, conversion a `TreeNode` y armado de grupos de listbox.

Las precargas iniciales de dropdown ya no activan el bloqueo global de UI. Las recargas forzadas desde el usuario (`force=true`) mantienen el bloqueo. En movil, las precargas se ejecutan con concurrencia limitada para evitar saturar red/CPU durante el arranque del formulario.

Con los logs recibidos se identifico que el retraso posterior al primer render no venia de `resolveDrawFormByDevice`, sino de precargas asincronas de dropdown/listbox. Los campos de auditoria/sistema (`created_by`, `modified_by`, `inactivated_by`, `deleted_by`, `users_authorize`, `tasks`) quedan diferidos unos segundos para que no compitan con los campos principales durante el arranque. Los campos ocultos o con precarga deshabilitada no se encolan.

<a id="escenario-03"></a>
## Escenario 03: Evitar reaparicion del borrador descartado

Al descartar un borrador se suspende temporalmente el autosave, se limpia la clave activa, se resetea el formulario con `emitEvent:false` y se reinicializa el autosave despues. Tambien se descartan borradores vacios para que un payload sin valores reales no vuelva a mostrar el indicador de recuperacion.

Las inicializaciones asincronas de cache se invalidan con un token de version para evitar que un `load()` anterior restaure tarde un borrador ya descartado.

Adicionalmente, una clave descartada se mantiene bloqueada para restauracion dentro de la instancia actual hasta que exista un nuevo guardado real. Esto evita que una lectura lenta de almacenamiento nativo reactive el mensaje de borrador recuperado despues de que el usuario lo descarto.

`FormCacheService.load()` ahora emite logs por etapa (`load.storage`, `load.parseEntry`, `load.decrypt`, `load.parsePayload`, `load.total`) para distinguir si el costo esta en Capacitor Preferences/localStorage/sessionStorage, parseo JSON o descifrado.

<a id="escenario-04"></a>
## Escenario 04: Mantener envio de campos form_fields_data_* con drawForm por dispositivo

Despues de resolver `drawForm.mobile` / `drawForm.desktop` solo dentro de `custom-draw-form`, el render podia usar la rama y el `type_mobile` correctos, pero `CRUD.generateJSONform()` y `_rebuildFormDataDicts()` seguian leyendo el `drawForm` crudo. Eso podia desalinear el control visible `object_form_fields_data_*` y el campo canonico `form_fields_data_*` usado para reconstruir `form_data` antes del POST/PATCH.

Se agrego en `crud.class.ts` una resolucion equivalente por dispositivo para los puntos que crean controles, normalizan `fields_prefixes`, reconstruyen `form_data`, fusionan archivos `form_fields_data_*`, generan columnas dinamicas y buscan configuracion de campos. Tambien se centralizo el recorrido de layouts para soportar tanto el formato legacy por tabs como una rama directa `{ grid }`, `{ nested }` o `{ stepper }` seleccionada desde `mobile` / `desktop`.

Con esto, campos como `form_fields_data_componente` vuelven a entrar al flujo historico: el dropdown-like crea/controla su `object_...`, el campo canonico se reconstruye en `form_data` y el contrato del servidor se mantiene.

Se corrigio ademas que `addFieldsByPrefix()` fuera idempotente cuando el mismo `drawForm` ya habia sido mutado previamente a `object_<field>`. El filtro de prefijo ahora calcula primero el nombre canonico (`object_form_fields_data_componente` -> `form_fields_data_componente`) antes de decidir si debe crear el control. Esto evita que reaperturas o reconstrucciones del formulario salten el control canonico aunque el campo visual exista.

## Decisiones tomadas

- `drawFormSignal` queda como fuente interna ya normalizada para no recalcular en cada render.
- El `@Input() drawForm` original no se muta.
- Si existe solo una rama (`mobile` o `desktop`), esa rama se usa como fallback.
- Si no existen ramas por dispositivo, se conserva la estructura anterior.
- Una rama por dispositivo se considera valida cuando contiene `grid` o `stepper`, para evitar falsos positivos con otras configuraciones llamadas `mobile`.
- Se limpia el cache local de menus de archivos al cambiar `drawForm` para evitar reutilizar acciones de una rama anterior con el mismo `field`.
- El log sin tiempo de `GeneralService.isMobileScreen()` se retiro para evitar ruido y costo repetido.
- Las precargas de dropdown se hacen en cola: 2 concurrentes en movil y 6 en escritorio.
- Las precargas pesadas de auditoria/sistema se difieren para priorizar los campos necesarios al abrir el formulario.
- `CRUD` tambien resuelve la rama por dispositivo y aplica `type_mobile` antes de crear controles y reconstruir `form_data`, para que render y payload usen el mismo contrato.
- `addFieldsByPrefix()` trata el renombrado `object_<field>` como idempotente: si el draw ya venia mutado, igualmente crea el control canonico y el control visible.

## Validaciones aplicadas

- `git diff --check` sin errores.
- Busqueda en `custom-draw-form.component.html` sin llamadas a `isMobileScreen`, resolvedores de `drawForm` ni resolvedores de tipo.
- `npm run build` exitoso despues del ajuste de rendimiento/cache y precarga de dropdowns. Se mantienen warnings existentes de budgets, CommonJS y stylesheet no localizado.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/dynamic-dropdown-data.service.ts`
- `src/app/utils/crud.class.ts`
- `src/app/utils/services/form-cache.service.ts`
- `src/app/utils/services/general.service.ts`
- `docs/documents/2026-06-02_017_custom-draw-form-device-drawform.md`

## Pendientes

- Validar manualmente un formulario legacy con `grid`.
- Validar manualmente un formulario legacy con `stepper`.
- Validar manualmente un formulario con ramas `mobile` / `desktop` y un campo con `type_mobile`.
- Validar manualmente que "Descartar borrador" no vuelva a mostrar el indicador despues del debounce de autosave.
