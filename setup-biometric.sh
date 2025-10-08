#!/bin/bash

# Script de configuración para la implementación de autenticación biométrica
# Autor: AI Assistant
# Fecha: $(date)

echo "🔐 Configurando autenticación biométrica para aimeAdmin20..."

# Verificar que estamos en el directorio correcto
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Error: Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

echo "📱 Verificando configuración de Capacitor..."

# Verificar que Capacitor está instalado
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npm/npx no está instalado"
    exit 1
fi

# Instalar dependencias si es necesario
echo "📦 Instalando dependencias..."
npm install

# Verificar estructura de archivos
echo "🔍 Verificando archivos implementados..."

required_files=(
    "android/src/main/java/com/jukai/security/DeviceAttestPlugin.kt"
    "src/app/plugins/device-attest.interface.ts"
    "src/app/auth/services/biometric-auth.service.ts"
    "src/app/types/logged-user.ts"
    "src/app/auth/components/biometric-setup.component.ts"
    "BIOMETRIC_AUTHENTICATION_IMPLEMENTATION.md"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    else
        echo "✅ $file"
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Archivos faltantes:"
    printf '%s\n' "${missing_files[@]}"
    exit 1
fi

# Verificar dependencias de Android
echo "🔧 Verificando configuración de Android..."

if ! grep -q "androidx.biometric:biometric" android/app/build.gradle; then
    echo "⚠️  Advertencia: Dependencias de biometría no encontradas en build.gradle"
    echo "   Agregue manualmente: implementation \"androidx.biometric:biometric:1.1.0\""
fi

if ! grep -q "DeviceAttestPlugin" android/app/src/main/java/com/jukai/jukai/MainActivity.java; then
    echo "⚠️  Advertencia: Plugin no registrado en MainActivity.java"
fi

# Sincronizar con Capacitor
echo "🔄 Sincronizando cambios nativos..."
npx cap sync android

# Verificar permisos
echo "🛡️  Verificando permisos Android..."
if ! grep -q "USE_BIOMETRIC" android/app/src/main/AndroidManifest.xml 2>/dev/null; then
    echo "ℹ️  Los permisos biométricos se agregan automáticamente durante la compilación"
fi

echo ""
echo "✅ Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Compilar para Android: npx cap build android"
echo "   2. Abrir Android Studio: npx cap open android"
echo "   3. Configurar el backend con los endpoints requeridos (ver documentación)"
echo "   4. Probar en dispositivo real con sensores biométricos"
echo ""
echo "📚 Documentación completa: BIOMETRIC_AUTHENTICATION_IMPLEMENTATION.md"
echo ""
echo "🚀 ¡La implementación está lista!"
