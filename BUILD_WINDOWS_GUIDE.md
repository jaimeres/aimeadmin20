# 📱 Guía de Build para Windows

## ✅ Requisitos Previos

### 1. Node.js y npm
```powershell
# Verificar instalación
node --version  # Debe ser v18+ o v20+
npm --version
```
**Instalación:** https://nodejs.org/

---

### 2. Java Development Kit (JDK)
```powershell
# Verificar instalación
java -version  # Debe ser JDK 17 (recomendado para Android)
javac -version
```

**Instalación:**
- Descargar JDK 17 desde: https://adoptium.net/
- Instalar y configurar variables de entorno:
  - `JAVA_HOME`: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`
  - Agregar a `PATH`: `%JAVA_HOME%\bin`

**Verificar variables de entorno:**
```powershell
echo $env:JAVA_HOME
echo $env:PATH
```

---

### 3. Android Studio
```powershell
# Verificar comandos de Android SDK
adb --version
```

**Instalación:**
1. Descargar Android Studio: https://developer.android.com/studio
2. Instalar con SDK Tools incluido
3. Abrir Android Studio > SDK Manager:
   - ✅ Android SDK Platform 33 (o superior)
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Command-line Tools
   - ✅ Android Emulator (opcional)

**Variables de entorno requeridas:**
```powershell
# Agregar estas variables de entorno en Windows:
ANDROID_HOME=C:\Users\TuUsuario\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\TuUsuario\AppData\Local\Android\Sdk

# Agregar a PATH:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
%ANDROID_HOME%\emulator
```

**Verificar:**
```powershell
adb version
sdkmanager --version
```

---

### 4. Gradle (Incluido con Android Studio)
El proyecto Android ya incluye Gradle Wrapper (`gradlew.bat`), pero verifica:

```powershell
cd android
.\gradlew.bat --version
```

---

### 5. Capacitor CLI (Ya debería estar en el proyecto)
```powershell
# Verificar
npx cap --version

# Si no está, instalar
npm install -g @capacitor/cli
```

---

## 🚀 Ejecución del Build

### Opción 1: Script PowerShell (Recomendado)
```powershell
# Dar permisos de ejecución (solo primera vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Ejecutar el script
.\build-all.ps1
```

### Opción 2: Comandos Manuales
```powershell
# 1. Build web
npm run build -- --configuration=production

# 2. Sincronizar con Capacitor
npx cap sync android

# 3. Registrar plugin de biometría
node scripts/register-plugin.js

# 4. Build APK Debug
cd android
.\gradlew.bat clean assembleDebug
cd ..

# 5. Build APK Release
cd android
.\gradlew.bat assembleRelease
cd ..
```

---

## 📦 Archivos Generados

### Build Web
```
dist/ultima-ng/browser/
├── index.html
├── main.*.js
├── polyfills.*.js
└── assets/
```

### APK Debug
```
android/app/build/outputs/apk/debug/app-debug.apk
```
- ✅ Listo para instalar en dispositivos de prueba
- ✅ No requiere firma
- ⚠️ Solo para testing, NO para producción

### APK Release (Sin firmar)
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```
- ⚠️ Requiere firma digital para instalar
- 📱 Para subir a Google Play Store

---

## 🔐 Firmar APK de Release (Producción)

### 1. Generar Keystore (Solo primera vez)
```powershell
# En la carpeta android/app/
keytool -genkey -v -keystore jukai-release-key.keystore -alias jukai -keyalg RSA -keysize 2048 -validity 10000
```

**Guardar esta información de forma segura:**
- Contraseña del keystore
- Contraseña de la clave
- Alias: `jukai`

### 2. Configurar en Android
Crear o editar `android/gradle.properties`:
```properties
JUKAI_RELEASE_STORE_FILE=jukai-release-key.keystore
JUKAI_RELEASE_KEY_ALIAS=jukai
JUKAI_RELEASE_STORE_PASSWORD=TU_PASSWORD
JUKAI_RELEASE_KEY_PASSWORD=TU_PASSWORD
```

⚠️ **NO subir este archivo a Git** - Agregar a `.gitignore`

### 3. Configurar en build.gradle
Editar `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('JUKAI_RELEASE_STORE_FILE')) {
                storeFile file(JUKAI_RELEASE_STORE_FILE)
                storePassword JUKAI_RELEASE_STORE_PASSWORD
                keyAlias JUKAI_RELEASE_KEY_ALIAS
                keyPassword JUKAI_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ... resto de configuración
        }
    }
}
```

