/// <reference types="@capacitor/push-notifications" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jukai.jukai',
  appName: 'Jukai',
  webDir: 'dist/ultima-ng/browser',
  plugins: {
    Geolocation: {
      // Configuración para plugin de geolocalización
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3600000 // 1 hora en milisegundos
    },
    DeviceAttestPlugin: {
      // Configuración para plugin de autenticación biométrica
      strongBoxBacked: true, // Intentar usar StrongBox si está disponible
      // [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01 CONFIG
      userAuthenticationTimeout: 0, // Requerir autenticación por cada firma
      invalidatedByBiometricEnrollment: true // Revocar la clave si cambian biométricos compatibles
      // ]]]FI
    },
    // [[[II ESC:025-01 DOC:docs/documents/2026-06-28-025-push-notifications-fcm-capacitor.md#escenario-01 CONFIG
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list']
    }
    // ]]]FI
  }
};

export default config;
