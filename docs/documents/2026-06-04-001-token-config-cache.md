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

La configuración recibida desde `settings/settings/me/` se procesa una vez, se separa por módulo y se guarda en `localStorage` en web o `Preferences` en móvil. Antes de activar una app raíz, el guard asegura que los módulos declarados en `data.configModules` estén disponibles en memoria.

Corrección posterior: se retiraron las listas hardcodeadas de `data.configModules` en rutas principales. El cache guarda ahora un índice dinámico `app -> módulos` construido desde el primer nivel recibido del servidor, junto con el índice general de módulos. Los guards resuelven la URL actual y cargan en memoria solo los módulos relacionados con esa app/ruta; `data.configModules` queda solo como compatibilidad opcional, no como registro manual.

## Escenario 03: Reemplazo de configuración al iniciar sesión

En cada inicio de sesión exitoso se vuelve a consultar `settings/settings/me/`. Antes de guardar la respuesta nueva se borra únicamente el namespace local de configuración del usuario (`bos_config_module:*`, índice de módulos e índice app/módulos). No se borra la cache general del sistema ni caches de formularios/dropdowns no pertenecientes a este namespace.

## Escenario 04: Hidratación perezosa por módulo

Cuando una ruta pública o sin configuración CRUD no tiene módulos resolubles, el guard no limpia la configuración activa. Además, `authS.config[module]` puede hidratar un módulo individual desde `localStorage` si un servicio lo lee antes de que el guard de una app CRUD lo haya cargado en memoria. Si el módulo no existe todavía en cache local, se devuelve una estructura vacía transitoria para evitar errores de constructor, sin guardarla en storage.

Esto conserva el objetivo de no cargar toda la configuración en memoria y evita errores de constructores de servicios compartidos que consultan `authS.config[module].cols` al instanciarse.

## Decisiones tomadas

- No se usa SQLite.
- Se mantiene el contrato síncrono actual de `authS.config[module]` para no romper `CRUDService`, servicios por dominio ni `CRUD.changePos()`.
- La configuración que no corresponde a la app activa queda en cache local.
- El registro local de módulos crece automáticamente con lo que llegue del servidor; no se agregan placeholders al cache de configuración.

## Validaciones aplicadas

- La carga de configuración se ejecuta después de validar sesión.
- El refresh solo se ejecuta si el access token no existe, está vencido o está por vencer.
- La cache local se separa por usuario usando `userId` o `username`.
- Login y login biométrico reemplazan la configuración local del usuario con la respuesta vigente del servidor.
- Las rutas sin módulos de configuración no vacían `_config`.
- Los servicios que consultan un módulo cacheado pueden hidratar solo ese módulo desde `localStorage`; si no existe cache, reciben una estructura vacía no persistida.
- `git diff --check` sin errores.
- `npm run build` exitoso. Se mantienen warnings existentes de budgets, CommonJS y stylesheet no localizado.

## Archivos modificados

- `src/app/auth/services/auth.service.ts`
- `src/app/auth/guards/app-can-activate.guard.ts`
- `src/app/auth/guards/app-can-activate-child.guard.ts`
- `src/app.routes.ts`
- `src/app/utils/services/crud.service.ts`

## Pendientes

- Si una configuración se guarda persistentemente desde UI, puede requerir invalidación o actualización puntual del módulo cacheado.
- Si una ruta usa un alias que no aparece ni como app ni como módulo en la configuración, debe exponerse una clave dinámica resoluble o pasar módulos explícitos por compatibilidad.

## Pruebas sugeridas

- Navegar entre `/assets`, `/hr`, `/catalogues` y `/purchases` con access token vigente y confirmar que no se llama `/auth/refresh/`.
- Recargar una app principal y confirmar que la primera carga puede traer configuración del servidor si la cache no existe.
- Volver a entrar a otra app ya cacheada y confirmar que la configuración se lee localmente.
