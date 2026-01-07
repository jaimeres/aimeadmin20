# Plugins Nativos de Android - Documentación

## 📋 Resumen

La aplicación Jukai incluye **8 plugins nativos** de Capacitor, 7 oficiales y 1 personalizado, todos completamente funcionales y compilados en el APK.

---

## 🔌 Plugins Oficiales de Capacitor

### 1. @capacitor-community/sqlite (v7.0.2)
**Propósito**: Base de datos SQLite local con encriptación

**Características**:
- ✅ Base de datos relacional local
- ✅ SQLCipher para encriptación de datos
- ✅ Soporte para consultas complejas
- ✅ Transacciones ACID

**Uso en la app**:
```typescript
import { CapacitorSQLite } from '@capacitor-community/sqlite';

// Crear/abrir base de datos encriptada
const db = await CapacitorSQLite.createConnection({
  database: 'jukai_db',
  encrypted: true,
  mode: 'secret'
});
```

**Configuración Android**:
- Incluye librería nativa `libsqlcipher.so`
- Sin configuración adicional requerida

---

### 2. @capacitor/app (v7.1.0)
**Propósito**: Gestión del ciclo de vida de la aplicación

**Características**:
- ✅ Detectar cuando la app pasa a background/foreground
- ✅ Obtener información de la app
- ✅ Manejar deep links
- ✅ Eventos de estado de la aplicación

**Uso**:
```typescript
import { App } from '@capacitor/app';

// Escuchar cambios de estado
App.addListener('appStateChange', ({ isActive }) => {
  console.log('App state changed. Is active?', isActive);
});
```

---

### 3. @capacitor/browser (v7.0.2)
**Propósito**: Abrir URLs en el navegador del sistema

**Características**:
- ✅ Abrir links externos
- ✅ Custom Tabs en Android
- ✅ Control de presentación

**Uso**:
```typescript
import { Browser } from '@capacitor/browser';

await Browser.open({ url: 'https://example.com' });
```

---

### 4. @capacitor/camera (v7.0.2)
**Propósito**: Acceso a la cámara del dispositivo

**Características**:
- ✅ Captura de fotos
- ✅ Selección desde galería
- ✅ Control de calidad de imagen
- ✅ Soporte para múltiples formatos

**Uso**:
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Uri
});
```

**Permisos requeridos** (ya configurados):
- `android.permission.CAMERA`
- `android.permission.READ_EXTERNAL_STORAGE`
- `android.permission.WRITE_EXTERNAL_STORAGE`

---

### 5. @capacitor/device (v7.0.2)
**Propósito**: Información del dispositivo

**Características**:
- ✅ Obtener UUID único
- ✅ Modelo del dispositivo
- ✅ Sistema operativo y versión
- ✅ Información de batería

**Uso**:
```typescript
import { Device } from '@capacitor/device';

const info = await Device.getInfo();
// { platform: 'android', model: 'Pixel 6', uuid: '...' }
```

---

### 6. @capacitor/geolocation (v7.1.5)
**Propósito**: Geolocalización GPS

**Características**:
- ✅ Obtener posición actual
- ✅ Seguimiento de ubicación en tiempo real
- ✅ Control de precisión
- ✅ Timeout configurables

**Configuración en capacitor.config.ts**:
```typescript
Geolocation: {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 3600000
}
```

**Uso**:
```typescript
import { Geolocation } from '@capacitor/geolocation';

const position = await Geolocation.getCurrentPosition({
  enableHighAccuracy: true
});
```

**Permisos requeridos** (ya configurados):
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`

---

### 7. @capacitor/preferences (v7.0.2)
**Propósito**: Almacenamiento de preferencias key-value

**Características**:
- ✅ Guardar configuraciones del usuario
- ✅ Persistencia entre sesiones
- ✅ API simple key-value
- ✅ SharedPreferences en Android

**Uso**:
```typescript
import { Preferences } from '@capacitor/preferences';

// Guardar
await Preferences.set({ key: 'theme', value: 'dark' });

// Leer
const { value } = await Preferences.get({ key: 'theme' });

// Eliminar
await Preferences.remove({ key: 'theme' });
```

---

## 🛡️ Plugin Nativo Personalizado

### 8. DeviceAttestPlugin (Custom)
**Propósito**: Autenticación biométrica avanzada con Android Keystore

**Archivo**: `android/app/src/main/java/com/jukai/security/DeviceAttestPlugin.kt`

