# Pasos para generar APK firmado para distribución

## 1. Compilar la aplicación web
ng build

## 2. Sincronizar con Capacitor  
npx cap sync android

## 3. En Android Studio:
# Build → Generate Signed Bundle/APK → APK
# - Crear/usar keystore (guárdalo seguro)
# - Seleccionar "release" build type
# - Firma con tu certificado

## 4. Habilitar "Orígenes desconocidos" en dispositivos:
# Configuración → Seguridad → Orígenes desconocidos → Activar
# O: Configuración → Aplicaciones → Acceso especial → Instalar apps desconocidas

## 5. Distribuir el APK firmado
# El archivo estará en: android/app/release/app-release.apk

## IMPORTANTE:
# - Guarda el keystore y contraseña en lugar seguro
# - Usa el mismo keystore para actualizaciones
# - Para Play Store usa AAB en lugar de APK
