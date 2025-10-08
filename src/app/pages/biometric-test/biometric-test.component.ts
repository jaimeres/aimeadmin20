import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BiometricAuthService } from '../../shared/services/biometric-auth.service';

@Component({
  selector: 'app-biometric-test',
  templateUrl: './biometric-test.component.html',
  styleUrls: ['./biometric-test.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BiometricTestComponent implements OnInit {

  public testResults: string[] = [];
  public isLoading = false;
  public biometricAvailable = false;
  public userId = 'test-user-001';

  // Datos del registro
  public registrationData: {
    publicKey?: string;
    deviceId?: string;
    attestationChain?: string[];
    keyAlias?: string;
  } = {};

  // Datos de autenticación
  public authData: {
    signature?: string;
    deviceId?: string;
    keyAlias?: string;
  } = {};

  constructor(
    private biometricAuth: BiometricAuthService
  ) { }

  async ngOnInit() {
    await this.checkBiometricAvailability();
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.testResults.unshift(`[${timestamp}] ${message}`);
    console.log(message);
  }

  async checkBiometricAvailability() {
    this.isLoading = true;
    try {
      this.log('🔍 Verificando disponibilidad biométrica...');
      const result = await this.biometricAuth.isBiometricAvailable();
      this.biometricAvailable = result.available;

      // Mensajes más específicos según el estado
      if (result.available) {
        this.log(`✅ Biométrica disponible - Status: ${result.status}`);
      } else {
        switch (result.status) {
          case 'no_biometrics_enrolled':
            this.log(`⚠️  Dispositivo compatible pero sin biometría configurada`);
            this.log(`💡 Para usar esta funcionalidad:`);
            this.log(`   1. Ve a Configuración > Seguridad`);
            this.log(`   2. Configura huella dactilar o reconocimiento facial`);
            this.log(`   3. Prueba nuevamente`);
            break;
          case 'no_biometric_hardware':
            this.log(`❌ Este dispositivo NO tiene hardware biométrico`);
            this.log(`📱 Dispositivos compatibles requieren:`);
            this.log(`   - Sensor de huella dactilar`);
            this.log(`   - Cámara frontal para reconocimiento facial`);
            break;
          case 'biometric_hardware_unavailable':
            this.log(`⚠️  Hardware biométrico temporalmente no disponible`);
            this.log(`🔄 Intenta reiniciar la aplicación o el dispositivo`);
            break;
          case 'web_platform':
            this.log(`❌ Biometría no disponible en navegador web`);
            this.log(`📱 Esta funcionalidad requiere dispositivo móvil`);
            break;
          case 'plugin_not_implemented':
            this.log(`❌ Plugin biométrico no está instalado correctamente`);
            break;
          default:
            this.log(`❌ Biométrica NO disponible - Status: ${result.status}`);
        }
      }
    } catch (error: any) {
      this.log(`❌ Error verificando biométrica: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  async testPlugin() {
    this.isLoading = true;
    try {
      this.log('🧪 Probando plugin biométrico...');
      const result = await this.biometricAuth.testPlugin();

      if (result) {
        this.log('✅ Plugin biométrico funciona correctamente');
      } else {
        this.log('❌ Plugin biométrico no está funcionando');
      }
    } catch (error: any) {
      this.log(`❌ Error en test del plugin: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  async registerBiometric() {
    if (!this.biometricAvailable) {
      this.log('❌ No se puede registrar: biométrica no disponible');
      return;
    }

    this.isLoading = true;
    try {
      this.log(`📱 Iniciando registro biométrico para usuario: ${this.userId}`);

      const result = await this.biometricAuth.registerBiometricCredentials(this.userId);

      // Guardar datos del registro
      this.registrationData = {
        publicKey: result.publicKey,
        deviceId: result.deviceId,
        attestationChain: result.attestationChain,
        keyAlias: result.keyAlias
      };

      this.log(`✅ Registro exitoso!`);
      this.log(`🔑 Device ID: ${result.deviceId}`);
      this.log(`🗝️  Key Alias: ${result.keyAlias}`);
      this.log(`📄 Clave pública (${result.publicKey.length} chars): ${result.publicKey.substring(0, 50)}...`);
      this.log(`📜 Certificados de atestación: ${result.attestationChain.length} certificados`);

      // Mostrar información adicional
      result.attestationChain.forEach((cert, index) => {
        this.log(`📋 Cert ${index + 1} (${cert.length} chars): ${cert.substring(0, 30)}...`);
      });

    } catch (error: any) {
      this.log(`❌ Error en registro biométrico: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  async authenticateBiometric() {
    if (!this.registrationData.deviceId) {
      this.log('❌ No se puede autenticar: no hay registro previo');
      return;
    }

    this.isLoading = true;
    try {
      // Simular un challenge del servidor
      const challenge = this.generateTestChallenge();
      this.log(`🔐 Iniciando autenticación biométrica con challenge: ${challenge.substring(0, 20)}...`);

      const result = await this.biometricAuth.authenticateWithBiometrics(challenge, this.userId);

      // Guardar datos de autenticación
      this.authData = {
        signature: result.signature,
        deviceId: result.deviceId,
        keyAlias: result.keyAlias
      };

      this.log(`✅ Autenticación exitosa!`);
      this.log(`🔑 Device ID: ${result.deviceId}`);
      this.log(`🗝️  Key Alias: ${result.keyAlias}`);
      this.log(`✍️  Firma (${result.signature.length} chars): ${result.signature.substring(0, 50)}...`);

      // Verificar que el deviceId coincide
      if (result.deviceId === this.registrationData.deviceId) {
        this.log(`✅ Device ID coincide con el registro`);
      } else {
        this.log(`⚠️  Device ID NO coincide con el registro`);
      }

    } catch (error: any) {
      this.log(`❌ Error en autenticación biométrica: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  clearResults() {
    this.testResults = [];
    this.registrationData = {};
    this.authData = {};
    this.log('🧹 Resultados limpiados');
  }

  private generateTestChallenge(): string {
    // Generar un challenge de prueba similar al que enviaría el servidor
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  // Métodos para mostrar/ocultar datos técnicos
  showRegistrationDetails() {
    if (!this.registrationData.publicKey) return;

    this.log('--- DETALLES DE REGISTRO ---');
    this.log(`Clave pública completa: ${this.registrationData.publicKey}`);
    this.registrationData.attestationChain?.forEach((cert, i) => {
      this.log(`Certificado ${i + 1}: ${cert}`);
    });
  }

  showAuthDetails() {
    if (!this.authData.signature) return;

    this.log('--- DETALLES DE AUTENTICACIÓN ---');
    this.log(`Firma completa: ${this.authData.signature}`);
  }
}
