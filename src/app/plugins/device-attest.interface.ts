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
    publicKeyPem: string; // Clave pública en formato PEM
    attestationCertChainPem: string; // Cadena de certificados de atestación
    deviceId: string; // SHA256 de la clave pública (identificador único del dispositivo)
    keyAlias: string; // Alias interno de la clave en el keystore
  }>;

  /**
   * Firma un nonce usando biometría y la clave privada atestada
   * @param options - Parámetros para la firma
   * @returns Promise con la firma digital
   */
  signWithBiometrics(options: {
    nonce: string; // Base64URL encoded nonce del servidor
    userId?: string; // ID del usuario para seleccionar la clave correcta
  }): Promise<{
    signatureDerB64url: string; // Firma ECDSA SHA-256 en formato DER base64url
    keyAlias: string; // Alias de la clave utilizada
  }>;

  /**
   * Verifica la disponibilidad de autenticación biométrica en el dispositivo
   * @returns Promise con el estado de disponibilidad
   */
  checkBiometricAvailability(): Promise<{
    available: boolean; // true si la biometría está disponible
    status: 'AVAILABLE' | 'NO_HARDWARE' | 'HW_UNAVAILABLE' | 'NONE_ENROLLED' | 'UNKNOWN';
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
