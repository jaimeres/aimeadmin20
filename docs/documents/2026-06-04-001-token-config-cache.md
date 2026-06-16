# Token y cache local de configuración por app

## Datos generales

- Fecha: 2026-06-04
- Consecutivo: 001
- Tipo: Cambio funcional

## Resumen

El usuario pidió dos cambios:

1. Evitar que cada cambio entre apps principales consulte `/auth/refresh/` cuando el access token sigue vigente.
2. Evitar mantener toda la configuración en memoria; guardar la configuración localmente por app/módulo y dejar en memoria solo la configuración de la app activa, sin usar SQLite.

## Alcance

Se ajusta la validación de token en guards, la carga de configuración previa a rutas principales y el almacenamiento local por módulo de configuración.

## Escenario 01: Evitar refresh innecesario en guards

Cuando `tokenValidate()` se ejecuta desde un guard, primero revisa si el access token tiene más de 20 segundos de vida. Si sigue vigente, permite continuar sin consultar `/auth/refresh/`.

## Escenario 02: Cache local de configuración por módulo

La configuración recibida desde `settings/settings/me/` se procesa una vez, se separa por módulo y se guarda por plataforma: IndexedDB en web/desktop y `Preferences` en móvil. Antes de activar una app raíz, el guard asegura que los módulos declarados en `data.configModules` estén disponibles en memoria.

Corrección posterior: se retiraron las listas hardcodeadas de `data.configModules` en rutas principales. El cache guarda ahora un índice dinámico `app -> módulos` construido desde el primer nivel recibido del servidor, junto con el índice general de módulos. Los guards resuelven la URL actual y cargan en memoria solo los módulos relacionados con esa app/ruta; `data.configModules` queda solo como compatibilidad opcional, no como registro manual.

## Escenario 03: Reemplazo de configuración al iniciar sesión

En cada inicio de sesión exitoso se vuelve a consultar `settings/settings/me/`. Antes de guardar la respuesta nueva se borra únicamente el namespace local de configuración del usuario (`bos_config_module:*`, índice de módulos e índice app/módulos). No se borra la cache general del sistema ni caches de formularios/dropdowns no pertenecientes a este namespace.

## Escenario 04: Hidratación perezosa por módulo

Cuando una ruta pública o sin configuración CRUD no tiene módulos resolubles, el guard no limpia la configuración activa. Además, `authS.config[module]` puede hidratar un módulo individual desde `localStorage` si un servicio lo lee antes de que el guard de una app CRUD lo haya cargado en memoria. Si el módulo no existe todavía en cache local, se devuelve una estructura vacía transitoria para evitar errores de constructor, sin guardarla en storage.

Esto conserva el objetivo de no cargar toda la configuración en memoria y evita errores de constructores de servicios compartidos que consultan `authS.config[module].cols` al instanciarse.

## Escenario 05: Alias de ruta y URL guardada para consumo diesel

La ruta `/warehouses/fuel-consumption` carga el componente de movimientos de almacén, pero la configuración CRUD real se identifica como `inventory-movement-detail`.

Cuando `lastModuleUrl` quedaba guardado como `/warehouses/fuel-consumption?pos=inventory-movement`, el login volvía a navegar a una URL que el guard no podía asociar con `inventory-movement-detail`; por eso el componente podía construirse sin columnas ni `drawForm` hasta refrescar o hasta entrar una vez con la URL correcta.

### Decisiones

- Se normaliza `lastModuleUrl` después del login para convertir `pos=inventory-movement` o ausencia de `pos` en `pos=inventory-movement-detail` solo para `/warehouses/fuel-consumption`.
- El índice dinámico de configuración trata `fuel-consumption` e `inventory-movement` como alias de `inventory-movement-detail`.
- El menú Diesel entra directamente con `queryParams: { pos: 'inventory-movement-detail' }`.
- No se cambia la estructura de `CRUD`, tablas ni columnas.

### Validaciones sugeridas

1. Cerrar sesión desde una URL distinta a consumo diesel.
2. Iniciar sesión y abrir Diesel / Cargar consumo desde el menú: la URL debe incluir `pos=inventory-movement-detail`.
3. Guardar manualmente `lastModuleUrl=/warehouses/fuel-consumption?pos=inventory-movement`, iniciar sesión y confirmar que navega normalizado a `inventory-movement-detail`.
4. Confirmar que columnas y formulario aparecen sin hacer F5.

<a id="escenario-06"></a>
## Escenario 06: Cargar solo el endpoint final y conservar módulos visitados

Al navegar a una ruta principal como `/assets/maintenance?pos=maintenance`, el guard estaba usando todos los segmentos de la URL. Al resolver el segmento padre `assets`, se agregaban a memoria todos los módulos hijos de esa app principal (`asset`, `maintenance`, `accessory`, `asset-type`, `location`, etc.), generando multiples `Preferences.get` aunque el componente activo solo necesitara el endpoint final.

Se cambio la resolucion para priorizar `pos`, `type` o `module` del query string. Si no existen, se usa solo el ultimo segmento de la ruta y aliases explicitos para rutas cuyo slug visual no coincide con el módulo real (`pumps-utilities` -> `asset`, `tools-and-spares` -> `asset-tools-and-spares`, etc.).

Tambien se conserva en memoria la configuracion de módulos ya visitados. `ensureConfigModules` ahora agrega los módulos solicitados a `_config` sin descartar los anteriores, de modo que volver a un endpoint ya visitado durante la misma sesion no requiere volver a leerlo desde Preferences.

