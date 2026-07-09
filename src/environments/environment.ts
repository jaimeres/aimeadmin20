// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  base_url: 'http://127.0.0.1:8000/v1',
  mk: 'localhost',
  erp: 'localhost',
  // [[[II ESC:006-01 DOC:docs/documents/2026-06-01_006_android-http-local-debug.md#escenario-01
  /**
   * Host que Android nativo usa cuando en desarrollo la app apunta a
   * localhost/127.0.0.1. En el emulador oficial de Android debe ser 10.0.2.2.
   * Si pruebas un APK en un teléfono físico, cambia este valor por la IP LAN
   * de tu PC (por ejemplo 192.168.1.50).
   */
  android_native_loopback_host: 'http://127.0.0.1:8000/v1',
  // ]]]FI
  // [[[II ESC:028-01 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-01 CONFIG
  /** Versión de la app. Cambiar aqui invalida todos los cachés automáticamente. */
  appBuild: 5,
  appVersion: '1.0.9',
  // ]]]FI
  // [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
  /**
   * URL del servidor de avisos/alertas en tiempo real (Socket.IO).
   * Aún no implementado en el servidor; se deja preparado localmente.
   * Cambiar a la URL real del socket cuando el backend esté disponible.
   */
  socket_url: 'http://127.0.0.1:8000',
  // ]]]FI
};
