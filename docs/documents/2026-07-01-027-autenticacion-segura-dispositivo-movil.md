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

## Pendientes

- Implementar endpoints del servidor:
  `/v1/auth/biometric/register/challenge/`,
  `/v1/auth/biometric/register/validate/`,
  `/v1/auth/biometric/login/challenge/`,
  `/v1/auth/biometric/login/verify/`,
  `/v1/auth/biometric/device/{device_id}/`.
- Probar en dispositivo fisico con huella, rostro y PIN/patron segun soporte.
*** End Patch
 
