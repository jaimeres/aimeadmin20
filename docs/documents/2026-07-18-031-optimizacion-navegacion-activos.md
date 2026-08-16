# Optimización de navegación inicial hacia componentes (piloto Activos)

## Datos generales

- Fecha: 2026-07-18
- Consecutivo: 031
- Tipo: Cambio funcional

## Resumen

El usuario pidió optimizar la navegación inicial hacia los componentes y entre rutas hermanas. La transición hacia Activos tardaba ~3.06 s sin peticiones HTTP: el guard bloquea la vista mientras espera `ensureConfigForUrl()` y el chunk de la ruta incluye el motor completo de formularios, cámara y escáner aunque el usuario solo vea el listado. La optimización es incremental y medible, sin regresiones: instrumentación activable, carga diferida del escáner, separación del listado de las interacciones pesadas mediante `@defer`, y reducción de operaciones duplicadas de Preferences (esta última documentada como Escenario 08 de `2026-06-04-001-token-config-cache.md`).

## Alcance

- Instrumentación de diagnóstico desactivada por defecto (`src/app/utils/perf-trace.ts` y puntos de medición).
- `@capacitor/barcode-scanner` deja de importarse estáticamente en CustomDrawForm.
- `AssetComponent` deja de importar `LOCAL_BASE`/`PRIME_MODULES` completos; los dialogs pesados se difieren con `@defer`.
- Los escenarios 01-05 no cambian contratos. El escenario 06 agrega el contrato aditivo `general.configuration` para evitar crear el editor local cuando el servidor lo deshabilita por plataforma; no cambia permisos, autoload, filtros, CRUD, auditoría, documentos, timeline, cámara/archivos ni el orden create/update.

<a id="escenario-01"></a>
## Escenario 01: Instrumentación de diagnóstico activable

- Flag local `bos_perf_trace` (localStorage/sessionStorage). Sin flag no se suscribe ni loguea nada, también en producción. Activar: `localStorage.setItem('bos_perf_trace', '1')` y recargar.
- `perf-trace.ts` expone `perfTraceEnabled`, `perfMark`, `perfMeasure`, `perfNow`, `perfLog` usando `performance.mark()/measure()` cuando están disponibles. No registra tokens, valores ni datos personales: solo etiquetas/claves, duraciones y tamaños en caracteres.
- Puntos medidos:
  - `src/app.component.ts`: NavigationStart, RouteConfigLoadStart/End, GuardsCheckStart/End, ActivationStart/End, NavigationEnd/Cancel/Error con delta desde NavigationStart; deja la marca `bos:nav-start`.
  - `auth.service.ts` → `ensureConfigForUrl()`: duración total del aseguramiento de configuración por navegación (envoltura con `finalize`, el cuerpo async no cambió).
  - `client-cache-storage.service.ts` → `getItem`/`setItem`: duración y tamaño del JSON. Con el flag apagado delegan directo a la implementación original (`getItemImpl`/`setItemImpl`, cuerpos sin cambios).
  - `asset.component.ts`: primer render estable con `afterNextRender`, medido desde `bos:nav-start`.

<a id="escenario-02"></a>
## Escenario 02: Carga diferida del escáner de códigos

- `custom-draw-form.component.ts` importaba `CapacitorBarcodeScanner` estáticamente, arrastrando `html5-qrcode` + ZXing (~366 KB sin comprimir) al grafo eager de toda ruta que use el formulario.
- El import pasa a ser solo de tipos (`import type { CapacitorBarcodeScannerTypeHint }`) y el módulo runtime se carga con `import()` dentro de `onScanCode()` a través de `loadBarcodeScanner()` (método separado para poder espiarlo en specs).
- Comportamiento preservado: mismos mensajes, mismas emisiones de `onScanCodeAction` (success/cancelado/error), mismo manejo del control del formulario. Un fallo de carga del módulo cae en el `catch` existente y emite el mismo evento de error.
- El fallback del hint (`|| 17`, ALL) ya era literal numérico; no queda ningún valor runtime del paquete en el chunk eager.

<a id="escenario-03"></a>
## Escenario 03: Separar el listado de Activos de sus interacciones pesadas

