# Push notifications FCM en Angular/Capacitor

Fecha: 2026-06-28
Consecutivo: 025
Tipo: Cambio funcional

## Resumen

El usuario pidió implementar push notifications con `@capacitor/push-notifications`, registrar el token FCM después del login en `/v1/communications/push-device/`, guardar el id devuelto, desactivar el dispositivo en logout con `is_active=false`, sincronizar Capacitor y deshabilitar el websocket/Socket.IO. Después pidió personalizar el icono Android de los avisos push para dejar de usar un icono genérico.

## Alcance

- Se instala `@capacitor/push-notifications`.
- Se ejecuta `npx cap sync`.
- Se configura `PushNotifications.presentationOptions` en Capacitor.
- Se crea `PushDeviceService` para permisos, token nativo, registro JSON:API y desactivación.
- Se integra `AuthService` después del login y durante logout.
- Se deshabilita el uso automático de Socket.IO en login/logout.
- Se agrega un icono pequeño Android por defecto para FCM usando el isotipo Jukai.

## Escenario 01: Registrar dispositivo push después del login

Después de un login exitoso, la app intenta registrar notificaciones solo en plataformas nativas Android/iOS. El flujo consulta permisos, los solicita si están en `prompt`, obtiene el token de `PushNotifications.register()` y envía:

```json
{
  "data": {
    "type": "push-device",
    "attributes": {
      "token": "...",
      "provider": "FCM",
      "platform": "AND | IOS",
      "device_id": "...",
      "app_id": "com.jukai.jukai",
      "app_version": "...",
      "metadata": {}
    }
  }
}
```

El id devuelto en `data.id` se guarda en Capacitor Preferences con la llave `jukai_push_device_id`.

## Escenario 02: Desactivar dispositivo push en logout

Antes de limpiar tokens locales, logout intenta leer el id persistido y envía `PATCH /v1/communications/push-device/{id}/` con `is_active=false`. Si el endpoint falla, el cierre de sesión local continúa para conservar el comportamiento previo de logout tolerante a fallos.

## Escenario 03: Deshabilitar Socket.IO

El flujo de login deja de conectar `NotificationSocketService` y deja de emitir `login_notice`. También deja de desconectar explícitamente Socket.IO en logout porque el socket ya no se abre desde autenticación.

Decisión: esta regresión fue solicitada explícitamente por el usuario al pedir deshabilitar websocket. Se deja comentario en `AuthService` indicando que se debe quitar `socket.io-client` y conservar solo el socket Angular si se retoma tiempo real.

## Escenario 04: Configurar Firebase Android con Groovy build.gradle

Se verificó que el proyecto Android usa archivos Groovy (`android/build.gradle` y `android/app/build.gradle`), no Kotlin DSL (`.gradle.kts`). Por eso la opción correcta en Firebase Console es `Groovy (build.gradle)`.

La instrucción actual de Firebase muestra `plugins { id 'com.google.gms.google-services' version '4.5.0' apply false }` para proyectos Groovy con plugins DSL moderno. Este proyecto conserva la sintaxis Groovy clásica `buildscript` + `apply plugin`, así que se aplicó el equivalente compatible:

- `android/build.gradle`: `classpath 'com.google.gms:google-services:4.5.0'`.
- `android/app/build.gradle`: `apply plugin: 'com.google.gms.google-services'`.
- `android/app/build.gradle`: Firebase BoM `34.15.0`, `firebase-analytics` y `firebase-messaging`.

También se detectó que el archivo estaba en `android/google-services.json`; se copió a `android/app/google-services.json`, que es la ubicación esperada por el módulo app.

## Escenario 05: Manejar push recibidos y taps de notificación

Se agrega manejo cliente para dos estados nativos:

- App abierta: `pushNotificationReceived` actualiza el estado interno reactivo de push (`lastPushMessage`, `foregroundPushCount`) y muestra un toast global. En este caso no se navega automáticamente para no interrumpir al usuario.
- App en background/cerrada y usuario toca la notificación: `pushNotificationActionPerformed` lee `data` y navega. Primero respeta `route`, `deep_link`, `url`, `path` o `link`; si no vienen, usa fallback por datos del servidor.

Canal Android personalizado:

- Id: `jukai_communications_alerts`.
- Nombre visible: `Jukai comunicaciones`.
- Se crea desde `PushNotifications.createChannel(...)`.
- Se deja como canal default de FCM con `com.google.firebase.messaging.default_notification_channel_id`, para evitar caer en un canal genérico cuando el servidor no mande `android.notification.channel_id`.

Contrato revisado en servidor:

- `apps.communications.services.push_queue.build_delivery_payload(...)` y `apps.communications.services.fcm.build_delivery_payload(...)` construyen `notification.title/body` y `data`.
- `data` incluye: `communication_id`, `deep_link`, `delivery_id`, `notification_id`, `notification_type`, `priority`, `recipient_id`.
- Es suficiente para mostrar notificación en Android cerrada/background porque FCM recibe bloque `notification`.
- Es suficiente para navegación básica porque el cliente puede usar `deep_link` si viene o caer a `/communications/communication?pos=communication`.
- Si backend quiere navegación específica por módulo, puede mandar `deep_link` o `route` en `CommunicationNotification.payload`.

