# 🧪 Testing Biométrico - Instrucciones Simplificadas

## 🎯 MÉTODO RECOMENDADO: Testing con Servidor de Desarrollo

### Paso 1: Servidor Iniciándose ⏳
El servidor de desarrollo está iniciándose en `http://localhost:4200`

### Paso 2: Una vez que el servidor esté listo
Cuando veas el mensaje: `Local: http://localhost:4200/`, procede con:

#### Opción A: Testing Web (Más Simple)
1. **Abrir navegador** en tu computadora
2. **Ir a:** `http://localhost:4200/biometric-test`
3. **Resultado esperado:** Verás "Biométrica NO disponible" ya que no es dispositivo móvil
4. **Propósito:** Verificar que la interfaz funciona

#### Opción B: Testing Android (Completo)
1. **En el simulador**, abrir el navegador de Android
2. **Navegar a:** `http://10.0.2.2:4200/biometric-test` (IP especial del simulador)
3. **O usar:** `http://localhost:4200/biometric-test` si funciona
4. **Resultado esperado:** Debería mostrar interfaz biométrica

## 🔧 Configuración IP para Simulador
```bash
# Si localhost no funciona en simulador, usar IP especial
# 10.0.2.2 = localhost desde el simulador Android
```

## 📱 QUÉ VERÁS EN LA INTERFAZ

### 🟢 Si Todo Funciona Correctamente:
```
🔒 Test de Autenticación Biométrica
Estado de Biometría: ✅ Disponible

Controles:
- 🔍 Verificar Disponibilidad  [BOTÓN]
- 🧪 Test Plugin               [BOTÓN]
- 📱 Registrar Biométrica      [BOTÓN]
- 🔐 Autenticar               [BOTÓN]
- 🧹 Limpiar                  [BOTÓN]

Log de Resultados:
[Área de texto con mensajes de debug]
```

### 🔴 Si Hay Problemas:
```
Estado de Biometría: ❌ No Disponible
```

## 🎯 TESTS A REALIZAR

### 1. Test Básico de Disponibilidad
- **Clic:** "🔍 Verificar Disponibilidad"
- **Esperado:** Log muestra estado de biometría
- **Android:** Debería mostrar "✅ Disponible"
- **Web:** Mostrará "❌ No Disponible"

### 2. Test del Plugin Nativo
- **Clic:** "🧪 Test Plugin"
- **Esperado:** Verifica comunicación con plugin Android
- **Android:** Plugin responde
- **Web:** Error esperado (no hay plugin)

### 3. Registro Biométrico (Solo Android)
- **Clic:** "📱 Registrar Biométrica"
- **Esperado:** Se abre diálogo biométrico
- **Simulador:** Simular huella (ver instrucciones abajo)

### 4. Autenticación (Después del registro)
- **Clic:** "🔐 Autenticar"
- **Esperado:** Nuevo diálogo biométrico y generación de firma

## 🎮 SIMULAR BIOMETRÍA EN ANDROID STUDIO

### Método 1: Extended Controls
1. **Android Studio:** Busca tu simulador en AVD Manager
2. **Click "..." junto al simulador**
3. **Extended Controls** → **Fingerprint**
4. **"Touch sensor"** cuando aparezca el diálogo biométrico

### Método 2: Comando Terminal
```bash
# Durante el diálogo biométrico:
adb emu finger touch 1
```

### Método 3: Configurar Biometría en Android
1. **Settings** → **Security**
2. **Screen lock** → **Fingerprint**
3. **Add fingerprint** → Seguir instrucciones del simulador

## 📊 RESULTADOS ESPERADOS

### ✅ Testing Exitoso Mostraría:
```
[14:30:25] 🔍 Verificando disponibilidad biométrica...
[14:30:26] ✅ Biométrica disponible - Status: AVAILABLE
[14:30:30] 🧪 Probando plugin biométrico...
[14:30:31] ✅ Plugin biométrico funciona correctamente
[14:30:35] 📱 Iniciando registro biométrico para usuario: test-user-001
[14:30:40] ✅ Registro exitoso!
[14:30:40] 🔑 Device ID: a1b2c3d4e5f6g7h8...
[14:30:45] 🔐 Iniciando autenticación biométrica...
[14:30:50] ✅ Autenticación exitosa!
[14:30:50] ✅ Device ID coincide con el registro
```

### ❌ Problemas Comunes:
- **"Plugin not found"** → Capacitor no está cargando el plugin
- **"Biometric not available"** → Simulador sin biometría configurada
- **"Network error"** → Servidor no accesible desde simulador

## 🔍 DEBUG AVANZADO

### Ver Logs del Plugin (Terminal):
```bash
adb logcat | grep -E "DeviceAttest|Capacitor" | head -10
```

### Ver Logs de JavaScript (Navegador):
- **F12** → **Console** → Ver errores de JavaScript
- **Network** → Ver si cargan recursos
- **Application** → Verificar Service Workers

## ⏭️ PRÓXIMOS PASOS SEGÚN RESULTADO

### Si TODO funciona:
- ✅ Sistema listo para producción
- ⏭️ Implementar endpoints backend
- 🚀 Desplegar en dispositivo físico

### Si HAY problemas:
- 🔧 Debuggear logs específicos
- 📱 Probar en dispositivo físico
- 🔄 Ajustar configuración de Capacitor

---
**⏰ Esperando a que termine de cargar el servidor...**