- `asset.component.ts` sustituye `...PRIME_MODULES, ...LOCAL_BASE` por imports exactos. Eager quedan: CommonModule, ReactiveFormsModule, DialogModule, TabsModule, SelectModule, CustomButtonCrud, CustomTable y CustomButtonFooter (lo necesario para toolbar, búsqueda, tabla, estado vacío y acciones visibles).
- En el template, se envuelven en `@defer (when …)` los componentes que solo se usan al abrir un dialog:
  - `app-custom-local-settings` (when `localSettingsDialogVisible`),
  - `app-custom-import` (when `importDialogVisible`),
  - `app-custom-actions-selection` (when `actionsSelectionDialogVisible`),
  - `app-custom-draw-form`, `app-custom-audit`, `app-custom-documents`, `app-asset-subsidiary-timeline` (when `formDialogVisible[<pos>]` del dialog correspondiente).
- Los `*ngIf`, bindings, outputs, FormGroups y el orden de eventos existentes se conservan tal cual dentro de cada bloque.
- `TaskModuleLoaderComponent` y `PopupComponent` venían de `LOCAL_BASE` pero no aparecen en el template de Activos: se retiran de los imports del componente.
- Al usarse los componentes diferidos únicamente dentro de `@defer`, el compilador los separa del chunk eager de la ruta; se cargan la primera vez que el trigger se vuelve verdadero (abrir Nuevo/Editar/Configuración/Importación/Acciones).

<a id="escenario-04"></a>
## Escenario 04: Diferir tipos de campo raros dentro de CustomDrawForm

2026-07-19. El usuario pidió optimizar `custom-draw-form.component` con análisis fino: es el componente que heredan/importan todos los CRUD, pero si todo se difiere el peso se traslada a edit/create. Se verificó con stats.json que el chunk del formulario (396.7 KB) sigue eager en el grafo de todas las rutas no optimizadas (tool-spare, warehouse-movement, request), por lo que sí afecta el cambio entre apps aunque el componente no se instancie hasta abrir el dialog (el parse del JS ocurre en la primera entrada a cada ruta por sesión).

Composición medida del chunk: 163 KB el propio componente compilado, 144 KB PrimeNG exclusivo (tree/treeselect 72.3 KB, listbox 41.7 KB, image ~26 KB, stepper 17.8 KB, fieldset 9.7 KB), 38.8 KB dynamic-table-field, 9.3 KB @capacitor/camera.

### Decisiones del alcance (análisis fino)

- Los cuatro layouts del template (card, libre, fieldset, stepper) delegan cada tipo a `ng-template` compartidos con `ngTemplateOutlet`, así que basta una sustitución por tipo dentro del `ng-template`, sin tocar los layouts.
- **Se difieren** (hijos standalone + `@defer (on immediate)` dentro del ng-template; el chunk se carga solo si el formulario abierto contiene ese tipo): `tree-select` (−72 KB), `listbox` (−42 KB), `select-button` (−7 KB). Frecuencia en configs del API: 1, 1 y 1 usos.
- **Se descartan con motivo**: `multi-choice` y `dropdown-choice` reutilizan los templates de multi-select/dropdown (cero ahorro); `emails-chips` usa p-autocomplete ya eager por ser tipo común; `button` usa p-button compartido con la toolbar; `time` comparte p-datepicker con `date`; `signature` escribe base64 al form (territorio files, advertencia explícita del usuario); `table`, `files`, imagen y stepper intocables por el WIP de tabla derivada y por los campos files duplicados a propósito con validación por paso (como `warehouses/fuel-consumption?pos=inventory-movement-detail`).
- **Se mantienen eager todos los tipos comunes** (input-text, textarea, dropdown, number, toggle, date, auto-complete, multi-select…): un edit/create normal no paga ningún chunk nuevo.
- Los hijos son presentacionales (OnPush, signal inputs/outputs): el padre conserva los datos (`dropdownOptionsSignal`, `selectionMultipleSignal`, `virtualOptionsReadySignal`), las validaciones, `dataDropdown` y todos los handlers; los hijos solo re-emiten eventos. Markup idéntico al de los ng-template originales (incluida la trazabilidad previa de docs 007 y 020, referenciada en cada hijo).
- `JoinOrSelfPipe` se movió a `join-or-self.pipe.ts` (sin cambios de lógica) para que el hijo listbox lo importe sin crear un ciclo de imports; el componente lo re-exporta por compatibilidad.

