export const environment = {
  //production: true,
  //base_url: 'https://erp.jukai.io/v1',
  //mk: 'jukai.io',
  //erp: 'https://erp.jukai.io'

  production: true,
  base_url: 'https://eronuh0qs0.execute-api.mx-central-1.amazonaws.com/dev/v1',
  //base_url: 'http://127.0.0.1:8000/v1',
  //android_native_loopback_host: 'http://127.0.0.1:8000/v1',

  // [[[II ESC:027-13 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-13 CONFIG
  /** Destino web independiente del API para clasificar fallos status 0. */
  connectivity_probe_url: 'https://erp.jukai.io/',
  // ]]]FI

  mk: 'jukai.io',
  mk_red: 'https://jukai.io',
  // [[[II ESC:028-01 DOC:docs/documents/2026-07-07-028-version-headers-update-policy.md#escenario-01 CONFIG
  /** Versión de la app. Cambiar aqui invalida todos los cachés automáticamente. */
  appBuild: 6,
  appVersion: '1.0.10',
  // ]]]FI
  erp: 'https://erp.jukai.io',
  // [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
  /**
   * URL del servidor de avisos/alertas en tiempo real (Socket.IO).
   * Aún no implementado en el servidor; se deja preparado localmente.
   * Cambiar a la URL real del socket cuando el backend esté disponible.
   */
  socket_url: 'https://erp.jukai.io',
  // ]]]FI
  // [[[II ESC:008-01 DOC:docs/paso-8-jukai.md CONFIG
  /**
   * URL del agente jukai. NO es el endpoint del runtime de AgentCore: ese exige
   * firma SigV4 y un navegador no puede firmarla. Apunta al proxy de invocación
   * (API Gateway + Lambda, stack `jukaiagen-agent-proxy`), que firma por el
   * navegador y reenvía el JWT del usuario sin tocarlo.
   * Ver jukaiagen/proxy/ y jukaiagen/docs/despliegue-agente.md.
   */
  agent_url: 'https://4mkjyjyaqf.execute-api.us-east-1.amazonaws.com/chat'
  // ]]]FI
};