Como `CRUD.changePos()` necesita acceso síncrono a `authS.config[pos]`, `CRUD` ahora hidrata el `pos` solicitado antes de ejecutar `getAll` u `openNew` cuando el módulo todavía no está en memoria. Además evita guardar secciones transitorias vacías de `drawForm` o `general`.

<a id="escenario-07"></a>
## Escenario 07: Persistir solo endpoints usados e IndexedDB en web

Se detectó que al navegar desde `/ecommerce/product-list` hacia módulos protegidos, `settings/settings/me/` respondía correctamente, pero el guard quedaba bloqueado porque la escritura de todos los módulos en `localStorage` fallaba con `QuotaExceededError`.

La estrategia se cambió para separar el índice de módulos disponibles de los módulos persistidos. El índice sigue permitiendo resolver rutas y aliases, pero solo se guarda la configuración completa de endpoints usados por el usuario durante los últimos 30 días y del endpoint requerido por la navegación actual.

Cada `CRUD.changePos()` registra el `pos` visitado en un mapa persistente por usuario. En el inicio de sesión, la respuesta vigente de `settings/settings/me/` refresca únicamente los módulos de ese mapa. Durante la sesión, los módulos visitados se conservan en memoria para evitar lecturas repetidas de Preferences/IndexedDB.

En web y desktop, la configuración modular se guarda mediante IndexedDB usando `ClientCacheStorageService`; en móvil se conserva Capacitor Preferences como etapa actual. Si la persistencia falla, la navegación no debe quedarse bloqueada: el guard apaga la máscara al finalizar y la configuración solicitada queda disponible en memoria cuando el servidor respondió.

## Decisiones tomadas

- No se usa SQLite.
- Se mantiene el contrato síncrono actual de `authS.config[module]` para no romper `CRUDService`, servicios por dominio ni `CRUD.changePos()`.
- La configuración que no corresponde a la app activa queda en cache local.
- El registro local de módulos crece automáticamente con lo que llegue del servidor; no se agregan placeholders al cache de configuración.
- La persistencia de configuración y la persistencia de dropdowns son caches separadas.
- El mapa de visitas guarda endpoints (`this.pos()`) y no datos de formulario.

## Validaciones aplicadas

- La carga de configuración se ejecuta después de validar sesión.
- El refresh solo se ejecuta si el access token no existe, está vencido o está por vencer.
- La cache local se separa por usuario usando `userId` o `username`.
- Login y login biométrico reemplazan la configuración local del usuario con la respuesta vigente del servidor.
- Las rutas sin módulos de configuración no vacían `_config`.
- Los servicios que consultan un módulo cacheado pueden hidratar solo ese módulo desde `localStorage`; si no existe cache, reciben una estructura vacía no persistida.
- La ruta de consumo diesel se resuelve a `inventory-movement-detail` aunque venga desde `fuel-consumption` o `inventory-movement`.
- Las rutas con `pos` cargan solo el módulo final indicado y mantienen en memoria los módulos ya visitados.
- Al cambiar a un `pos` secundario desde un menú CRUD, se carga su configuración antes de construir columnas o formularios.
- La persistencia de configuración ya no escribe todos los módulos completos de `settings/me`; solo escribe módulos usados o solicitados.
- El guard apaga la máscara de bloqueo aunque la carga de configuración devuelva `false`.
- 2026-06-10: `npx tsc --noEmit --pretty false` no completa por errores preexistentes de specs con `../../../testing/crud-test.helpers` faltante y `biometric-setup.component.ts` accediendo `username` sobre un `Signal`.
- `git diff --check` sin errores.
- `npm run build` exitoso. Se mantienen warnings existentes de budgets, CommonJS y stylesheet no localizado.

## Archivos modificados

- `src/app/auth/services/auth.service.ts`
- `src/app/auth/guards/app-can-activate.guard.ts`
- `src/app/auth/guards/app-can-activate-child.guard.ts`
- `src/app/utils/services/client-cache-storage.service.ts`
- `src/app.routes.ts`
- `src/app/layout/components/app.menu.ts`
- `src/app/pages/auth/login.ts`
- `src/app/pages/auth/login-enhanced.ts`
- `src/app/utils/services/crud.service.ts`
- `src/app/utils/crud.class.ts`

## Pendientes

- Si una configuración se guarda persistentemente desde UI, puede requerir invalidación o actualización puntual del módulo cacheado.
- Si una ruta usa un alias que no aparece ni como app ni como módulo en la configuración, debe exponerse una clave dinámica resoluble o pasar módulos explícitos por compatibilidad.
- Si se agrega una ruta visual cuyo slug no coincide con el módulo real y no lleva `?pos`, debe agregarse alias o query param para evitar caer en una carga amplia del padre.

## Pruebas sugeridas

- Navegar entre `/assets`, `/hr`, `/catalogues` y `/purchases` con access token vigente y confirmar que no se llama `/auth/refresh/`.
- Recargar una app principal y confirmar que la primera carga puede traer configuración del servidor si la cache no existe.
- Volver a entrar a otra app ya cacheada y confirmar que la configuración se lee localmente.
- Navegar a `/assets/maintenance?pos=maintenance` y confirmar que no se leen desde Preferences todos los módulos hermanos de `assets`.
- Volver a un endpoint ya visitado en la misma sesion y confirmar que se toma de memoria.
- Llenar `localStorage` en navegador y confirmar que la navegación no falla por guardar configuración completa, porque los módulos grandes usan IndexedDB.
