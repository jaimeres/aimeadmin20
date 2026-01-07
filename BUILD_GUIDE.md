# Guía de Build - Jukai App

## 📱 Build Generado Exitosamente

### Estado del Build

✅ **Build Web de Producción**: Completado  
✅ **Sincronización con Capacitor**: Completado  
✅ **APK Debug**: Generado  
✅ **APK Release**: Generado  
✅ **Plugins Nativos**: Configurados y funcionales  

---

## 📦 Archivos Generados

### APK Debug (Testing)
- **Ubicación**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Tamaño**: ~50 MB
- **Uso**: Ideal para testing en dispositivos físicos o emuladores
- **Firma**: Debug keystore (no válido para Google Play Store)

### APK Release (Producción - Sin Firmar)
- **Ubicación**: `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- **Tamaño**: ~48 MB
- **Estado**: Sin firmar - requiere firma con keystore de producción
- **Uso**: Base para generar APK firmado o AAB para Play Store

### Build Web
- **Ubicación**: `dist/ultima-ng/browser/`
- **Tamaño**: ~1.32 MB (inicial)
- **Uso**: Deployment en servidores web

---

## 🔌 Plugins Nativos de Android Incluidos

### Plugins de Capacitor (Oficiales)
1. **@capacitor-community/sqlite** (v7.0.2)
   - Base de datos SQLite local
   - SQLCipher para encriptación

2. **@capacitor/app** (v7.1.0)
   - Gestión del ciclo de vida de la app
   - Control de estado de la aplicación

3. **@capacitor/browser** (v7.0.2)
   - Abrir URLs en navegador externo

4. **@capacitor/camera** (v7.0.2)
   - Acceso a cámara del dispositivo
   - Captura de fotos

5. **@capacitor/device** (v7.0.2)
   - Información del dispositivo
   - UUID, modelo, plataforma

6. **@capacitor/geolocation** (v7.1.5)
   - Geolocalización GPS
   - Configuración de precisión

7. **@capacitor/preferences** (v7.0.2)
   - Almacenamiento de preferencias locales
   - Key-value storage

### Plugins Nativos Personalizados
8. **DeviceAttestPlugin** (Custom)
   - **Ubicación**: `android/app/src/main/java/com/jukai/security/DeviceAttestPlugin.kt`
   - **Funcionalidad**: 
     - Autenticación biométrica (huella dactilar, reconocimiento facial)
     - Android Keystore para claves seguras
     - StrongBox Keymaster support
     - Generación de pares de claves RSA/EC
     - Certificados de attestation

---

## 🚀 Comandos de Build

### Build Completo (Web + Android)
```bash
# Limpiar, construir y sincronizar
npm run build && npx cap sync android && node scripts/register-plugin.js
```

### Build Web Solo
```bash
npm run build
```

### Build Android Debug
```bash
cd android && ./gradlew clean assembleDebug
```

### Build Android Release
```bash
cd android && ./gradlew clean assembleRelease
```

### Sincronizar Cambios con Android
```bash
npx cap sync android
node scripts/register-plugin.js
```

### Abrir en Android Studio
```bash
npx cap open android
```

---

## 📋 Requisitos del Sistema

### Para Build Web
- Node.js 18+
- npm 9+
- Angular CLI 20+

### Para Build Android
- Java JDK 21
- Android SDK 34+
- Gradle 8.11+
- Kotlin 1.9+
- Android Studio (recomendado)

---

## 🔐 Configuración de Firma (Release)

Para firmar el APK de release y subirlo a Play Store:

### 1. Generar Keystore (primera vez)
```bash
keytool -genkey -v -keystore jukai-release.keystore \
  -alias jukai -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configurar Gradle
Crear archivo `android/keystore.properties`:
```properties
storeFile=jukai-release.keystore
storePassword=TU_PASSWORD
keyAlias=jukai
keyPassword=TU_PASSWORD_KEY
```

### 3. Modificar `android/app/build.gradle`
```groovy
// Agregar antes de android {}
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... configuración existente ...
    
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    
    buildTypes {
        release {
            minifyEnabled false
            signingConfig signingConfigs.release
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. Build con Firma
```bash
cd android && ./gradlew assembleRelease
```

APK firmado en: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📦 Generar AAB para Play Store

```bash
cd android && ./gradlew bundleRelease
```

AAB en: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 🧪 Testing en Dispositivo

### Instalar APK Debug
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Ver logs en tiempo real
```bash
adb logcat | grep -i capacitor
```

### Ejecutar en emulador desde Android Studio
```bash
npx cap open android
# Luego Run > Run 'app' en Android Studio
```

---

## 🔍 Verificación de Plugins

### Verificar plugins instalados
```bash
npx cap ls
```

### Verificar plugin biométrico
El plugin `DeviceAttestPlugin` está registrado en:
- `android/app/src/main/java/com/jukai/jukai/MainActivity.java`
- Se auto-registra al ejecutar: `node scripts/register-plugin.js`

---

## ⚠️ Advertencias del Build

### Warnings Comunes (No Críticos)
1. **Bundle size exceeded budget**: El bundle inicial excede 1 MB
   - **Solución**: Considerar code splitting o lazy loading adicional

2. **CommonJS dependencies**: lottie-web, crypto-js, quill-delta
   - **Impacto**: Puede afectar ligeramente la optimización
   - **Solución futura**: Migrar a versiones ESM cuando estén disponibles

3. **Deprecated Gradle features**
   - **Impacto**: Advertencia para futuras versiones de Gradle
   - **Acción**: Actualizar scripts cuando sea necesario

---

## 🎯 Permisos de Android

Permisos configurados en `AndroidManifest.xml`:
- ✅ Cámara
- ✅ Geolocalización (GPS)
- ✅ Internet
- ✅ Almacenamiento
- ✅ Biometric (huella dactilar)

---

## 📱 Especificaciones de la App

- **Package ID**: `com.jukai.jukai`
- **App Name**: Jukai
- **Version Code**: 1
- **Version Name**: 1.0.0
- **Min SDK**: 22 (Android 5.1)
- **Target SDK**: 34 (Android 14)
- **Compile SDK**: 34

---

## 🛠️ Troubleshooting

### Error: Plugin not found
```bash
npx cap sync android
node scripts/register-plugin.js
```

### Error: Build failed
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### Error: Signing config missing
- Asegúrate de que `keystore.properties` existe
- Verifica que el keystore file está en la ubicación correcta

---

## 📚 Recursos

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Angular Build Guide](https://angular.dev/tools/cli/build)
- [Gradle Build Guide](https://docs.gradle.org/)

---

## ✅ Checklist Pre-Deployment

- [ ] Build web generado sin errores críticos
- [ ] Capacitor sync completado
- [ ] Plugins nativos registrados
- [ ] APK debug testeado en dispositivo físico
- [ ] Biometría funcionando correctamente
- [ ] Geolocalización probada
- [ ] SQLite funcionando
- [ ] APK release firmado
- [ ] Versión actualizada en build.gradle
- [ ] Íconos y splash screen configurados
- [ ] Permisos verificados en AndroidManifest.xml

---

**Última actualización**: 6 de enero de 2026  
**Build generado exitosamente** ✅
