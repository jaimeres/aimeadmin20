# Autenticacion segura por dispositivo movil

Fecha: 2026-07-01

Consecutivo: 027

Tipo: Cambio funcional

## Resumen

Se implementa en la app movil la base de autenticacion segura por dispositivo para
usar huella, rostro o credencial segura del equipo segun capacidades del Android.
El servidor aun debe implementar el contrato de registro, challenges, verificacion
de firma y emision de tokens.

## Alcance

- Endurecer el plugin Android `DeviceAttestPlugin`.
- Alinear el contrato TypeScript del plugin.
- Integrar el registro/login seguro en el servicio Angular existente.
- Mostrar la opcion de acceso seguro en el login real cuando el dispositivo este
  registrado.
- Permitir activar el acceso seguro despues de un login tradicional exitoso.

## Escenario 01: Registro y firma segura por dispositivo

La app genera una clave EC P-256 en Android Keystore, intenta StrongBox cuando
esta disponible, solicita autenticacion de usuario por cada firma y acepta
`BIOMETRIC_STRONG | DEVICE_CREDENTIAL` en Android 11 o superior. En Android
anterior se conserva `BIOMETRIC_STRONG` por compatibilidad del CryptoObject.

## Decisiones

- No se envian datos biometricos al servidor.
- El secreto real es la clave privada no exportable del Android Keystore.
- El almacenamiento local guarda solo metadatos de registro para solicitar
  challenges; el servidor debe validar siempre device_id, challenge y firma.
- Se elimina la ventana previa de 60 segundos y se requiere autenticacion por uso.
- Se invalida la clave cuando el sistema lo permita ante cambios biometricos.

## Validaciones Aplicadas

- `npm run build`
- `npm run android:debug`

## Archivos Modificados

- `android/app/src/main/java/com/jukai/security/DeviceAttestPlugin.kt`
- `android/app/src/main/AndroidManifest.xml`
- `capacitor.config.ts`
- `src/app/plugins/device-attest.interface.ts`
- `src/app/auth/services/biometric-auth.service.ts`
- `src/app/pages/auth/login.ts`

## Escenario 02: Armonizacion con rutas y tipos del servidor

El servidor expone el flujo biometrico bajo `apps.users.routers`, incluido desde
`/v1/users/`. Como `environment.base_url` ya incluye `/v1`, el cliente llama:

- `POST /users/biometric-register-challenge/`
- `POST /users/biometric-register-validate/`
- `POST /users/biometric-login-challenge/`
- `POST /users/biometric-login-verify/`
- `DELETE /users/biometric-device/{device_id}/`

Los `type` JSON:API del cliente se alinean con los `resource_name` del servidor:

- `biometric-register`
- `biometric-login-challenge`
- `login`

`biometric-register-validate` no envia `authorizationCheck: true`, porque el
interceptor interpreta esa bandera como solicitud publica y omite el header JWT. Ese
endpoint debe ir autenticado: el servidor registra el dispositivo contra
`request.user`.

## Escenario 03: Login sin usuario visible resuelve la clave por dispositivo

El registro crea la clave del Android Keystore usando el usuario autenticado, pero
el acceso seguro desde la pantalla de login puede iniciar sin `username`. Para evitar
que Android busque el alias generico `biometric_attested_key_default`, el cliente
envia `deviceId` y, cuando exista en registros nuevos, `keyAlias` al plugin nativo.
El plugin conserva la prioridad previa por `userId`, acepta el `keyAlias` propio de
la app y, si no hay usuario, localiza la clave existente comparando el `deviceId`
con las claves del prefijo `biometric_attested_key_`.

## Escenario 04: Prompt biometrico en hilo principal Android

En equipo fisico, el toque directo del boton puede invocar el plugin desde un hilo
de Capacitor distinto al principal. AndroidX exige crear y lanzar `BiometricPrompt`
en el hilo principal del `FragmentActivity`; por eso el acceso desde DevTools podia
funcionar mientras el toque fisico devolvia `Must be called from main thread of
fragment host`. El plugin conserva la preparacion de clave/firma y ejecuta solo la
creacion/autenticacion del prompt dentro de `runOnUiThread`.

## Escenario 05: Controles biometricos en login secundario

La ventana secundaria de login (`app-login`) muestra el boton de acceso seguro
cuando el dispositivo ya tiene registro biometrico local, y muestra el check
`Activar registro biometrico en este equipo` cuando el equipo soporta biometria
pero aun no esta registrado. Al iniciar sesion con el check activo, el flujo
conserva el login tradicional y despues solicita el registro seguro por dispositivo.

