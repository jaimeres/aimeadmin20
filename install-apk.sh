#!/bin/bash

# Script para instalar el APK en un dispositivo conectado vía ADB
# Detecta automáticamente el APK más reciente

set -e

echo "📱 Instalador de APK Debug en Dispositivo"
echo ""

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

# Verificar que existe el APK
if [ ! -f "$APK_PATH" ]; then
    echo "❌ Error: No se encontró el APK en $APK_PATH"
    echo "   Ejecuta primero: ./build-debug.sh"
    exit 1
fi

# Verificar dispositivos conectados
echo "🔍 Buscando dispositivos Android..."
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ No hay dispositivos conectados"
    echo "   Conecta un dispositivo o inicia un emulador"
    exit 1
fi

echo "✓ Dispositivo(s) encontrado(s): $DEVICES"
echo ""

# Mostrar información del APK
echo "📦 APK a instalar:"
ls -lh "$APK_PATH"
echo ""

# Desinstalar versión anterior (si existe)
echo "🗑️  Desinstalando versión anterior..."
adb uninstall com.jukai.jukai 2>/dev/null || echo "   (No había versión previa)"

# Instalar APK
echo "⬆️  Instalando APK..."
adb install "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ APK instalado exitosamente"
    echo ""
    echo "🚀 Para abrir la app:"
    echo "   adb shell am start -n com.jukai.jukai/.MainActivity"
    echo ""
    echo "📊 Para ver logs:"
    echo "   adb logcat | grep -i capacitor"
    echo ""
else
    echo "❌ Error al instalar el APK"
    exit 1
fi