### 4. Generar APK Firmado
```powershell
cd android
.\gradlew.bat assembleRelease
cd ..
```

El APK firmado estará en:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 🐛 Troubleshooting

### Error: "ANDROID_HOME no está definido"
```powershell
# Solución: Definir variable de entorno
$env:ANDROID_HOME = "C:\Users\TuUsuario\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

# Permanente: Configurar en Variables de Entorno de Sistema
```

### Error: "gradlew.bat no se encuentra"
```powershell
# Solución: Verificar que existe
cd android
dir gradlew.bat

# Si no existe, regenerar proyecto Capacitor
cd ..
npx cap add android
```

### Error: "Java version incompatible"
```powershell
# Solución: Instalar JDK 17
# Verificar versión
java -version

# Configurar en gradle.properties
echo "org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.x.x" >> android/gradle.properties
```

### Error: "SDK location not found"
Crear `android/local.properties`:
```properties
sdk.dir=C\:\\Users\\TuUsuario\\AppData\\Local\\Android\\Sdk
```

### Error: "Script execution disabled"
```powershell
# Solución: Habilitar scripts de PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Error en build de Capacitor
```powershell
# Limpiar caché y reinstalar
rm -rf node_modules
rm -rf android
npm install
npx cap add android
npx cap sync android
```

---

## 📱 Instalar APK en Dispositivo

### Opción 1: Via USB (ADB)
```powershell
# 1. Conectar dispositivo Android con USB Debug habilitado
# 2. Verificar conexión
adb devices

# 3. Instalar APK Debug
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 3. Instalar APK Release
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Opción 2: Transferir archivo manualmente
1. Copiar el APK a la carpeta de Descargas del dispositivo
2. Abrir "Mis archivos" en Android
3. Localizar y tocar el APK
4. Permitir "Instalar aplicaciones desconocidas" si es necesario
5. Instalar

---

## 🔄 Build Incremental (Solo APK)

Si ya tienes el build web y solo quieres regenerar el APK:

```powershell
# Debug
cd android
.\gradlew.bat assembleDebug
cd ..

# Release
cd android
.\gradlew.bat assembleRelease
cd ..
```

---

## 📊 Verificar Tamaño del APK

```powershell
# PowerShell
Get-Item android/app/build/outputs/apk/debug/app-debug.apk | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length / 1MB, 2)}}

# CMD
dir android\app\build\outputs\apk\debug\app-debug.apk
```

---

## ⚡ Optimizaciones de Build

### Build más rápido (Solo para testing)
```powershell
# Saltar minificación en release
cd android
.\gradlew.bat assembleRelease -x minifyReleaseWithR8
cd ..
```

### Limpiar builds anteriores
```powershell
# Limpiar todo
cd android
.\gradlew.bat clean
cd ..

# Limpiar caché de Gradle
cd android
.\gradlew.bat --stop
.\gradlew.bat cleanBuildCache
cd ..
```

---

## 📋 Checklist Antes de Build de Producción

- [ ] Versión actualizada en `package.json`
- [ ] Versión actualizada en `android/app/build.gradle` (versionCode y versionName)
- [ ] Proguard habilitado para ofuscar código
- [ ] Keystore configurado correctamente
- [ ] Variables de entorno de producción configuradas
- [ ] Recursos optimizados (imágenes, assets)
- [ ] Testing en dispositivos físicos
- [ ] Permisos de Android verificados en manifest

---

## 🌐 Build Solo Web (Sin Android)

Si solo necesitas el build web:

```powershell
npm run build -- --configuration=production
```

El output estará en: `dist/ultima-ng/browser/`

Para preview local:
```powershell
npm run preview
# o
npx http-server dist/ultima-ng/browser -p 8080
```

---

## 📚 Recursos Adicionales

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Developer**: https://developer.android.com/
- **Gradle Docs**: https://docs.gradle.org/
- **Signing APKs**: https://developer.android.com/studio/publish/app-signing

---

## 🆘 Soporte

Si encuentras errores, verifica:
1. Versiones de herramientas instaladas
2. Variables de entorno configuradas
3. Logs detallados en la consola
4. Documentación oficial de cada herramienta

**Logs detallados de Gradle:**
```powershell
cd android
.\gradlew.bat assembleDebug --stacktrace --info
cd ..
```
