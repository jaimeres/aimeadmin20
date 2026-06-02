# Sistema de avisos/alertas en tiempo real (Socket.IO)

- **Fecha:** 2026-05-30
- **Consecutivo:** 004
- **Tipo:** Cambio funcional

> Nota: consecutivo `004` confirmado a partir de los archivos existentes en `docs/documents/` (último era `003`).

## Resumen de lo pedido

Implementar el sistema de avisos/alertas para la app móvil mediante comunicación
por socket con el servidor. El servidor aún no lo tiene implementado, pero el
cliente debe quedar preparado localmente. Para empezar, debe enviarse un aviso
cuando el usuario inicia sesión, y debe quedar explícitamente comentado dónde
comentar para dejar de enviar ese aviso.

## Alcance del cambio

- Cliente Angular preparado para conectarse a un servidor de avisos vía Socket.IO.
- Emisión de un aviso al iniciar sesión.
- Recepción y despliegue de avisos entrantes como toast (sistema de mensajes global).
- Desconexión del socket al cerrar sesión.
- Punto explícito y comentado para desactivar el envío del aviso de login.

## Escenario 01: Avisos por socket y aviso de inicio de sesión

- Se instaló la dependencia `socket.io-client`.
- Se agregó `socket_url` a `environment.ts` (`http://127.0.0.1:8000`) y
  `environment.prod.ts` (`https://erp.jukai.io`). Cambiar a la URL real del
  socket cuando el backend esté disponible.
- Se creó `NotificationSocketService` con:
  - `connect(token)`: conecta y autentica el socket por token (resiliente; no
    rompe la app si el servidor aún no existe).
  - Escucha de eventos entrantes `notice` y `alert`, mostrados como toast.
  - `emitNotice(event, notice)` y `emitLoginNotice(user)` para emitir avisos.
  - `disconnect()` para cerrar el socket.
  - Señal reactiva `connected`.
- Integración en `AuthService`:
  - Tras un login exitoso se llama `connect()` + `emitLoginNotice()`.
  - Al cerrar sesión se llama `disconnect()` (rutas de éxito y error).

## Cómo dejar de enviar el aviso de login

En `src/app/auth/services/auth.service.ts`, dentro de `login()`, en el `tap`
posterior al login exitoso, comentar las dos líneas marcadas:

```ts
this.notificationSocketS.connect(this.access);
this.notificationSocketS.emitLoginNotice(resp.data.user);
```

El bloque está rotulado con el comentario:
"👉 PARA DEJAR DE ENVIAR EL AVISO DE LOGIN: comenta las DOS líneas siguientes".

## Decisiones tomadas

- Se usó `socket.io-client` por ser el estándar más común para este tipo de
  comunicación bidireccional con reconexión automática.
- El servicio es tolerante a fallos: si `socket_url` no está configurada o el
  servidor no responde, solo se registra en consola y no se interrumpe el login.
- Los avisos entrantes reutilizan el `MessageService` global (toast PrimeNG)
  existente, sin introducir un nuevo sistema de UI.

## Validaciones aplicadas

- El envío de avisos no falla si el socket no está conectado (se descarta y se
  registra como pendiente).
- La desconexión limpia listeners y estado.

## Notas importantes

- Eventos que el backend deberá implementar:
  - Recibir `login_notice` (aviso emitido al iniciar sesión).
  - Emitir `notice` / `alert` (avisos hacia el cliente).
- El backend deberá leer `auth.token` del handshake para autenticar el socket.

## Archivos modificados

- `package.json` (dependencia `socket.io-client`).
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
- `src/app/utils/services/notification-socket.service.ts` (nuevo)
- `src/app/utils/services/notification-socket.service.spec.ts` (nuevo)
- `src/app/auth/services/auth.service.ts`

## Pendientes

- Implementar el servidor de Socket.IO y ajustar `socket_url`.
- Definir/confirmar los nombres finales de los eventos con el backend.

## Pruebas sugeridas

- `notification-socket.service.spec.ts`: creación, estado inicial desconectado,
  `emitLoginNotice` sin conexión y `disconnect`.
- Prueba manual: iniciar sesión y verificar en consola el log
  `[NotificationSocket] (pendiente) emitiría 'login_notice'` mientras el
  servidor no exista.
