import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { MessageService } from '../../components/services/message.service';
import { environment } from '../../../environments/environment';
import { DeviceAttestPlugin, BiometricAuthData, BiometricLoginChallenge, BiometricLoginResponse } from '../../plugins/device-attest.interface';

// [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01
const DeviceAttest = registerPlugin<DeviceAttestPlugin>('DeviceAttestPlugin');

@Injectable({
  providedIn: 'root'
})
export class BiometricAuthService {
  private readonly STORAGE_KEY_PREFIX = 'biometric_auth_';
  private readonly BASE_URL = environment.base_url;
  private deviceAttestPlugin?: DeviceAttestPlugin;

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {
    this.initializePlugin();
  }

  private initializePlugin(): void {
    if (Capacitor.isNativePlatform()) {
      this.deviceAttestPlugin = DeviceAttest;
    }
  }

  /**
   * Verifica si la autenticación biométrica está disponible
   */
  public checkBiometricAvailability(): Observable<{ available: boolean; status: string }> {
    if (!this.isNativePlatform() || !this.deviceAttestPlugin) {
      return of({ available: false, status: 'NOT_SUPPORTED_ON_WEB' });
    }

    return from(this.deviceAttestPlugin.checkBiometricAvailability()).pipe(
      catchError(error => {
        console.error('Error checking biometric availability:', error);
        return of({ available: false, status: 'ERROR' });
      })
    );
  }

