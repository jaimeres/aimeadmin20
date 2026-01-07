#!/bin/bash

# Script para generar builds completos de la aplicación Jukai
# Incluye build web, sincronización con Capacitor y builds de Android

set -e  # Salir si hay algún error

echo "🚀 Iniciando build completo de Jukai App..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Paso 1: Build Web de Producción
print_step "1/5 Generando build de producción Angular"
npm run build -- --configuration=production

if [ $? -eq 0 ]; then
    print_success "Build web completado exitosamente"
else
    print_error "Error en build web"
    exit 1
fi

echo ""

# Paso 2: Sincronizar con Capacitor
print_step "2/5 Sincronizando con Capacitor Android"
npx cap sync android

if [ $? -eq 0 ]; then
    print_success "Sincronización con Capacitor completada"
else
    print_error "Error en sincronización con Capacitor"
    exit 1
fi

echo ""

# Paso 3: Registrar plugin nativo de biometría
print_step "3/5 Registrando plugin nativo de biometría"
node scripts/register-plugin.js

if [ $? -eq 0 ]; then
    print_success "Plugin de biometría registrado"
else
    print_error "Error al registrar plugin de biometría"
    exit 1
fi

echo ""

# Paso 4: Build Android Debug
print_step "4/5 Generando APK de Debug"
cd android
./gradlew clean assembleDebug

if [ $? -eq 0 ]; then
    print_success "APK Debug generado"
    cd ..
else
    print_error "Error al generar APK Debug"
    cd ..
    exit 1
fi

echo ""

# Paso 5: Build Android Release
print_step "5/5 Generando APK de Release"
cd android
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    print_success "APK Release generado"
    cd ..
else
    print_error "Error al generar APK Release"
    cd ..
    exit 1
fi

echo ""

# Resumen final
print_step "✅ BUILD COMPLETADO EXITOSAMENTE"
echo ""
echo "📦 Archivos generados:"
echo ""
echo "  🌐 Build Web:"
echo "     dist/ultima-ng/browser/"
echo ""
echo "  📱 APK Debug:"
echo "     android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "  📱 APK Release:"
echo "     android/app/build/outputs/apk/release/app-release-unsigned.apk"
echo ""
echo "🔌 Plugins nativos incluidos:"
echo "   ✓ SQLite (encriptado)"
echo "   ✓ Cámara"
echo "   ✓ Geolocalización"
echo "   ✓ Device Info"
echo "   ✓ Preferences"
echo "   ✓ Browser"
echo "   ✓ Biometric Auth (custom)"
echo ""
print_warning "El APK de Release está sin firmar. Para firmar, ver BUILD_GUIDE.md"
echo ""
print_success "¡Listo para instalar y testear!"
echo ""
