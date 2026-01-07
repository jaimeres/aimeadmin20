#!/bin/bash

# Script rápido para build de desarrollo (solo Debug APK)
# Más rápido que build-all.sh - ideal para iteraciones rápidas

set -e

echo "🔧 Build Rápido de Desarrollo..."
echo ""

# Build web
echo "📦 Generando build web..."
npm run build

# Sync con Capacitor
echo "🔄 Sincronizando con Android..."
npx cap sync android
node scripts/register-plugin.js

# Solo APK Debug
echo "📱 Generando APK Debug..."
cd android
./gradlew assembleDebug
cd ..

echo ""
echo "✅ APK Debug listo en: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "💡 Para instalar en dispositivo: adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