### Análisis del video del dispositivo (2026-07-19)

- No aparece ningún `[perf]` porque el flag `bos_perf_trace` se escribió sin recargar la página: el gate se lee una vez por carga. Hay que recargar tras `localStorage.setItem('bos_perf_trace','1')`.
- En cada navegación se observa un patrón repetido: `changePos` → varias parejas `native/result Preferences.set` → `cols ordenadas (39)/(53)` → `inicio getAll`, ejecutándose más de una vez por navegación, además de logs continuos de AssistantWidget. Estas repeticiones (trabajo de columnas duplicado y varias escrituras al puente por navegación) son candidatas de la siguiente optimización y NO se corrigen en este cambio (requieren confirmación).

<a id="escenario-05"></a>
## Escenario 05: Memoria de sesión de respuestas OPTIONS por endpoint

2026-07-19. El usuario reportó que antes, al volver a un endpoint ya abierto sin cerrar la app, el formulario cargaba rápido, y que esa retención se perdió. Diagnóstico: no hubo regresión de código — `optionsFields[pos]`, `formTempo[pos]`, `columns[pos]` e `itemsCache[pos]` viven en la instancia del componente CRUD, que se destruye al cambiar de ruta; nunca existió caché a nivel servicio ni `RouteReuseStrategy` (verificado en historial git). La retención que el usuario recuerda ocurre solo dentro de la misma instancia (cambios de `pos` en la misma app).

Decisión: `CRUDService.options()` (singleton root) guarda en memoria de sesión la respuesta OPTIONS por usuario+endpoint. Al volver a un endpoint ya visitado, `createForm()`/`getAll()` reciben la respuesta al instante (sin HTTP) y solo reconstruyen el FormGroup localmente. Detalles:

- La clave incluye `userId ?? username`: un cambio de usuario no reutiliza permisos (`actions.POST`) de otro.
- Se entrega un **clon** (`structuredClone`) por lectura y se guarda un clon prístino: las mutaciones de una instancia no contaminan a otras.
- Sin TTL: vive lo que la sesión de página, igual que la retención por instancia previa. Cambios de permisos hechos en el servidor a mitad de sesión se reflejan al recargar la app (antes se reflejaban al recrear el componente; tradeoff aceptado por el objetivo de velocidad).
- No agrega llamadas al servidor: las elimina.

<a id="escenario-06"></a>
## Escenario 06: Creación condicional de CustomLocalSettings

2026-08-12. Para comprobar y reducir el costo que `app-custom-local-settings` agrega a los CRUD, todos sus puntos de montaje quedan protegidos por `*ngIf`. La fuente única es la configuración general del recurso activo (`configGeneral()[pos]`) con este contrato:

```json
{
  "configuration": {
    "mobile": {
      "active": true,
      "dialog": false,
      "layout": false,
      "behavior": false,
      "filters": true
    },
    "web": {
      "active": true,
      "dialog": true,
      "layout": true,
      "behavior": true,
      "filters": true
    },
    "desktop": {
      "active": true,
      "dialog": true,
      "layout": true,
      "behavior": true,
      "filters": true
    }
  }
}
```

- `CRUD.localSettingsConfiguration` resuelve `mobile`, `web` o `desktop` mediante `GeneralService.getClientPlatform()`. `CRUD.showLocalSettingsComponent` deriva exclusivamente de `active` y se comparte con los componentes heredados y `CrudPageShellComponent`.
- `CRUD.localSettings()` también respeta `active`: si está deshabilitado, mantiene cerrado el diálogo, muestra el aviso existente y detiene su inicialización.
- `dialog`, `layout`, `behavior` y `filters` muestran u ocultan las pestañas correspondientes. Si la pestaña seleccionada queda oculta, `CustomLocalSettingsComponent` selecciona la primera permitida; con el default móvil abre `filters`.
- Antes de abrir, `CRUD.localSettings()` refresca `general` y `draw` en `fieldConfig`; así el payload persistente reconstruye los valores efectivos y conserva `general.configuration`.
- El `*ngIf` impide instanciar el editor cuando `active` es falso, pero no modifica el menú «Configuración del módulo», el flujo de guardado ni las configuraciones existentes.
- `placeholder-crud-config.ts` replica el contrato completo y mezcla cada plataforma para que los módulos con configuración provisional no pierdan overrides parciales.
- El cliente mantiene lectura temporal de `configuration`/`configuration_mobile` como contrato anterior de `active`; las cuatro secciones faltantes toman el default de la plataforma.
- En `AssetComponent` se conserva el `@defer` anterior: la condición nueva actúa dentro del bloque diferido. En Maintenance se sustituye la desactivación manual usada para la prueba de rendimiento por la condición configurable.
- El servidor define una sola variable base (`local_settings_configuration`) y cada configuración CRUD con nodo `general` la importa mediante el patrón existente `from .base import *`.