El boton de acceso seguro llama el mismo flujo de `loginWithBiometrics()` que el
login principal, pero en la ventana secundaria solo autentica y cierra el dialogo,
sin cambiar la navegacion previa de ese login.

<!-- [[[II ESC:027-06 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-06 -->
## Escenario 06: Monitoreo de conectividad durante una sesion

Se instala `@capacitor/network` 8, compatible con Capacitor 8, y se sincroniza el
plugin Android. `NetworkStatusService` mantiene un `signal` de solo lectura con el
estado informado por el plugin y los eventos `online` y `offline` del navegador.
Si el plugin no puede inicializarse, el monitor del navegador permanece activo.

El monitor inicia una sola vez desde el componente raíz. La primera implementación
mostraba una advertencia temporal únicamente dentro del layout autenticado; el
escenario 10 reemplaza esa presentación por un aviso persistente y global. El cambio
de conectividad no cierra la sesión ni altera tokens, datos, permisos o navegación.

## Escenario 07: Mensajes explicitos en errores de inicio de sesion

Los dos consumidores activos del login tradicional usan un clasificador comun:

- estado HTTP `0` y red desconectada: informa falta de Internet;
- estado HTTP `0` y red conectada: informa que el servidor no es accesible, sin
  afirmar incorrectamente que el navegador demostro un error CORS;
- `401`, `403`, `404`, `408`, `429`, `5xx` y `504`: muestran mensajes especificos;
- otros errores conservan el `detail` del contrato JSON:API cuando esta disponible.

La clasificacion es exclusivamente de presentacion en el cliente. Se conserva sin
cambios el endpoint, el payload, el contrato JSON:API, CORS del servidor, la carga de
configuracion posterior al login y los flujos biometricos.

## Decisiones de los escenarios 06 y 07

- El estado `connected` indica disponibilidad de una interfaz de red, no garantiza
  que exista salida real a Internet. Por eso un estado HTTP `0` con red conectada se
  presenta como servidor inaccesible y no como CORS confirmado.
- La decisión inicial de no agregar timeout fue reemplazada por el límite de
  inactividad acotado del escenario 09, necesario para evitar Fetch estancados.
- No se modifica `GeneralService.networkStatus()` porque el nuevo monitor cubre web y
  nativo mediante el plugin oficial y cambiar el helper legado ampliaria el alcance.
- No se muestra aviso de conexion recuperada porque no fue solicitado; el estado se
  restablece silenciosamente y permite un nuevo aviso ante otra perdida.

<a id="escenario-08"></a>
## Escenario 08: Peticiones HTTP durante una desconexion

El interceptor HTTP común consulta `NetworkStatusService` antes de validar el token o
enviar una petición. Si el equipo ya está desconectado, termina inmediatamente con un
error HTTP de transporte (`status 0`), apaga el bloqueo global y, durante una sesión
autenticada, muestra el mismo aviso explícito de falta de Internet.

El mismo manejo envuelve el flujo completo, incluida la renovación del token. Esto
evita que un GET, POST u otra operación quede con la máscara de carga activa cuando
la solicitud no alcanza a enviarse. Además, cada operación activa queda suscrita al
cambio de conectividad: si la red cae después de iniciar la consulta, se cancela su
suscripción, se genera el mismo error de transporte y se libera la máscara sin esperar
a que el navegador o WebView agote su propio tiempo de espera. Si ocurre un `status 0`
mientras el monitor aún indica una red activa, se libera la carga y se informa
explícitamente que la aplicación no tiene acceso a Internet; el texto recomienda
revisar Wi-Fi, datos móviles o las restricciones de red de la aplicación.

Se conserva el clasificador propio del login para sesiones no iniciadas y no se
alteran tokens, reintentos, payloads, endpoints ni errores HTTP con respuesta del
servidor.

<a id="escenario-09"></a>
## Escenario 09: Fetch estancado al cortar y recuperar datos con la app pausada

La grabación móvil del 26 de agosto mostró una petición GET iniciada antes de
abrir el panel de Android. Los datos móviles se cortaron y recuperaron mientras
el WebView estaba pausado; al volver, el sistema ya informaba conexión, pero el
Fetch anterior no continuó ni produjo error. Por ello el listener de estado no
podía cancelar esa operación: nunca recibió el estado intermedio desconectado.

Para que ninguna operación permanezca bloqueada indefinidamente, el interceptor
aplica un límite de inactividad de 15 segundos a GET/HEAD y de 60 segundos al
resto de métodos. El margen mayor conserva las escrituras y cargas que pueden
tardar más. Al vencer el límite se cancela la suscripción HTTP, se apaga el
bloqueo global y se publica un error de transporte explícito. No se reintenta la
petición automáticamente.

Los errores de transporte generados o normalizados por el interceptor llevan la
marca interna `transportFailure`. `MessageService` la reconoce aunque el
componente consumidor intente mostrar su propio texto genérico y lo sustituye
por: "Sin acceso a Internet desde la aplicación. Revisa el Wi-Fi, los datos
móviles o las restricciones de red de la aplicación." Así no vuelve a mostrarse
`Unknown Error Failed to fetch` para este flujo.

<a id="escenario-10"></a>
## Escenario 10: Aviso global y persistente de equipo sin Internet

El aviso de conectividad deja de depender de una sesión autenticada y del layout
privado. `AppComponent`, que permanece montado para todas las rutas, incluye un
componente standalone de estado offline por encima del `router-outlet`. Por ello
el mismo aviso aparece en el login, en módulos autenticados y en módulos públicos.

Cuando el `signal connected` es falso se muestra un `p-message` de PrimeNG sin
botón de cierre con el texto: "Sin conexión a Internet. Este equipo no tiene acceso
a Internet. Revisa el Wi-Fi o los datos móviles." Permanece visible mientras el
monitor siga desconectado y se oculta automáticamente al recuperar la conexión.
No depende de una petición HTTP ni de una interacción del usuario.

El monitor combina permanentemente el plugin nativo y los eventos del navegador.
Las actualizaciones se publican dentro de `NgZone` para que Angular renderice el
cambio aunque el callback provenga del puente nativo. El aviso temporal anterior
del layout autenticado se elimina para evitar duplicados; se conservan el
clasificador del login y el manejo de peticiones estancadas.

<a id="escenario-11"></a>
## Escenario 11: Red activa sin transporte y reanudación de la app

La validación móvil con la versión `Beta 1.0.10` demostró que Android puede
seguir informando una red activa cuando la aplicación no logra transportar una
petición. También puede omitir el evento de desconexión mientras la WebView está
pausada por el panel del sistema. Por eso el estado físico del plugin no basta
para decidir si el aviso debe mostrarse.

`NetworkStatusService` conserva `connected` como estado físico y agrega el estado
efectivo `internetAvailable`. Un error HTTP `status 0` marca el transporte como no
disponible, muestra el aviso global persistente y mantiene `connected` sin cambios
para no impedir futuras solicitudes de recuperación. Una respuesta HTTP real,
incluidos errores 4xx o 5xx, vuelve a marcar el transporte disponible porque
demuestra comunicación con el servidor.

Al regresar la aplicación a primer plano se consulta nuevamente
`Network.getStatus()`. Esto recupera el cambio físico ocurrido mientras Android
tenía pausada la WebView. El aviso diferencia los dos casos: si el plugin informa
desconexión, indica que el equipo no tiene Internet; si hay red física pero falló
el transporte, indica que la aplicación no puede acceder a Internet y sugiere
revisar también sus restricciones de red.

El login combina el fallo de transporte con el estado físico del plugin y ya no
presenta el texto ambiguo que atribuía el problema a un servidor fuera de línea.
Si Android todavía muestra una red activa, el login aclara que la aplicación no
puede acceder a Internet; si el plugin informa desconexión, señala que el equipo
no tiene Internet. No se agrega un heartbeat externo: una restricción exclusiva
de la app se detecta al fallar la primera consulta; una desconexión física se
detecta mediante el plugin, los eventos del navegador o la verificación al
reanudar.

<a id="escenario-12"></a>
## Escenario 12: Servidor loopback apagado con Internet disponible

Las grabaciones del 27 de agosto en `localhost:4201` mostraron que, cuando el
API configurado en `127.0.0.1:8000` estaba apagado, tanto el login como las
consultas autenticadas recibían `status 0`. El interceptor trataba ese resultado
como pérdida de transporte general, activaba el estado global sin Internet y
mostraba un diagnóstico incorrecto aunque el navegador conservara conexión.

La clasificación ahora reconoce únicamente destinos loopback (`localhost`,
`127.0.0.1` y `::1`). Si el monitor físico continúa conectado y falla uno de
esos destinos, se libera la máscara de carga y se informa "Servidor local no
disponible", pero no se marca `internetAvailable` como falso. El error normalizado
conserva la marca `localServerFailure` para que el login y los consumidores de
`MessageService` mantengan el mismo diagnóstico y no lo conviertan posteriormente
en un aviso de falta de Internet.

Si el monitor físico informa desconexión, se conserva el aviso global sin
Internet aunque el destino sea local. La extensión de esta distinción a
endpoints remotos de producción queda definida en el escenario 13 mediante una
comprobación independiente; no se intenta deducirla únicamente del `status 0`.

<a id="escenario-13"></a>
## Escenario 13: Separar caída del API y falta de Internet en producción

El alcance del escenario 12 era insuficiente: distinguir sólo loopback resolvía
el desarrollo local, pero un API remoto caído en producción también produce
`status 0`. El estado físico de Android tampoco resuelve la ambigüedad porque
puede permanecer conectado aunque la aplicación no tenga salida real.

Cuando una petición remota termina con `status 0` y el monitor físico sigue
conectado, `NetworkStatusService` ejecuta una comprobación bajo demanda contra
el frontend `https://erp.jukai.io/`, que es independiente del endpoint del API.
La consulta usa `HEAD`, evita caché, agrega un parámetro único y se cancela a los
cuatro segundos. Las comprobaciones simultáneas comparten la misma promesa para
no multiplicar tráfico. No se agrega un heartbeat periódico.

- Si la comprobación responde, Internet está disponible: no se activa el banner
  global y el error se marca `serverUnavailable`. El login y las consultas
  autenticadas muestran "Servidor no disponible".
- Si la comprobación falla, se conserva la clasificación de falta de Internet,
  se activa el banner persistente y se mantienen los mensajes del escenario 11.
- Si el plugin ya informa desconexión física, no se ejecuta la comprobación.
- Los estados HTTP reales, incluidos 4xx y 5xx, se conservan sin reclasificación.

### Contrato de configuración

| Ruta | Productor | Consumidor | Estado | Riesgo/acción |
| --- | --- | --- | --- | --- |
| `environment.connectivity_probe_url` | `environment.ts` y `environment.prod.ts` | `NetworkStatusService.probeInternetAccess()` | Activa, sólo cliente | Debe permanecer en un origen web independiente del API; cambiarla al mismo API elimina la distinción. |

No existe transporte ni consumidor en el servidor para esta clave: es una
configuración de compilación exclusiva del cliente y no participa en JSON:API,
serializers, create, update/PATCH ni configuración persistida.

## Archivos de los escenarios 06, 07, 08, 09, 10, 11, 12 y 13

- `package.json`
- `package-lock.json`
- `android/app/capacitor.build.gradle`
- `android/capacitor.settings.gradle`
- `src/app.component.ts`
- `src/app/utils/services/network-status.service.ts`
- `src/app/utils/services/network-status.service.spec.ts`
- `src/app/auth/utils/login-error.util.ts`
- `src/app/auth/utils/login-error.util.spec.ts`
- `src/app/auth/services/auth.service.ts`
- `src/app/pages/auth/login.ts`
- `src/app/layout/components/app.layout.ts`
- `src/app/auth/interceptors/token-access.interceptor.ts`
- `src/app/auth/interceptors/token-access.interceptor.spec.ts`
- `src/app/components/services/message.service.ts`
- `src/app/components/services/message.service.spec.ts`
- `src/app/components/offline-banner/offline-banner.component.ts`
- `src/app/components/offline-banner/offline-banner.component.html`
- `src/app/components/offline-banner/offline-banner.component.scss`
- `src/app/components/offline-banner/offline-banner.component.spec.ts`
- `src/app/utils/native-local-url.util.ts`
- `src/app/utils/native-local-url.util.spec.ts`
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

## Validaciones de los escenarios 06, 07, 08, 09, 10, 11, 12 y 13

- `npx tsc -p tsconfig.app.json --noEmit`: aprobado.
- `npx tsc -p tsconfig.spec.json --noEmit`: aprobado.
- Pruebas unitarias del clasificador y monitor: `6 SUCCESS`.
- `npm run build:prod`: aprobado con advertencias de presupuesto y dependencias
  CommonJS preexistentes.
- `npm run cap:sync`: aprobado; detecta `@capacitor/network@8.0.1` entre 11 plugins.
- `npm run android:debug`: `BUILD SUCCESSFUL`; compila y empaqueta el plugin nativo.
- Pruebas dirigidas de monitor, clasificador de login, interceptor, mensajes,
  comprobación remota, loopback y banner global: `32 SUCCESS`;
  cubren desconexión previa, desconexión durante la renovación del token y
  durante una consulta pendiente, timeout sin evento de red, normalización del
  mensaje, `status 0` con el monitor conectado y visibilidad persistente del
  aviso global.
- `npm run build`: aprobado con las advertencias de presupuesto, CommonJS y hoja
  `/layout/styles/preloading.css` ya presentes.
<!-- ]]]FI -->

## Pendientes

- Probar en dispositivo fisico con huella, rostro y PIN/patron segun soporte.
- Probar en dispositivo fisico la perdida y recuperacion de Wi-Fi/datos durante una
  sesion autenticada.
