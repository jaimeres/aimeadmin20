# Sistema de Actualización Automática para Apps Móviles

Este sistema proporciona actualizaciones automáticas para aplicaciones móviles desarrolladas con Angular y Capacitor, incluyendo verificación de versiones, descarga automática y validación mediante SHA256.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **UpdateService** - Servicio principal que maneja la lógica de verificación de actualizaciones
2. **UpdateManagerService** - Coordinador que maneja el estado de la UI y eventos de la app
3. **UpdateDialogComponent** - Componente UI que muestra las opciones de actualización al usuario
4. **AppComponent** - Integración principal en la aplicación

### Flujo de Funcionamiento

```mermaid
graph TD
    A[App Inicia] --> B[UpdateManager.initialize()]
    B --> C{¿Es móvil?}
    C -->|No| D[No hacer nada]
    C -->|Sí| E[Verificar actualizaciones]
    E --> F[Consultar servidor]
    F --> G{¿Actualización requerida?}
    G -->|No| H[Continuar normal]
    G -->|Sí| I[Mostrar diálogo]
    I --> J{¿Actualización forzada?}
    J -->|Sí| K[Solo botón Actualizar]
    J -->|No| L[Botones Actualizar/Después]
```

## 🔧 Configuración

### 1. Plugins de Capacitor Requeridos

```bash
npm install @capacitor/app @capacitor/browser @capacitor/preferences @capacitor/device crypto-js @types/crypto-js
```

### 2. Endpoint del Servidor

El servidor debe exponer un endpoint: `GET /app/update-policy`

**Parámetros:**
- `platform`: "android" | "ios"
- `channel`: "dev" | "qa" | "prod"  
- `versionCode`: número de versión actual
- `deviceId`: (opcional) identificador del dispositivo

**Respuesta esperada:**
```json
{
  "platform": "android",
  "channel": "qa",
  "minVersionCode": 42,
  "latest": {
    "versionCode": 57,
    "versionName": "1.12.3",
    "url": "https://cdn.tuapp.com/apk/jukai-1.12.3.apk",
    "sha256": "ab12...ff",
    "size": 53211234
  },
  "forceFrom": 50,
  "deadline": "2025-09-20T18:00:00Z",
  "message": "Actualización obligatoria por cambios de seguridad.",
  "maintenance": false,
  "blockedVersions": [41],
  "rolloutPercent": 100,
  "allowSkipOffline": true,
  "changelogUrl": "https://tuapp.com/changelog/1.12.3",
  "whitelist": ["device-id-qa-1", "device-id-qa-2"]
}
```

### 3. Variables de Entorno

Asegúrate de que `environment.base_url` apunte a tu servidor API.

## 📱 Integración en la App

### 1. AppComponent (Ya implementado)

El `AppComponent` ya incluye la integración completa:

```typescript
// src/app.component.ts
export class AppComponent implements OnInit, OnDestroy {
  // ... código ya implementado
}
```

### 2. Verificación Manual (Opcional)

Para agregar un botón de "Verificar actualizaciones" en cualquier componente:

```typescript
import { UpdateManagerService } from './path/to/update-manager.service';

constructor(private updateManager: UpdateManagerService) {}

async checkUpdates() {
  const success = await this.updateManager.forceUpdateCheck();
  if (success) {
    // Actualización verificada
  }
}
```

## 🎯 Casos de Uso

### 1. Actualización Opcional
- Usuario ve notificación
- Puede elegir "Actualizar" o "Después"  
- "Después" pospone por 24 horas

### 2. Actualización Forzada
- Usuario solo ve botón "Actualizar"
- No puede usar la app sin actualizar
- Se bloquea la navegación

### 3. Actualización con Deadline
- Muestra tiempo restante antes del bloqueo
- Permite uso temporal hasta la fecha límite

### 4. Modo Offline
- Si `allowSkipOffline: true`, permite continuar sin conexión
- Guarda última política para verificar offline

### 5. Mantenimiento
- Kill switch para bloquear todas las versiones
- Fuerza actualización inmediata

## 🔐 Seguridad

