# Guía de Geolocalización con Capacitor

## Resumen de Cambios

Se ha adaptado el `GeneralService` para utilizar **Capacitor Geolocation** en lugar de la API nativa del navegador, proporcionando mejor compatibilidad con aplicaciones móviles y web.

## Cambios Realizados

### 1. Instalación del Plugin
```bash
npm install @capacitor/geolocation
```

### 2. Modificaciones en `GeneralService`

#### Imports Agregados
```typescript
import { Geolocation } from '@capacitor/geolocation';
```

#### Nuevos Métodos
- `getCurrentPositionCapacitor()`: Obtiene ubicación usando Capacitor
- `updateCoordsFromCapacitor()`: Actualiza coordenadas desde respuesta Capacitor
- `tryNativeGeolocation()`: Fallback a geolocalización nativa
- `startWatching()`: Seguimiento continuo de ubicación
- `stopWatching()`: Detiene seguimiento continuo
- `checkPermissions()`: Verifica permisos de geolocalización
- `requestPermissions()`: Solicita permisos de geolocalización

### 3. Configuración de Capacitor

#### `capacitor.config.ts`
```typescript
plugins: {
  Geolocation: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 3600000 // 1 hora
  }
}
```

## Funcionalidades

### Manejo de Permisos
- Solicita permisos automáticamente al usar geolocalización
- Maneja estados de permisos denegados
- Fallback a geolocalización nativa si Capacitor falla

### Precisión Mejorada
- `enableHighAccuracy: true` por defecto
- Timeout configurado a 10 segundos
- Cache de ubicación de 1 hora (configurable)

### Compatibilidad
- **Móvil**: Utiliza plugins nativos de Capacitor
- **Web**: Fallback automático a geolocalización del navegador
- **PWA**: Funciona en ambos modos

## Uso en el Código

### Uso Básico (Ya implementado en CRUD)
```typescript
// En cualquier componente que necesite ubicación
this.generalS.initialize();
const coords = this.generalS.getLocationSnapshot();

if (coords) {
  console.log('Lat:', coords.latitude);
  console.log('Lng:', coords.longitude);
  console.log('TZ:', coords.time_zone);
}
```

### Suscripción a Cambios
```typescript
this.generalS.onLocationChange().subscribe(coords => {
  if (coords) {
    // Actualizar ubicación en tiempo real
  }
});
```

### Seguimiento Continuo (Opcional)
```typescript
// Iniciar seguimiento
const watchId = await this.generalS.startWatching();

// Detener seguimiento
await this.generalS.stopWatching(watchId);
```

### Verificar Permisos
```typescript
const permissions = await this.generalS.checkPermissions();
if (permissions.location !== 'granted') {
  await this.generalS.requestPermissions();
}
```

## Ventajas de Capacitor Geolocation

1. **Mejor Rendimiento**: Acceso directo a APIs nativas en móviles
2. **Manejo de Permisos**: Control granular sobre permisos de ubicación
3. **Configuración Avanzada**: Opciones como high accuracy, timeout, etc.
4. **Compatibilidad Universal**: Funciona en web, iOS y Android
5. **Fallback Automático**: Se degrada graciosamente a APIs del navegador

## Configuración para Deployment

### iOS
Agregar permisos en `ios/App/App/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Esta app necesita acceso a tu ubicación para funcionalidades relacionadas con geolocalización.</string>
```

### Android
Los permisos se manejan automáticamente por Capacitor.

## Comandos de Build

```bash
# Desarrollo web
npm run start

# Build para producción
npm run build

# Build para móvil
npx cap build ios
npx cap build android
```

## Notas Importantes

- El servicio mantiene compatibilidad completa con el código existente
- Todos los métodos públicos existentes funcionan igual
- El fallback a geolocalización nativa es automático y transparente
- Se recomienda probar en dispositivos reales para validar la funcionalidad móvil
