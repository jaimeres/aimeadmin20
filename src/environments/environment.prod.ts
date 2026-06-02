export const environment = {
  //production: true,
  //base_url: 'https://erp.jukai.io/v1',
  //mk: 'jukai.io',
  //erp: 'https://erp.jukai.io'

  production: true,
  //base_url: 'https://eronuh0qs0.execute-api.mx-central-1.amazonaws.com/dev/v1',
  base_url: 'http://127.0.0.1:8000/v1',
  android_native_loopback_host: 'http://127.0.0.1:8000/v1',

  mk: 'jukai.io',
  mk_red: 'https://jukai.io',
  /** Versión de la app. Cambiar aqui invalida todos los cachés automáticamente. */
  appVersion: '1.0.6',
  erp: 'https://erp.jukai.io',
  // [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
  /**
   * URL del servidor de avisos/alertas en tiempo real (Socket.IO).
   * Aún no implementado en el servidor; se deja preparado localmente.
   * Cambiar a la URL real del socket cuando el backend esté disponible.
   */
  socket_url: 'https://erp.jukai.io'
  // ]]]FI
};