## Escenario 06: Personalizar icono pequeño Android de push

Actualización 2026-07-07.

Se agrega `com.google.firebase.messaging.default_notification_icon` en `AndroidManifest.xml` apuntando a `@drawable/ic_stat_jukai_push`. El asset se generó desde `/home/jaime/Descargas/jukai color actual(2) (2)/icononly_transparent_nobuffer.png` en variantes por densidad Android:

- `drawable-ldpi`: 18 x 18.
- `drawable-mdpi`: 24 x 24.
- `drawable-hdpi`: 36 x 36.
- `drawable-xhdpi`: 48 x 48.
- `drawable-xxhdpi`: 72 x 72.
- `drawable-xxxhdpi`: 96 x 96.

Decisión: se usó una silueta blanca con fondo transparente porque Android trata los small notification icons como máscara/tinte del sistema. Usar el PNG a color completo como small icon puede terminar mostrándose como un bloque genérico o poco legible en la bandeja.

## Decisiones

- El registro push no bloquea login si el usuario niega permisos, si Firebase no está configurado todavía o si el plugin no puede obtener token.
- Se usa `GeneralService.getDeviceId()` para conservar el identificador móvil ya existente.
- `app_version` usa `App.getInfo().version` en nativo y cae a `environment.appVersion`.
- Android queda configurado con Google Services Gradle plugin `4.5.0` y Firebase BoM `34.15.0` en sintaxis Groovy clásica, equivalente al flujo Groovy solicitado por Firebase Console.
- El cliente no navega automáticamente con la app abierta; solo actualiza estado interno y muestra toast.
- El cliente navega cuando el usuario toca la notificación desde bandeja/background/cerrada.
- El canal Android no usa un id genérico; usa `jukai_communications_alerts`.
- Android usa `ic_stat_jukai_push` como icono pequeño por defecto de FCM cuando el servidor no manda un icono específico.

## Validaciones

- Se verificó en el servidor que `PushDeviceSerializer` recibe `token`, `provider`, `platform`, `device_id`, `app_id`, `app_version`, `metadata` y que `token` es write-only.
- Se verificó que `PushDeviceViewSet.perform_create()` toma el usuario autenticado.
- Se verificó que el endpoint está registrado en `/v1/communications/push-device/`.
- `npm run build` finalizó correctamente.
- `npx cap sync` finalizó correctamente y detectó `@capacitor/push-notifications@8.1.1`.
- `npm run android:debug` finalizó correctamente con el módulo nativo `capacitor-push-notifications`.
- Después del ajuste Gradle/Firebase, `npm run android:debug` volvió a finalizar correctamente y ejecutó `:app:processDebugGoogleServices`, confirmando que `android/app/google-services.json` fue leído por el módulo app.
- Después de agregar listeners y canal `jukai_communications_alerts`, `npm run build`, `npx cap sync` y `npm run android:debug` finalizaron correctamente.
- `npx ng test --watch=false --browsers=ChromeHeadless --include src/app/communications/services/push-device.service.spec.ts` no llegó a ejecutar por fallas preexistentes de configuración de Karma: fuentes Roboto mal resueltas en `src/assets/styles.scss` y varios specs que importan `testing/crud-test.helpers` inexistente.
- Después de personalizar el icono push, se verificó que los PNG generados conservan transparencia y usan las dimensiones esperadas por densidad.
- Después de personalizar el icono push, `npm run android:debug` finalizó correctamente.

## Notas importantes

- `android/app/google-services.json` queda presente para Android. No se documenta su contenido porque es configuración del proyecto Firebase.
- No existe carpeta `ios/` ni `GoogleService-Info.plist` en el repo. La configuración iOS de AppDelegate, capability Push Notifications y plist queda pendiente de implementar hasta agregar la plataforma/proyecto iOS real.

## Archivos modificados

- `package.json`
- `package-lock.json`
- `capacitor.config.ts`
- `android/app/capacitor.build.gradle`
- `android/build.gradle`
- `android/app/build.gradle`
- `android/app/google-services.json`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/drawable-*/ic_stat_jukai_push.png`
- `android/app/src/main/res/values/strings.xml`
- `android/capacitor.settings.gradle`
- `src/app/communications/services/push-device.service.ts`
- `src/app/communications/services/push-device.service.spec.ts`
- `src/app/auth/services/auth.service.ts`
- `docs/documents/2026-06-28-025-push-notifications-fcm-capacitor.md`

## Pendientes

- Agregar/configurar proyecto `ios/` con `GoogleService-Info.plist`, Push Notifications capability y los métodos de `AppDelegate.swift` indicados por Capacitor.
- Quitar `socket.io-client` cuando se elimine definitivamente `NotificationSocketService`.

## Pruebas sugeridas

- Login en Android con `google-services.json` real y verificar `POST /v1/communications/push-device/`.
- Logout en Android y verificar `PATCH /v1/communications/push-device/{id}/`.
- Denegar permisos push y confirmar que login continúa.
- Repetir login con el mismo token y confirmar idempotencia por fingerprint en servidor.
- Enviar una push real a Android en background/cerrada y confirmar que la bandeja usa el icono `ic_stat_jukai_push`.