<a id="escenario-07"></a>
## Escenario 07: Carga bajo demanda de CustomLocalSettings

2026-08-12. La prueba en equipos de gama baja y media-baja confirmó que dejar
`active: true`, incluso con únicamente la sección `filters`, mantiene una demora
aproximada de cinco segundos al cambiar entre componentes. La condición del
escenario 06 evitaba crear el editor sólo cuando `active` era falso; con el
contrato vigente, el editor cerrado seguía instanciándose, procesando `field` y
creando el árbol completo del diálogo durante la navegación.

La medición del grafo de producción confirmó además que los consumidores de
`LOCAL_BASE` importaban de forma inmediata un chunk compartido de 75,595 bytes
que contenía CustomLocalSettings, `type-schemas` y DragDrop. Agregar `@defer` al
template no bastaba mientras el componente pesado continuara dentro de ese
arreglo compartido.

Solución aplicada:

- `CustomLocalSettingsLoaderComponent` conserva el selector y el contrato público
  (`visible`, `field`, `formGroup`, `sectionConfiguration`, `saveAction` y
  `visibleAction`), pero no contiene formularios ni componentes PrimeNG pesados.
- El editor real usa el selector interno `app-custom-local-settings-editor` y la
  fachada lo monta dentro de `@defer` únicamente cuando `visible` es verdadero.
- Los 21 consumidores usan `@defer (when localSettingsDialogVisible)` y conservan
  un `*ngIf` compuesto por `active` y `localSettingsDialogVisible`. Antes del
  primer clic no existe instancia del editor; al cerrar, el `*ngIf` destruye su
  formulario y su árbol visual.
- No se usa `prefetch on idle`: en dispositivos limitados la prioridad es que la
  navegación no compita con el parseo del editor. El costo se paga sólo al abrir
  «Configuración del módulo» por primera vez.
- No se modifican en este escenario el diseño visual, las etiquetas, los
  ToggleButton, los presets de clases, `type-schemas` ni schemas del servidor. La
  fachada deja el editor aislado para que esa siguiente fase pueda reorganizar su
  UI sin volver a incorporarlo al grafo de navegación.

Medición después del cambio:

- `warehouse-movement` deja de importar el chunk inmediato de 75,595 bytes y sólo
  conserva la fachada compartida de 1,491 bytes (reducción directa de 74,104 bytes
  sin comprimir en ese enlace del grafo).
- El editor queda como chunk lazy independiente de 63,817 bytes, además de sus
  dependencias dinámicas, y sólo se solicita al abrirlo.
- El chunk propio de la ruta cambia de 10,246 a 10,368 bytes por las instrucciones
  del bloque diferido; ese incremento de 122 bytes es intencional.

<a id="escenario-08"></a>
## Escenario 08: Editor visual orientado a CustomDrawForm y contratos cerrados

2026-08-12. Después de aislar la carga del editor en el escenario 07, se
reorganiza únicamente su UI cliente. El repositorio del servidor no se modifica
porque otro agente trabaja en su schema; sus comentarios y consumidores sí se
auditan como fuente del contrato.

### UI y formularios

- El editor adopta el patrón visual del constructor que previsualiza
  `app-custom-draw-form`: formularios reactivos, `p-floatlabel` con variante
  `on`, tarjetas responsivas, controles PrimeNG y etiquetas completas en español.
- Se retira `FormsModule` y todo `ngModel` del editor. Diálogo, comportamiento,
  filas, filtros y opciones avanzadas tienen controles reactivos estables; los
  formularios de fila se destruyen al cambiar de pestaña o cerrar el editor.