  /**
   * Registra el dispositivo para autenticación biométrica
   */
  public registerDeviceForBiometric(userId?: string): Observable<BiometricAuthData> {
    if (!this.isNativePlatform() || !this.deviceAttestPlugin) {
      return throwError(() => new Error('Biometric authentication not available on this platform'));
    }

    // Paso 1: Solicitar challenge del servidor
    return this.requestRegistrationChallenge().pipe(
      switchMap(({ challenge, challengeId }) => {
        // Paso 2: Generar keypair con atestación
        return from(this.deviceAttestPlugin!.generateKeypairAndAttest({
          challenge,
          userId
        })).pipe(
          switchMap(attestationResult => {
            const publicKeyPem = attestationResult.publicKeyPem || '';
            const publicKey = attestationResult.publicKey || publicKeyPem;
            const attestationCertChainPem = attestationResult.attestationCertChainPem || '';
            const attestationChain = attestationResult.attestationChain || [];

            // Paso 3: Enviar atestación al servidor para validación
            return this.submitAttestationForValidation({
              challengeId,
              publicKey,
              publicKeyPem,
              attestationChain,
              attestationCertChainPem,
              deviceId: attestationResult.deviceId
            }).pipe(
              tap(validationResult => {
                // Paso 4: Guardar datos localmente
                const biometricData: BiometricAuthData = {
                  deviceId: attestationResult.deviceId,
                  keyAlias: attestationResult.keyAlias,
                  publicKeyPem: publicKeyPem || publicKey,
                  attestationCertChainPem,
                  registeredAt: new Date(),
                  securityLevel: validationResult.securityLevel,
                  authenticators: attestationResult.authenticators
                };
                this.saveBiometricData(userId, biometricData);
              }),
              switchMap(validationResult => of({
                deviceId: attestationResult.deviceId,
                keyAlias: attestationResult.keyAlias,
                publicKeyPem: publicKeyPem || publicKey,
                attestationCertChainPem,
                registeredAt: new Date(),
                securityLevel: validationResult.securityLevel,
                authenticators: attestationResult.authenticators
              } as BiometricAuthData))
            );
          })
        );
      }),
      catchError(error => {
        console.error('Device registration failed:', error);
        this.messageService.changeMessage(
          'Error al registrar dispositivo para autenticación biométrica',
          error,
          {},
          'error'
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Inicia sesión usando autenticación biométrica
   */
  public loginWithBiometrics(userId?: string): Observable<{ access: string; refresh: string; user: any }> {
    if (!this.isNativePlatform() || !this.deviceAttestPlugin) {
      return throwError(() => new Error('Biometric authentication not available on this platform'));
    }

    const biometricData = this.getBiometricData(userId);
    if (!biometricData) {
      return throwError(() => new Error('Device not registered for biometric authentication'));
    }

    // Paso 1: Solicitar challenge de login
    return this.requestLoginChallenge(biometricData.deviceId).pipe(
      switchMap((challenge: BiometricLoginChallenge) => {
        // Paso 2: Firmar con biometría
        return from(this.deviceAttestPlugin!.signWithBiometrics({
          nonce: challenge.nonce,
          challenge: challenge.nonce,
          userId,
          deviceId: biometricData.deviceId,
          keyAlias: biometricData.keyAlias
        })).pipe(
          switchMap(signatureResult => {
            // Paso 3: Verificar firma en el servidor
            const loginData: BiometricLoginResponse = {
              signature: signatureResult.signatureDerB64url || signatureResult.signature || '',
              challengeId: challenge.challengeId,
              deviceId: biometricData.deviceId,
              keyAlias: signatureResult.keyAlias
            };

            return this.verifyBiometricSignature(loginData);
          }),
          tap(() => {
            // Actualizar fecha de último uso
            biometricData.lastUsedAt = new Date();
            this.saveBiometricData(userId, biometricData);
          })
        );
      }),
      catchError(error => {
        console.error('Biometric login failed:', error);
        this.messageService.changeMessage(
          'Error en autenticación biométrica',
          error,
          {},
          'error'
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina el registro biométrico del dispositivo
   */
  public unregisterDevice(userId?: string): Observable<boolean> {
    if (!this.isNativePlatform() || !this.deviceAttestPlugin) {
      return of(true); // No hay nada que eliminar en web
    }

    const biometricData = this.getBiometricData(userId);
    if (!biometricData) {
      return of(true); // Ya no está registrado
    }

    return from(this.deviceAttestPlugin.deleteKey({
      userId,
      deviceId: biometricData.deviceId,
      keyAlias: biometricData.keyAlias
    })).pipe(
      tap(() => {
        // Eliminar datos locales
        this.removeBiometricData(userId);
      }),
      switchMap(() => {
        // Notificar al servidor
        return this.http.delete(`${this.BASE_URL}/users/biometric-device/${biometricData.deviceId}/`).pipe(
          map(() => true),
          catchError(error => {
            console.warn('Failed to unregister device on server:', error);
            return of(true); // No fallar si el servidor no responde
          })
        );
      }),
      catchError(error => {
        console.error('Failed to unregister device:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verifica si el dispositivo está registrado para autenticación biométrica
   */
  public isDeviceRegistered(userId?: string): boolean {
    return this.getBiometricData(userId) !== null;
  }

  /**
   * Obtiene información del registro biométrico
   */
  public getBiometricInfo(userId?: string): BiometricAuthData | null {
    return this.getBiometricData(userId);
  }

  // Métodos privados

  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  private requestRegistrationChallenge(): Observable<{ challenge: string; challengeId: string }> {
    return this.http.post<{ challenge: string; challengeId: string }>(
      `${this.BASE_URL}/users/biometric-register-challenge/`,
      {}
    ).pipe(
      map(response => this.normalizeRegistrationChallenge(response))
    );
  }

  private submitAttestationForValidation(data: {
    challengeId: string;
    publicKey: string;
    publicKeyPem: string;
    attestationChain: string[];
    attestationCertChainPem: string;
    deviceId: string;
  }): Observable<{ valid: boolean; securityLevel: 'STRONGBOX' | 'TEE' | 'SOFTWARE' }> {
    return this.http.post<{ valid: boolean; securityLevel: 'STRONGBOX' | 'TEE' | 'SOFTWARE' }>(
      `${this.BASE_URL}/users/biometric-register-validate/`,
      {
        data: {
          type: 'biometric-register',
          attributes: {
            challenge_id: data.challengeId,
            public_key: data.publicKey,
            public_key_pem: data.publicKeyPem,
            attestation_chain: data.attestationChain,
            attestation_cert_chain_pem: data.attestationCertChainPem,
            device_id: data.deviceId
          }
        }
      }
    ).pipe(
      map(response => this.unwrapAttributes(response))
    );
  }

  private requestLoginChallenge(deviceId: string): Observable<BiometricLoginChallenge> {
    return this.http.post<BiometricLoginChallenge>(
      `${this.BASE_URL}/users/biometric-login-challenge/`,
      {
        authorizationCheck: true,
        data: {
          type: 'biometric-login-challenge',
          attributes: { device_id: deviceId }
        }
      }
    ).pipe(
      map(response => this.normalizeLoginChallenge(response))
    );
  }

  private verifyBiometricSignature(loginData: BiometricLoginResponse): Observable<{ access: string; refresh: string; user: any }> {
    return this.http.post<{ access: string; refresh: string; user: any }>(
      `${this.BASE_URL}/users/biometric-login-verify/`,
      {
        authorizationCheck: true,
        data: {
          type: 'login',
          attributes: {
            signature: loginData.signature,
            challenge_id: loginData.challengeId,
            device_id: loginData.deviceId,
            key_alias: loginData.keyAlias
          }
        }
      }
    ).pipe(
      map(response => this.normalizeLoginResponse(response))
    );
  }

  private unwrapAttributes<T = any>(response: any): T {
    return (response?.data?.attributes || response?.data || response) as T;
  }

  private normalizeRegistrationChallenge(response: any): { challenge: string; challengeId: string } {
    const attrs = this.unwrapAttributes<any>(response);
    return {
      challenge: attrs.challenge || attrs.nonce,
      challengeId: attrs.challengeId || attrs.challenge_id
    };
  }

  private normalizeLoginChallenge(response: any): BiometricLoginChallenge {
    const attrs = this.unwrapAttributes<any>(response);
    return {
      challengeId: attrs.challengeId || attrs.challenge_id,
      nonce: attrs.nonce || attrs.challenge,
      expiresAt: attrs.expiresAt || attrs.expires_at,
      deviceId: attrs.deviceId || attrs.device_id
    };
  }

  private normalizeLoginResponse(response: any): { access: string; refresh: string; user: any } {
    const attrs = this.unwrapAttributes<any>(response);
    return {
      access: attrs.access,
      refresh: attrs.refresh,
      user: attrs.user
    };
  }

  private getStorageKey(userId?: string): string {
    return `${this.STORAGE_KEY_PREFIX}${userId || 'default'}`;
  }

  private saveBiometricData(userId: string | undefined, data: BiometricAuthData): void {
    try {
      const serialized = JSON.stringify({
        ...data,
        registeredAt: data.registeredAt.toISOString(),
        lastUsedAt: data.lastUsedAt?.toISOString()
      });
      localStorage.setItem(this.getStorageKey(userId), serialized);
      if (userId) {
        localStorage.setItem(this.getStorageKey(), serialized);
      }
    } catch (error) {
      console.error('Failed to save biometric data:', error);
    }
  }

  private getBiometricData(userId?: string): BiometricAuthData | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(userId));
      if (!data) return null;

      const parsed = JSON.parse(data);
      return {
        ...parsed,
        registeredAt: new Date(parsed.registeredAt),
        lastUsedAt: parsed.lastUsedAt ? new Date(parsed.lastUsedAt) : undefined
      };
    } catch (error) {
      console.error('Failed to get biometric data:', error);
      return null;
    }
  }

  private removeBiometricData(userId?: string): void {
    try {
      const current = this.getBiometricData(userId);
      const defaultData = userId ? this.getBiometricData() : null;
      localStorage.removeItem(this.getStorageKey(userId));
      if (!userId || current?.deviceId === defaultData?.deviceId) {
        localStorage.removeItem(this.getStorageKey());
      }
    } catch (error) {
      console.error('Failed to remove biometric data:', error);
    }
  }
}
// ]]]FI
