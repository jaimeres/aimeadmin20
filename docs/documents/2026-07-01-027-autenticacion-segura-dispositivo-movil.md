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
estado informado por el plugin; si el plugin no puede inicializarse, conserva un
fallback a los eventos `online` y `offline` del navegador.

El monitor inicia una sola vez desde el componente raiz. Mientras `AuthService.loggedin()`
sea verdadero, el layout muestra una advertencia al pasar a estado desconectado:
`Te quedaste sin conexion a Internet. Algunas funciones no estaran disponibles hasta
que recuperes la conexion.` El aviso se emite una sola vez por periodo offline y se
habilita nuevamente al recuperar la red. No cierra la sesion ni altera tokens, datos,
permisos o navegacion.

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
- No se agrega un timeout nuevo al login para no abortar solicitudes lentas que antes
  podian completarse.
- No se modifica `GeneralService.networkStatus()` porque el nuevo monitor cubre web y
  nativo mediante el plugin oficial y cambiar el helper legado ampliaria el alcance.
- No se muestra aviso de conexion recuperada porque no fue solicitado; el estado se
  restablece silenciosamente y permite un nuevo aviso ante otra perdida.

## Archivos de los escenarios 06 y 07

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

## Validaciones de los escenarios 06 y 07

- `npx tsc -p tsconfig.app.json --noEmit`: aprobado.
- `npx tsc -p tsconfig.spec.json --noEmit`: aprobado.
- Pruebas unitarias del clasificador y monitor: `6 SUCCESS`.
- `npm run build:prod`: aprobado con advertencias de presupuesto y dependencias
  CommonJS preexistentes.
- `npm run cap:sync`: aprobado; detecta `@capacitor/network@8.0.1` entre 11 plugins.
- `npm run android:debug`: `BUILD SUCCESSFUL`; compila y empaqueta el plugin nativo.
<!-- ]]]FI -->

## Pendientes

- Probar en dispositivo fisico con huella, rostro y PIN/patron segun soporte.
- Probar en dispositivo fisico la perdida y recuperacion de Wi-Fi/datos durante una
  sesion autenticada.