- Cada campo separa identidad, encabezado, ancho móvil, ancho escritorio,
  visibilidad de tabla/formulario, orden, bloqueo y visibilidad móvil. Los
  ToggleButton expresan ambos estados dentro del botón; ya no muestran un simple
  «Sí/No» ni dependen exclusivamente de iconos.
- La vista previa conserva el grid ligero del editor para no importar otra vez
  el componente pesado dentro de su propio chunk lazy, pero usa exactamente la
  semántica de 12 columnas de CustomDrawForm.

### Contratos derivados del servidor y del consumidor

| Propiedad | Valores ofrecidos por la UI | Consumidor |
|---|---|---|
| `class` | `col-span-1` … `col-span-12` | ancho base/móvil del formulario |
| `class_md` | `md:col-span-1` … `md:col-span-12` | ancho desde breakpoint `md`/escritorio |
| `default.scope` de código | los 15 scopes de numeración del serializer (`global` … `all`) | separación de consecutivos |
| `filter.scope` de hijos | `client`, `server`, `auto` | lugar donde se resuelve la cascada |
| `scope_edition` de columnas de tabla | `server`, `local` | persistencia de la edición |
| `content_type` de documento | `base64`, `path`, `form-data` | tratamiento del archivo legacy |
| `source` de documento | `camera`, `gallery`, `both` | origen de captura permitido |

- Los tres `scope` se modelan como contratos distintos. En particular se elimina
  `create` del selector de `default.scope`: el serializer no lo reconoce y antes
  terminaba silenciosamente en el scope global vacío.
- Las clases dejan de ser texto libre. Las etiquetas se corrigen: `class` es
  móvil/base y `class_md` es escritorio, según el `ngClass` real de
  CustomDrawForm. Los valores heredados que no pertenezcan al contrato se muestran
  como inválidos y deben sustituirse antes de aplicar el editor avanzado.
- Los comentarios de `base.py` también alimentan los selectores cerrados de
  formato y origen de fecha, posición de prefijo/sufijo, iconos, severidad,
  origen de sugerencias, modo/prioridad de correo y captura de documentos.
- Un validador reactivo comprueba cada select cerrado y el JSON editable. El
  editor no aplica el snapshot si existe un valor ajeno al catálogo o JSON
  inválido; el resto de propiedades libres (campo API, endpoint, separadores,
  zona IANA y texto) conserva entrada de texto porque su contrato no es enum.
- `type-schemas.ts` continúa compartido con
  `ChildFormFieldsBuilderComponent`; `includeIf` impide que una sección opcional
  cree claves ausentes como efecto secundario. No se cambian `appendFile`,
  reconciliación de validators, `validateStepFields`, routing base64 ni los casos
  legacy `document`/`key != field`.

## Decisiones tomadas

- La instrumentación se hace con funciones sueltas, sin servicio ni DI, para no agregar peso al arranque.
- El gate del flag se cachea una vez por sesión de página; `setPerfTraceForTesting()` existe solo para specs.
- No se aplicó `prefetch on idle` en los `@defer`: en gama baja el objetivo es no hacer trabajo hasta que el usuario lo pida. Queda como mejora opcional.
- No se extrajeron los dialogs a componentes standalone: `@defer` inline fue suficiente para separar los chunks (verificado con stats.json), y así no se duplican formularios ni estados.
- El patrón de imports exactos + `@defer` del escenario 03 aún debe evaluarse en `crud-page-shell.component.ts` y en los demás componentes que importan `LOCAL_BASE`; el escenario 06 solo agrega allí la creación condicional del editor.

## Validaciones aplicadas