**Características**:
- ✅ Autenticación biométrica (huella dactilar, reconocimiento facial)
- ✅ Generación de pares de claves RSA/EC en Android Keystore
- ✅ Certificados de attestation
- ✅ StrongBox Keymaster support (TEE seguro)
- ✅ Claves protegidas por hardware
- ✅ Validación de integridad del dispositivo

**Configuración en capacitor.config.ts**:
```typescript
DeviceAttestPlugin: {
  strongBoxBacked: true,
  userAuthenticationTimeout: 60,
  invalidatedByBiometricEnrollment: false
}
```

**Métodos disponibles**:

#### `isAvailable()`
Verifica si la autenticación biométrica está disponible
```typescript
const { available } = await DeviceAttest.isAvailable();
```

#### `authenticate()`
Autentica al usuario con biometría
```typescript
const result = await DeviceAttest.authenticate({
  reason: 'Confirma tu identidad',
  title: 'Autenticación requerida'
});
```

#### `generateKeyPair()`
Genera un par de claves RSA en el Keystore
```typescript
const { success } = await DeviceAttest.generateKeyPair({
  alias: 'user_key',
  requireAuth: true
});
```

#### `signData()`
Firma datos con la clave privada
```typescript
const { signature } = await DeviceAttest.signData({
  alias: 'user_key',
  data: 'datos a firmar'
});
```

#### `getAttestation()`
Obtiene certificado de attestation
```typescript
const { certificate } = await DeviceAttest.getAttestation({
  alias: 'user_key'
});
```

**Dependencias Android** (ya incluidas):
```gradle
implementation "androidx.biometric:biometric:1.1.0"
implementation "androidx.fragment:fragment-ktx:1.6.2"
```

**Permisos requeridos**:
- `android.permission.USE_BIOMETRIC`

**Registro del plugin**:
Se registra automáticamente al ejecutar:
```bash
node scripts/register-plugin.js
```

---

## 🔐 Seguridad

### Android Keystore
Todos los plugins que requieren almacenamiento seguro utilizan Android Keystore:
- ✅ SQLite: Claves de encriptación en Keystore
- ✅ DeviceAttestPlugin: Claves RSA/EC en hardware secure element
- ✅ Preferences: Opcional encriptación con Keystore

### StrongBox
El plugin biométrico intenta usar StrongBox cuando está disponible:
- Hardware secure element dedicado
- Resistente a ataques físicos
- Disponible en dispositivos Android 9+ con chip específico

---

## 📱 Compatibilidad

| Plugin | Min SDK | Notas |
|--------|---------|-------|
| SQLite | 22 | ✅ Universal |
| App | 22 | ✅ Universal |
| Browser | 22 | ✅ Universal |
| Camera | 22 | ✅ Universal |
| Device | 22 | ✅ Universal |
| Geolocation | 22 | ✅ Universal |
| Preferences | 22 | ✅ Universal |
| DeviceAttest | 23 | Biometría API disponible desde API 23 |

**Min SDK del proyecto**: 22 (Android 5.1)  
**Target SDK**: 34 (Android 14)

---

## 🧪 Testing en Emulador

### Plugins que funcionan en emulador:
- ✅ SQLite
- ✅ App
- ✅ Browser
- ✅ Device
- ✅ Preferences

### Plugins que requieren dispositivo físico:
- ⚠️ Camera (emulador tiene cámara virtual limitada)
- ⚠️ Geolocation (puede simular ubicación)
- ⚠️ DeviceAttest (requiere hardware biométrico real)

**Simular geolocalización en emulador**:
```bash
# Android Studio > Extended Controls > Location
# O vía adb:
adb emu geo fix -122.084 37.422
```

---

## 🔧 Troubleshooting

### Plugin no encontrado
```bash
npx cap sync android
node scripts/register-plugin.js
```

### Error al acceder a plugin
1. Verificar permisos en AndroidManifest.xml
2. Verificar que el plugin está en capacitor.build.gradle
3. Rebuild: `cd android && ./gradlew clean assembleDebug`

### Biometría no funciona
1. Verificar que el dispositivo tiene sensor biométrico
2. Configurar al menos una huella/face en el dispositivo
3. Verificar permisos de USE_BIOMETRIC

---

## 📚 Recursos

- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Android Keystore System](https://developer.android.com/training/articles/keystore)
- [BiometricPrompt API](https://developer.android.com/reference/androidx/biometric/BiometricPrompt)
- [SQLCipher for Android](https://www.zetetic.net/sqlcipher/sqlcipher-for-android/)

---

**Última actualización**: 6 de enero de 2026  
**Estado**: ✅ Todos los plugins funcionales y compilados
