// [[[II ESC:027-01 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-01
export interface DeviceAttestPlugin {
  /**
   * Genera un par de claves EC P-256 con atestación hardware
   * @param options - Parámetros para la generación de claves
   * @returns Promise con la clave pública y cadena de certificados de atestación
   */
  generateKeypairAndAttest(options: {
    challenge: string; // Base64URL encoded challenge del servidor
    userId?: string; // ID del usuario para múltiples claves
  }): Promise<{
    publicKey?: string; // Clave pública SPKI en base64url, compatibilidad con plugin nativo actual
    publicKeyPem?: string; // Clave pública en formato PEM
    attestationChain?: string[]; // Cadena de atestación DER base64url
    attestationCertChainPem?: string; // Cadena de certificados de atestación en PEM
    deviceId: string; // SHA256 de la clave pública (identificador único del dispositivo)
    keyAlias: string; // Alias interno de la clave en el keystore
    authenticators?: string; // Autenticadores aceptados por el dispositivo/app
    securityLevel?: 'STRONGBOX' | 'TEE' | 'SOFTWARE' | 'TEE_OR_SOFTWARE_UNVERIFIED';
  }>;

  /**
   * Firma un nonce usando biometría y la clave privada atestada
   * @param options - Parámetros para la firma
   * @returns Promise con la firma digital
   */
  signWithBiometrics(options: {
    nonce?: string; // Base64URL encoded nonce del servidor
    challenge?: string; // Alias de nonce para compatibilidad con el plugin nativo
    userId?: string; // ID del usuario para seleccionar la clave correcta
  }): Promise<{
    signature?: string; // Firma ECDSA SHA-256 en formato DER base64url, compatibilidad nativa
    signatureDerB64url?: string; // Firma ECDSA SHA-256 en formato DER base64url
    deviceId?: string; // SHA256 de la clave pública
    keyAlias: string; // Alias de la clave utilizada
    authenticators?: string; // Autenticadores aceptados por el dispositivo/app
  }>;

  /**
   * Verifica la disponibilidad de autenticación biométrica en el dispositivo
   * @returns Promise con el estado de disponibilidad
   */
  checkBiometricAvailability(): Promise<{
    available: boolean; // true si la biometría está disponible
    status: 'AVAILABLE' | 'NO_HARDWARE' | 'HW_UNAVAILABLE' | 'NONE_ENROLLED' | 'DEVICE_NOT_SECURE' | 'UNKNOWN';
    authenticators?: string;
    canUseBiometricStrong?: boolean;
    canUseDeviceCredential?: boolean;
  }>;

  /**
   * Elimina una clave del keystore
   * @param options - Parámetros para eliminar la clave
   * @returns Promise confirmando la eliminación
   */
  deleteKey(options: {
    userId?: string; // ID del usuario cuya clave se va a eliminar
  }): Promise<{
    deleted: boolean; // true si se eliminó correctamente
    keyAlias: string; // Alias de la clave eliminada
  }>;
}

export interface BiometricAuthData {
  deviceId: string;
  publicKeyPem: string;
  attestationCertChainPem: string;
  registeredAt: Date;
  lastUsedAt?: Date;
  securityLevel?: 'STRONGBOX' | 'TEE' | 'SOFTWARE';
  authenticators?: string;
}

export interface BiometricLoginChallenge {
  challengeId: string;
  nonce: string;
  expiresAt: Date;
  deviceId: string;
}

export interface BiometricLoginResponse {
  signature: string;
  challengeId: string;
  deviceId: string;
  keyAlias: string;
}
// ]]]FI
