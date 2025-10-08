# 📱 Guía de Testing Biométrico - Simulador Android

## 🎯 ESTADO ACTUAL
✅ **Simulador:** Conectado (emulator-5554)
✅ **App:** Instalada exitosamente
✅ **Biometría:** Configurada en simulador
✅ **ADB:** Herramientas instaladas

## 🚀 INSTRUCCIONES DE PRUEBA

### Paso 1: Aplicación Ya Abierta
La aplicación debería estar abierta en el simulador mostrando la pantalla principal.

### Paso 2: Navegar a la Página de Pruebas
En la aplicación, necesitas navegar manualmente a la página de pruebas biométricas:

**Opción A - URL Directa:**
- En el navegador del simulador, ve a: `http://localhost:4200/biometric-test`

**Opción B - Navegación dentro de la App:**
- Buscar menú o navegación hacia `/biometric-test`
- O modificar la URL en la barra de navegación

### Paso 3: Ejecutar Tests

Una vez en `/biometric-test`, verás estos botones:

#### 🔍 **1. Verificar Disponibilidad**
- Clic en "🔍 Verificar Disponibilidad"
- Debería mostrar: `✅ Biométrica disponible - Status: AVAILABLE`

#### 🧪 **2. Test Plugin**
- Clic en "🧪 Test Plugin"
- Verifica que el plugin nativo responde correctamente

#### 📱 **3. Registrar Biométrica**
- Clic en "📱 Registrar Biométrica"
- El simulador debería mostrar el diálogo biométrico
- **IMPORTANTE:** En el simulador, ve al menú ☰ → More → Fingerprint

#### 🔐 **4. Autenticar**
- Después del registro, clic en "🔐 Autenticar"
- Debería pedir biometría nuevamente y mostrar firma

## 📋 LOGS ESPERADOS

Deberías ver estos mensajes en el log:

```
[14:30:25] 🔍 Verificando disponibilidad biométrica...
[14:30:26] ✅ Biométrica disponible - Status: AVAILABLE
[14:30:30] 📱 Iniciando registro biométrico para usuario: test-user-001
[14:30:35] ✅ Registro exitoso!
[14:30:35] 🔑 Device ID: a1b2c3d4e5f6...
[14:30:35] 🗝️  Key Alias: biometric_attested_key_test-user-001
```

## 🔧 Configuración del Simulador para Biometría

### En el Simulador Android:
1. **Abrir Settings** (Configuración)
2. **Security & Privacy** → **Device Unlock** 
3. **Habilitar Screen Lock** (PIN, Pattern, etc.)
4. **Add Fingerprint** → Simular registro de huella

### Desde Android Studio:
1. **Extended Controls** (...)
2. **Fingerprint** → **Simulate fingerprint touch**

## 🐛 Troubleshooting

### Si "Biométrica NO disponible":
```bash
# Verificar configuración
adb shell settings get secure biometric_fingerprint_enabled
# Debería devolver: 1

# Re-habilitar si es necesario
adb shell settings put secure biometric_fingerprint_enabled 1
```

### Si el Plugin no responde:
```bash
# Ver logs del sistema
adb logcat | grep -i biometric
adb logcat | grep -i DeviceAttest
```

### Si hay errores de KeyStore:
- El simulador debe tener API 28+ para mejor soporte
- Verificar que el simulador tenga Google APIs

## 📱 Controles del Simulador

Para simular huella dactilar en el simulador:

1. **Durante el diálogo biométrico**, ve a:
   - Android Studio → AVD Manager
   - Clic en "..." del simulador
   - **Extended Controls**
   - **Fingerprint** tab
   - **Touch the sensor** (simular huella)

O usa el comando:
```bash
adb emu finger touch 1
```

## 🎯 Qué Verificar

### ✅ Registro Exitoso:
- Device ID único generado
- Certificados de atestación creados
- Clave pública exportada
- Logs sin errores

### ✅ Autenticación Exitosa:
- Firma generada correctamente
- Device ID coincide con registro
- Challenge firmado con clave privada
- Biometría requerida

### ⚠️ Posibles Problemas:
- "Hardware not supported" → Usar simulador con Google APIs
- "Biometric not enrolled" → Configurar huella en Settings
- "Plugin not found" → Verificar build y sync de Capacitor

## 🔍 Logs de Debug

Para ver logs detallados:
```bash
# Logs de la aplicación
adb logcat | grep "DeviceAttest\|BiometricAuth\|Capacitor"

# Logs del sistema Android
adb logcat | grep "BiometricPrompt\|KeyStore"
```

¡Listo para probar! 🚀
