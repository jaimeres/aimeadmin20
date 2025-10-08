import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

// Definición de interfaces para el plugin
export interface BiometricAuthPlugin {
  generateKeypairAndAttest(options: { challenge: string; userId?: string }): Promise<{
    publicKey: string;
    attestationChain: string[];
    deviceId: string;
    keyAlias: string;
  }>;
  signWithBiometrics(options: { challenge: string; userId?: string }): Promise<{
    signature: string;
    deviceId: string;
    keyAlias: string;
  }>;
  checkBiometricAvailability(): Promise<{ available: boolean; status: string }>;
}

// Registrar el plugin
const BiometricAuth = Capacitor.registerPlugin<BiometricAuthPlugin>('DeviceAttestPlugin');

@Injectable({
  providedIn: 'root'
})
export class BiometricAuthService {

  constructor() { }

  /**
   * Verifica si la autenticación biométrica está disponible
   */
  async isBiometricAvailable(): Promise<{ available: boolean; status: string }> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return { available: false, status: 'web_platform' };
      }

      const result = await BiometricAuth.checkBiometricAvailability();
      console.log('Biometric availability:', result);

      // Interpretar los códigos de estado de Android BiometricManager
      if (result.status.includes('0') || result.status.includes('BIOMETRIC_SUCCESS')) {
        return { available: true, status: 'biometric_available' };
      } else if (result.status.includes('7') || result.status.includes('NONE_ENROLLED')) {
        return { available: false, status: 'no_biometrics_enrolled' };
      } else if (result.status.includes('12') || result.status.includes('NO_HARDWARE')) {
        return { available: false, status: 'no_biometric_hardware' };
      } else if (result.status.includes('11') || result.status.includes('HARDWARE_UNAVAILABLE')) {
        return { available: false, status: 'biometric_hardware_unavailable' };
      }

      return result;
    } catch (error: any) {
      console.error('Error checking biometric availability:', error);
      // Intentar extraer información útil del error
      if (error.message && error.message.includes('not implemented')) {
        return { available: false, status: 'plugin_not_implemented' };
      }
      return { available: false, status: `error: ${error.message || 'unknown'}` };
    }
  }

  /**
   * Registra las credenciales biométricas del usuario
   * Genera un par de claves y obtiene la atestación del dispositivo
   */
  async registerBiometricCredentials(userId: string): Promise<{
    publicKey: string;
    attestationChain: string[];
    deviceId: string;
    keyAlias: string;
  }> {
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Biometric authentication is only available on mobile devices');
      }

      // Generar un challenge único para el registro
      const challenge = await this.generateChallenge();

      console.log('Generating biometric credentials for user:', userId);
      console.log('Challenge:', challenge);

      const result = await BiometricAuth.generateKeypairAndAttest({
        challenge: challenge,
        userId: userId
      });

      console.log('Biometric registration result:', {
        publicKeyLength: result.publicKey.length,
        attestationChainLength: result.attestationChain.length,
        deviceId: result.deviceId,
        keyAlias: result.keyAlias
      });

      return result;
    } catch (error) {
      console.error('Error registering biometric credentials:', error);
      throw this.handleBiometricError(error);
    }
  }

  /**
   * Autentica al usuario usando biometría
   */
  async authenticateWithBiometrics(challenge: string, userId?: string): Promise<{
    signature: string;
    deviceId: string;
    keyAlias: string;
  }> {
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Biometric authentication is only available on mobile devices');
      }

      console.log('Authenticating with biometrics, challenge:', challenge);

      const result = await BiometricAuth.signWithBiometrics({
        challenge: challenge,
        userId: userId
      });

      console.log('Biometric authentication result:', {
        signatureLength: result.signature.length,
        deviceId: result.deviceId,
        keyAlias: result.keyAlias
      });

      return result;
    } catch (error) {
      console.error('Error in biometric authentication:', error);
      throw this.handleBiometricError(error);
    }
  }

  /**
   * Genera un challenge aleatorio para el proceso de autenticación
   */
  private async generateChallenge(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Maneja los errores específicos de autenticación biométrica
   */
  private handleBiometricError(error: any): Error {
    const message = error?.message || 'Unknown biometric error';

    // Mapear errores específicos de biometría
    if (message.includes('UserCancel')) {
      return new Error('Autenticación biométrica cancelada por el usuario');
    } else if (message.includes('UserFallback')) {
      return new Error('El usuario eligió usar método alternativo');
    } else if (message.includes('BiometryNotAvailable')) {
      return new Error('Autenticación biométrica no disponible en este dispositivo');
    } else if (message.includes('BiometryNotEnrolled')) {
      return new Error('No hay huellas dactilares o rostros registrados');
    } else if (message.includes('BiometryLockout')) {
      return new Error('Autenticación biométrica bloqueada por múltiples intentos fallidos');
    }

    return new Error(`Error de autenticación biométrica: ${message}`);
  }

  /**
   * Método para testing - verifica que el plugin esté disponible
   */
  async testPlugin(): Promise<boolean> {
    try {
      console.log('Testing biometric plugin...');
      console.log('Is native platform:', Capacitor.isNativePlatform());
      console.log('Platform:', Capacitor.getPlatform());

      // Verificar si el plugin está registrado
      if (!BiometricAuth) {
        console.error('BiometricAuth plugin is not registered');
        return false;
      }

      console.log('BiometricAuth plugin:', BiometricAuth);

      // Intentar llamar al método más básico
      const availability = await this.isBiometricAvailable();
      console.log('Plugin test result:', availability);
      return availability.available;
    } catch (error) {
      console.error('Plugin test failed:', error);
      console.error('Error details:', JSON.stringify(error));
      return false;
    }
  }
}