- Escenario 06 (2026-08-12): build de producción Angular exitoso. Conserva únicamente los warnings preexistentes de budgets, dependencias CommonJS y stylesheet global no localizado.
- Escenario 06: 20 pruebas Angular dirigidas aprobadas para resolución de plataforma, compatibilidad anterior, `CRUD.localSettings()`, preservación del PATCH, secciones visibles y filtros existentes de CustomLocalSettings.
- Escenario 06: auditoría estática de los 21 puntos de montaje de `app-custom-local-settings`; los 21 contienen `*ngIf` enlazado a la señal compartida.
- Escenario 06: `manage.py check` del servidor sin errores; 160/160 recursos de `D_CONFIGURATION()` publican las cinco claves en las tres plataformas y los 16 defaults JSON modificados pasan sus validadores. La validación global de todos los defaults sigue encontrando el incumplimiento preexistente de CFDI (`Serie`, `Folio`, `Fecha`, etc.) fuera del alcance de este escenario.
- Escenario 06: 3 pruebas dirigidas del servidor pasan; cubren los 160 recursos, los defaults de las tres plataformas y la herencia en las personalizaciones CEB.
- Escenario 07: build de producción con `stats.json` exitoso; el editor aparece como entrypoint lazy y no como import inmediato de `warehouse-movement`.
- Escenario 07: auditoría estática de 21/21 montajes con trigger `localSettingsDialogVisible`, condición `active && visible` y enlace de `sectionConfiguration`.
- Escenario 07: 21 pruebas Angular dirigidas aprobadas; incluyen fachada cerrada sin editor, resolución de plataforma, apertura/bloqueo de `CRUD.localSettings()`, preservación del payload y comportamiento existente de filtros.
- Escenario 08: build Angular de producción exitoso, incluido el compilador de templates. El editor permanece en un chunk lazy de 71.16 kB; sus estilos quedan en 3.79 kB y respetan el límite de error de 4 kB. TypeScript (`tsc --noEmit`) exitoso.
- Escenario 08: 22 pruebas Angular dirigidas aprobadas en ChromeHeadless para CustomLocalSettings y ChildFormFieldsBuilder. Cubren los contratos de clases, los tres scopes, rechazo de un scope ajeno, secciones por plataforma, payload reactivo de layout/filtros y compatibilidad del builder compartido.
- Build de producción con `--stats-json` antes y después: exitoso, mismos warnings preexistentes (budgets, CommonJS, stylesheet no localizado). Métricas en Notas.
- Specs dirigidos ejecutados (ChromeHeadless): 31 en total, 27 pasan — perf-trace (8), guard nuevo (4), client-cache-storage, auth.service, asset.component (`should create`), custom-draw-form incluyendo los 3 nuevos del escáner diferido.
- Los 4 specs que fallan son de la tabla derivada (ESC:030, doc 2026-07-14-030): se verificó en un worktree limpio de `HEAD` (7fac73a, sin estos cambios) que fallan idéntico — son preexistentes del trabajo de tabla derivada incompleto ("tabla mejorada pero incompleta"), no de esta optimización.
- Los specs de `asset.component` y `custom-draw-form` necesitaban providers de `HttpClient`/router de pruebas para poder instanciar el componente (fallo preexistente NG0201); se agregaron solo en los specs.
- La pantalla inicial del listado conserva su comportamiento; los dialogs cargan su contenido al abrirse (7 `dynamic-import` verificados en stats.json).

## Notas

- Métricas del grafo estático de stats.json (build de producción, antes → después):
  - Entrar a Activos: 30 archivos JS / 1 894.7 KB → 26 archivos JS / 787.2 KB sin comprimir (−58 %); 195.5 KB gzip después (≈486 KB gzip antes según diagnóstico, −60 %).
  - `html5-qrcode` (chunk de 365.7 KB), ZXing y `@capacitor/barcode-scanner`: fuera del grafo eager; se cargan solo con `import()` al escanear.
  - CustomDrawForm, CustomAudit, CustomDocuments, AssetSubsidiaryTimeline, CustomImport, CustomLocalSettings y CustomActionsSelection: en chunks diferidos (7 `dynamic-import` desde el chunk de la ruta).
  - Bundle inicial global: 1 216.4 KB → 1 225.6 KB (+9.2 KB). El único input nuevo es `perf-trace.ts` (0.7 KB); el resto es re-particionado de chunks compartidos y runtime de `@defer`. La reducción del bundle inicial global queda fuera del alcance de estas fases.
