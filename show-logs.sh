#!/bin/bash

# Script para ver logs de la aplicación en tiempo real
# Útil para debugging en dispositivo físico o emulador

echo "📊 Iniciando logs de Jukai App..."
echo "   Presiona Ctrl+C para detener"
echo ""

# Filtros para mostrar solo logs relevantes
adb logcat | grep -E "Capacitor|DeviceAttest|Jukai|chromium"