### Validación SHA256
```typescript
// En UpdateService
private async verifyFileHash(fileArrayBuffer: ArrayBuffer, expectedSha256: string): Promise<boolean> {
  // Implementación usando crypto-js
}
```

### Whitelist para QA
Dispositivos en la whitelist pueden saltarse restricciones:
```json
{
  "whitelist": ["device-id-qa-1", "device-id-qa-2"]
}
```

## 📊 Rollout Gradual

Control de despliegue por porcentaje:
```json
{
  "rolloutPercent": 50  // Solo 50% de dispositivos ven la actualización
}
```

El algoritmo usa hash del `device_id` para distribución consistente.

## 🐛 Debug y Monitoreo

### Información de Debug
```typescript
const debugInfo = await this.updateManager.getDebugInfo();
console.log('Update Debug:', debugInfo);
```

### Limpiar Cache
```typescript
await this.updateManager.clearCache();
```

### Logs del Sistema
El sistema usa prefijos consistentes en los logs:
- `📱` - Información de app/dispositivo
- `🔍` - Verificaciones de actualización  
- `✅` - Operaciones exitosas
- `💥` - Errores
- `😴` - Actualizaciones pospuestas

## ⚡ Eventos del Sistema

### Verificación Automática
- **App startup**: Al iniciar la aplicación
- **Foreground**: Cuando la app vuelve del background  
- **Online**: Cuando se recupera la conectividad

### Cache y Optimización
- **Verificaciones**: Máximo cada 4 horas
- **Notificaciones opcionales**: Máximo cada 24 horas
- **Política offline**: Se guarda para uso sin conexión

## 🎨 Personalización del UI

### Modificar Mensajes
Edita `UpdateDialogComponent` para personalizar:
- Títulos de diálogos
- Mensajes de error
- Iconos y colores
- Botones de acción

### Estilos CSS
```scss
:host ::ng-deep .update-dialog {
  // Personalizar estilos del diálogo
}
```

## 🔄 Canales de Actualización

### Configuración por Canal
```typescript
// En el código de inicialización
await this.updateManager.checkForUpdatesAndShow('dev');   // Canal desarrollo
await this.updateManager.checkForUpdatesAndShow('qa');    // Canal QA  
await this.updateManager.checkForUpdatesAndShow('prod');  // Canal producción
```

Cada canal puede tener diferentes:
- Frecuencias de actualización
- Niveles de restricción
- URLs de descarga

## 📈 Analítica y Métricas

### Eventos Recomendados para Tracking
```typescript
// En UpdateManagerService
public handleUpdateClick() {
  // Aquí agregar evento: "update_initiated"
}

public handleLaterClick() {  
  // Aquí agregar evento: "update_postponed"
}

public handleSkipOfflineClick() {
  // Aquí agregar evento: "update_skipped_offline"  
}
```

## 🚀 Próximas Mejoras

### En Desarrollo
- [ ] Descarga en background con progress
- [ ] Instalación automática (Android)
- [ ] Rollback automático en caso de problemas
- [ ] Validación de firma digital
- [ ] Soporte para iOS App Store

### Consideraciones Futuras  
- [ ] Actualización de recursos estáticos
- [ ] Actualización selectiva de módulos
- [ ] A/B testing integrado
- [ ] Métricas de adopción de versiones

## ❗ Notas Importantes

1. **Solo Móviles**: El sistema solo funciona en plataformas móviles (Capacitor)
2. **HTTPS Obligatorio**: Todas las URLs de descarga deben usar HTTPS
3. **Firma APK**: Los APK deben estar firmados con la misma clave para permitir actualización
4. **Almacenamiento**: El sistema usa `Preferences` de Capacitor para persistir datos
5. **Conectividad**: Maneja tanto escenarios online como offline

## 🆘 Troubleshooting

### Problemas Comunes

**Error: "No se puede verificar actualización"**
- Verificar conectividad
- Validar endpoint del servidor
- Revisar logs de red

**Error: "APK no se puede instalar"**  
- Verificar firma del APK
- Confirmar permisos de instalación
- Validar URL de descarga

**Dialog no aparece**
- Verificar que sea dispositivo móvil
- Confirmar inicialización en AppComponent
- Revisar logs de UpdateManager