- La instrumentación permite medir en dispositivo real activando el flag; los tiempos de gama media/baja no son medibles en el entorno de desarrollo.
- Métricas del escenario 04 (stats.json, antes → después): chunk de CustomDrawForm 396.7 KB → 270.9 KB (−32 %); tree (77.3 KB), listbox (48.8 KB) y select-button pasan a `dynamic-import`. Grafo eager por ruta no optimizada: warehouse-movement 1 401.6 → 1 220.8 KB, tool-spare 1 506.4 → 1 325.6 KB, request 1 405.4 → 1 224.6 KB (≈ −180 KB, −13 % cada una, sin tocar esos componentes).
- La suite de specs del repo tiene fallas preexistentes ajenas a este cambio: 18 specs importan `src/testing/crud-test.helpers` (no existe) y `src/assets/styles.scss` referencia fuentes no resolubles que el builder de test (webpack) trata como error. Para ejecutar los specs dirigidos se usó un tsconfig temporal que excluye esos 18 specs y se retiró temporalmente la hoja global del target de test; ambas cosas se revirtieron al terminar.

## Archivos modificados

- Escenario 06: `src/app/utils/crud.class.ts`, `src/app/utils/placeholder-crud-config.ts` y `src/app/shared/crud-page-shell.component.ts`.
- Escenario 06: los 20 templates que montan directamente `app-custom-local-settings`, incluida la restauración condicionada de Maintenance.
- Escenario 07: `src/app/components/custom-local-settings/custom-local-settings-loader.component.ts`, su template y su spec; selector interno del editor, `src/app/shared/components.index.ts`, `src/app/assets/asset/asset.component.ts`, `src/app/shared/crud-page-shell.component.ts` y los 20 templates consumidores.
- Escenario 08: `src/app/components/custom-local-settings/custom-local-settings.component.ts`, su template, estilos y spec; `type-schemas.ts`; y el consumidor compartido `src/app/components/child-form-fields-builder/child-form-fields-builder.component.ts`.
- Escenario 06 (servidor): `apps/utils/configurations/base.py`, 17 módulos de defaults, `configuration_functions.py` y `docs/documents/2026-08-12-067-visibilidad-configuracion-local.md`.
- `src/app/utils/perf-trace.ts` (nuevo) y `src/app/utils/perf-trace.spec.ts` (nuevo)
- `src/app.component.ts`
- `src/app/auth/services/auth.service.ts`
- `src/app/utils/services/client-cache-storage.service.ts`
- `src/app/assets/asset/asset.component.ts`
- `src/app/assets/asset/asset.component.html`
- `src/app/assets/asset/asset.component.spec.ts` (solo providers de HttpClient de pruebas; fallo preexistente NG0201)
- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `src/app/components/custom-draw-form/custom-draw-form.component.html` (escenario 04: ng-templates de tree-select/listbox/select-button → @defer)
- `src/app/components/custom-draw-form/custom-draw-form.component.spec.ts`
- `src/app/components/custom-draw-form/join-or-self.pipe.ts` (nuevo, pipe movido sin cambios)
- `src/app/components/custom-draw-form/fields/draw-tree-select-field.component.ts` (nuevo) y su spec
- `src/app/components/custom-draw-form/fields/draw-listbox-field.component.ts` (nuevo) y su spec
- `src/app/components/custom-draw-form/fields/draw-select-button-field.component.ts` (nuevo) y su spec
- `src/app/auth/guards/app-can-activate-child.guard.spec.ts` (nuevo, solo pruebas)
- `src/app/utils/services/crud.service.ts` (escenario 05: memoria de sesión de OPTIONS)

## Pendientes

- Replicar el patrón de imports exactos + `@defer` en `crud-page-shell.component.ts` y en el resto de componentes que usan `LOCAL_BASE`.
- Evaluar `prefetch on idle` para los dialogs más usados si la carga del primer clic resulta perceptible en dispositivos reales.
- Medir en dispositivo físico de gama media/baja con `bos_perf_trace` activado.

## Pruebas sugeridas

- Navegar a `/assets` y confirmar redirección a `/assets/pumps-utilities` con el listado intacto.
- Abrir Nuevo/Editar de `asset`, `asset-type`, `capacity-type`, `asset-document` y `asset-subsidiary`; confirmar formularios, validaciones y guardado.
- Escanear un código en un campo con scanner en Android/iOS/web; probar también cancelación.
- Auditoría, Documentos, Timeline, Configuración local e Importación abren y funcionan igual.
- Confirmar en Network que no aparecen peticiones API nuevas y que los chunks diferidos se cargan solo al abrir cada dialog.
