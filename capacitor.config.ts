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
      userAuthenticationTimeout: 60, // Segundos de validez después de autenticación
      invalidatedByBiometricEnrollment: false // No invalidar si cambian las huellas
    }
  }
};

export default config;
