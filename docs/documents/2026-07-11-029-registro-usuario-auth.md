# Registro de usuario desde pantalla publica

Fecha: 2026-07-11

Consecutivo: 029

Tipo: Cambio funcional

## Resumen

El usuario pidio verificar por que no funcionaba el boton `Registrarme` de la
pantalla publica `/auth/register`.

## Alcance

- Conectar el boton de registro con un formulario reactivo.
- Enviar el payload JSON:API al endpoint publico `/users/`.
- Respetar el contrato del servidor Djoser customizado para usuario principal.
- Mostrar mensajes de exito y error.
- Habilitar la activacion publica desde el enlace generado por Djoser.

## Escenario 01: Registrar usuario principal

La pantalla de registro era solo visual: el boton no tenia evento, los campos no
estaban ligados a un formulario util y no existia llamada al API. El backend espera
`type: "user"` con atributos `name`, `last_name`, `email`, `username`,
`user_type`, `password` y `re_password`; ademas el manager exige que `username`
sea igual a `email` para usuarios principales.

Se agrega `AuthService.register()` para publicar en `/users/` con
`authorizationCheck: true`, usando `username=email` y `user_type="ERP"` porque
esta pantalla pertenece al flujo de alta del usuario principal del ERP, no al
registro OAuth ni a usuarios locales internos.

## Escenario 02: Activar usuario desde enlace Djoser

El backend genera enlaces de activacion con el formato
`#/activate/{uid}/{token}`. La aplicacion no usaba ruteo hash global y tampoco
tenia una ruta publica `activate/:uid/:token`, por lo que el enlace llegaba al
home con el fragmento como texto de URL y nunca ejecutaba el POST de activacion.

Se agrega una ruta publica `/activate/:uid/:token`, una pantalla `Activate` y el
metodo `AuthService.activate()` para enviar el payload JSON:API requerido por
Djoser al endpoint `/users/activation/` con `type: "activation"` y atributos
`uid` y `token`.

Para conservar compatibilidad con los correos ya generados por Djoser, se agrega
un `canMatch` puntual que solo transforma el fragmento `#/activate/...` en una
navegacion Angular normal. No se cambia `withHashLocation()` ni el esquema global
de URLs de la aplicacion.

## Decisiones tomadas

- Se usa formulario reactivo y se elimina el uso de `ngModel`.
- Se agrega campo `Apellidos`, requerido por el serializer del servidor.
- El registro no inicia sesion automaticamente; el backend deja el usuario
  pendiente de activacion por correo.
- Al registrar correctamente, el usuario permanece en `/auth/register` y se
  muestra el mensaje devuelto por el servidor si existe; si no existe, se muestra
  un fallback indicando que revise su correo para activar la cuenta.
- El mensaje de exito deja de mostrarse como toast/p-message y queda fijo en la
  pantalla de registro para que el usuario lo vea. Tras el registro exitoso se
  restablece el formulario.
- La activacion no inicia sesion automaticamente; solo muestra el resultado y
  permite ir a la pantalla de login.

## Validaciones aplicadas

- `npx ng build --configuration development`

## Archivos modificados

- `src/app/pages/auth/register.ts`
- `src/app/pages/auth/activate.ts`
- `src/app/pages/auth/activate.spec.ts`
- `src/app.routes.ts`
- `src/app/auth/services/auth.service.ts`

## Pendientes

- Probar contra backend local que el correo de activacion se envia correctamente.
- Verificar en dispositivo movil que el formulario conserva layout correcto.
- Probar con un enlace real que no haya sido usado ni expirado.
