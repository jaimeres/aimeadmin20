# 🤖 Guía del Asistente Inteligente

## 📋 Tabla de Contenidos
1. [Estados del Asistente](#estados)
2. [Configuración](#configuración)
3. [Consideraciones de Rendimiento](#rendimiento)
4. [Imágenes Requeridas](#imágenes)
5. [Personalización Avanzada](#personalización)
6. [Troubleshooting](#troubleshooting)

---

## 🎭 Estados del Asistente {#estados}

### Estados Básicos (Ya implementados)
- **idle**: Estado de reposo, esperando interacción
- **talk**: Conversando con el usuario
- **think**: Procesando respuesta del servidor
- **notify**: Alerta o notificación importante
- **speed**: Acción rápida en progreso

### Estados Emocionales (Nuevos)
- **yawning**: Bostezando por inactividad (1 hora sin actividad)
- **confused**: Usuario lento o confundido
- **waiting**: Esperando acción del usuario

### Movimiento de Ojos (Nuevos)
- **look-left**: Mirando hacia la izquierda
- **look-right**: Mirando hacia la derecha
- **look-up**: Mirando hacia arriba
- **look-down**: Mirando hacia abajo

---

## ⚙️ Configuración {#configuración}

### Configuración Básica (Actual)
```typescript
<app-assistant-widget
  [welcomeTips]="['¿Necesitas ayuda?', 'Puedo guiarte en este módulo']"
  animationPath="/assets/assistant/logo_assistant.png"
  apiUrl="/api/assistant/chat"
></app-assistant-widget>
```

### Configuración Completa (Con todos los estados)
```typescript
<app-assistant-widget
  [welcomeTips]="['¿Necesitas ayuda?', 'Estoy aquí para ti', 'Pregunta lo que quieras']"
  [animationPath]="{
    idle: '/assets/assistant/assistant_idle.png',
    talk: '/assets/assistant/assistant_talk.png',
    think: '/assets/assistant/assistant_think.gif',
    notify: '/assets/assistant/assistant_notify.png',
    speed: '/assets/assistant/assistant_speed.gif',
    yawning: '/assets/assistant/assistant_yawning.gif',
    'look-left': '/assets/assistant/assistant_look_left.png',
    'look-right': '/assets/assistant/assistant_look_right.png',
    'look-up': '/assets/assistant/assistant_look_up.png',
    'look-down': '/assets/assistant/assistant_look_down.png',
    confused: '/assets/assistant/assistant_confused.png',
    waiting: '/assets/assistant/assistant_waiting.png'
  }"
  [enableInactivityDetection]="true"
  [enableTypingDetection]="true"
  [enableSlowActionDetection]="true"
  [enableCursorTracking]="false"
  apiUrl="/api/assistant/chat"
></app-assistant-widget>
```

### Control de Funcionalidades

#### 1. Detección de Inactividad (`enableInactivityDetection`)
```typescript
[enableInactivityDetection]="true"  // Por defecto: true
```
**¿Qué hace?**
- Detecta cuando el usuario no interactúa por 1 hora
- Muestra el estado "yawning" (bostezando)
- Útil para aplicaciones de larga duración

**Cuándo deshabilitarlo:**
- Aplicaciones críticas donde no quieres distracciones
- Dashboards que se usan pasivamente
- Aplicaciones de monitoreo

**Impacto en rendimiento:** ⚡ BAJO (solo un timer)

---

#### 2. Detección de Escritura (`enableTypingDetection`)
```typescript
[enableTypingDetection]="true"  // Por defecto: true
```
**¿Qué hace?**
- Detecta cuando el usuario escribe en inputs/textareas
- Mueve los ojos del asistente hacia donde está escribiendo
- Calcula la dirección basándose en la posición del input vs el asistente

**Cuándo deshabilitarlo:**
- Aplicaciones con muchos formularios (puede ser distractivo)
- Si el rendimiento es crítico
- Si no tienes imágenes de movimiento de ojos

**Impacto en rendimiento:** ⚡⚡ MEDIO (listeners en keydown/keyup)

**Limitaciones:**
- No funciona en iframes
- No funciona en elementos con shadow DOM
- Usa la posición del input, no del cursor exacto

---

#### 3. Detección de Lentitud (`enableSlowActionDetection`)
```typescript
[enableSlowActionDetection]="true"  // Por defecto: true
```
**¿Qué hace?**
- Detecta cuando el usuario está 5+ segundos sin hacer nada
- Muestra estados "confused" o "waiting"
- Puede ofrecer ayuda automática

**Cuándo deshabilitarlo:**
- Aplicaciones donde leer es parte del flujo normal
- Formularios complejos que requieren tiempo
- Aplicaciones educativas

**Impacto en rendimiento:** ⚡ BAJO (solo un timer)

**⚠️ IMPORTANTE:** Ajusta `SLOW_ACTION_THRESHOLD` según tu aplicación:
```typescript
// En el código (línea ~19):
const SLOW_ACTION_THRESHOLD = 5000; // 5 segundos por defecto

// Recomendaciones:
// - Aplicación rápida (chat, búsquedas): 3000 ms
// - Aplicación estándar (formularios): 5000-7000 ms
// - Aplicación compleja (reportes, análisis): 10000+ ms
```

---

#### 4. Tracking de Cursor (`enableCursorTracking`)
```typescript
[enableCursorTracking]="false"  // Por defecto: false
```
**¿Qué hace?**
- Detecta el movimiento del mouse en tiempo real
- Mueve los ojos del asistente siguiendo el cursor
- Proporciona interacción muy dinámica

**⚠️ ADVERTENCIA - ALTO COSTO DE RENDIMIENTO:**
- Se ejecuta 60+ veces por segundo
- Puede causar lag en dispositivos lentos
- Solo usar si el efecto visual es crítico

**Cuándo habilitarlo:**
- Landing pages con pocos elementos
- Experiencias inmersivas
- Hardware potente garantizado

**Impacto en rendimiento:** ⚡⚡⚡⚡ MUY ALTO

**Optimización aplicada:**
- Throttling de 500ms (ajustable en línea ~20)
- Zona muerta de 100px cerca del asistente
- Solo actualiza si la dirección cambia

---

## 🚀 Consideraciones de Rendimiento {#rendimiento}

### 🔴 CRÍTICO - Memory Leaks
El sistema agrega múltiples listeners globales. **DEBEN limpiarse en ngOnDestroy** o causarán:
1. Memory leaks
2. Errores después de cambiar de ruta
3. Degradación progresiva del rendimiento

**Verificación:**
```typescript
// Al destruir el componente, deberías ver en consola:
// [AssistantWidget] Limpiando detección avanzada...
// [AssistantWidget] ✓ Limpieza completada
```

### ⚠️ Eventos de Alta Frecuencia

#### mousemove (si enableCursorTracking=true)
- **Frecuencia:** 60-120 eventos/segundo
- **Mitigación:** Throttling de 500ms
- **Recomendación:** Mantener deshabilitado salvo necesidad real

#### keydown/keyup (si enableTypingDetection=true)
- **Frecuencia:** Variable, depende del usuario
- **Mitigación:** Throttling interno + debouncing
- **Recomendación:** Seguro para uso general

#### click/scroll/touch
- **Frecuencia:** Baja-Media
- **Mitigación:** Passive listeners
- **Recomendación:** Seguro, no impacta rendimiento

### 📊 Configuraciones Recomendadas por Tipo de Aplicación

#### Aplicación de Alto Rendimiento (Trading, Gaming, Tiempo Real)
```typescript
[enableInactivityDetection]="false"
[enableTypingDetection]="false"
[enableSlowActionDetection]="false"
[enableCursorTracking]="false"
// Solo funcionalidad básica de chat
```

#### Aplicación Estándar (ERP, CRM, Forms)
```typescript
[enableInactivityDetection]="true"
[enableTypingDetection]="true"
[enableSlowActionDetection]="true"
[enableCursorTracking]="false"
// Configuración balanceada (RECOMENDADA)
```

#### Aplicación Inmersiva (Landing, Portfolio, Showcase)
```typescript
[enableInactivityDetection]="true"
[enableTypingDetection]="true"
[enableSlowActionDetection]="true"
[enableCursorTracking]="true"
// Máxima interactividad
```

---

## 🎨 Imágenes Requeridas {#imágenes}

### Estructura de Carpetas
```
public/assets/assistant/
├── assistant_idle.png          ✅ Ya existe
├── assistant_talk.png          ✅ Ya existe
├── assistant_think.png         ✅ Ya existe
├── assistant_notify.png        ✅ Ya existe
├── assistant_speed.png         ✅ Ya existe
├── assistant_yawning.gif       ❌ CREAR - Bostezando
├── assistant_look_left.png     ❌ CREAR - Ojos a la izquierda
├── assistant_look_right.png    ❌ CREAR - Ojos a la derecha
├── assistant_look_up.png       ❌ CREAR - Ojos arriba
├── assistant_look_down.png     ❌ CREAR - Ojos abajo
├── assistant_confused.png      ❌ CREAR - Confundido
└── assistant_waiting.png       ❌ CREAR - Esperando
```

### Especificaciones Técnicas

#### Formato Recomendado
- **Estáticas (idle, look-*)**: PNG 64x64px con transparencia
- **Animadas (yawning, think)**: GIF 64x64px, max 500KB
- **Alternativa:** WebP (mejor compresión)

#### Optimización
```bash
# Usando ImageMagick
convert input.png -resize 64x64 -strip output.png

# Usando cwebp (para WebP)
cwebp -q 80 input.png -o output.webp
```

### Creación Rápida (Placeholder)
Si no tienes las imágenes, puedes usar el mismo asset para múltiples estados temporalmente:

```typescript
animationPath="/assets/assistant/logo_assistant.png"
// o
[animationPath]="{
  idle: '/assets/assistant/logo_assistant.png',
  talk: '/assets/assistant/logo_assistant.png',
  yawning: '/assets/assistant/logo_assistant.png',
  // ... usar la misma para todos temporalmente
}"
```

---

## 🎯 Personalización Avanzada {#personalización}

### Ajustar Tiempos de Detección
Edita las constantes en `assistant-widget.component.ts` (líneas 15-20):

```typescript
// INACTIVIDAD: Tiempo para mostrar bostezo
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora por defecto
// Cambiar a:
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos

// LENTITUD: Tiempo sin actividad para considerar "lento"
const SLOW_ACTION_THRESHOLD = 5000; // 5 segundos
// Cambiar a:
const SLOW_ACTION_THRESHOLD = 10000; // 10 segundos para apps complejas
const SLOW_ACTION_THRESHOLD = 3000;  // 3 segundos para apps rápidas

// TRACKING DE CURSOR: Frecuencia de actualización
const CURSOR_TRACKING_THROTTLE = 500; // 500ms por defecto
// Cambiar a:
const CURSOR_TRACKING_THROTTLE = 200; // Más fluido (más CPU)
const CURSOR_TRACKING_THROTTLE = 1000; // Menos fluido (menos CPU)
```

### Ajustar Zona Muerta de Ojos
```typescript
// En updateEyeDirection() (línea ~370):
if (distance < 100) { // Zona muerta actual: 100px
  return;
}
// Cambiar a:
if (distance < 200) { // Zona muerta más grande
if (distance < 50) {  // Zona muerta más pequeña
```

### Modificar Prioridad de Estados
```typescript
// En getMoodPriority() (línea ~480):
const priorities: Record<AssistantMood, number> = {
  'think': 100,    // Mayor prioridad
  'talk': 90,
  'yawning': 60,   // Ajustar según necesidad
  'look-left': 30, // Menor prioridad
  'idle': 0
};
```

### Agregar Mensajes Automáticos
```typescript
// En onUserInactive() (línea ~260):
this.pushAssistant('¿Sigues ahí? Llevo esperando un buen rato...');

// En onUserSlow() (línea ~430):
if (Math.random() > 0.7) {
  this.pushAssistant('¿Necesitas ayuda con algo?');
}
```

---

## 🐛 Troubleshooting {#troubleshooting}

### El asistente no cambia de estado
1. **Verificar consola:** Deberías ver logs como `[AssistantWidget] Moviendo ojos: look-left`
2. **Verificar archivos:** Asegúrate que las rutas de imágenes existen
3. **Verificar prioridad:** Estados de menor prioridad no sobreescriben estados actuales

### Lag o rendimiento bajo
1. **Deshabilitar cursor tracking:** `[enableCursorTracking]="false"`
2. **Aumentar throttling:** Cambiar `CURSOR_TRACKING_THROTTLE` a 1000ms
3. **Deshabilitar detecciones:** Deshabilitar funciones que no uses

### Los ojos no siguen correctamente
1. **Verificar posición del asistente:** Debe estar visible en pantalla
2. **Ajustar zona muerta:** Si está muy cerca, no cambiará dirección
3. **Verificar console.log:** Ver qué ángulos se calculan

### Memory leaks después de cambiar de ruta
1. **Verificar ngOnDestroy:** Debe llamarse correctamente
2. **Buscar en consola:** "Limpiando detección avanzada..."
3. **Verificar listeners:** Usar Chrome DevTools > Performance Monitor

### El asistente aparece duplicado
- Asegúrate de que `<app-assistant-widget>` solo está una vez en la aplicación
- Recomendación: Solo en `app.layout.ts` o en el componente raíz

---

## 📝 Logs de Debugging

Para debug, revisa los console.log:
```
[AssistantWidget] Inicializando detección avanzada...
[AssistantWidget] ✓ Detección de inactividad habilitada
[AssistantWidget] ✓ Detección de escritura habilitada
[AssistantWidget] ✓ Detección de lentitud habilitada
[AssistantWidget] Moviendo ojos: look-right (ángulo: 45.2°)
[AssistantWidget] Usuario inactivo por 1 hora - mostrando bostezo
[AssistantWidget] Usuario lento/confundido - mostrando estado de espera
[AssistantWidget] Limpiando detección avanzada...
[AssistantWidget] ✓ Limpieza completada
```

Para producción, busca y comenta los `console.log()` o usa:
```typescript
private DEBUG = false; // Cambiar a true para debug

if (this.DEBUG) console.log('[AssistantWidget] ...');
```

---

## 🎓 Mejores Prácticas

1. **Empezar simple:** Comienza con solo detección básica, agrega funcionalidades gradualmente
2. **Probar en dispositivos lentos:** Lo que funciona bien en desktop puede lagear en móvil
3. **Usar imágenes optimizadas:** Preferir PNG/WebP sobre GIF cuando sea posible
4. **Monitorear rendimiento:** Usar Chrome DevTools > Performance
5. **Considerar accesibilidad:** El asistente no debe ser la única forma de obtener ayuda
6. **Permitir deshabilitarlo:** Considera agregar una opción en configuración de usuario

---

## 🔮 Futuras Mejoras Posibles

- [ ] Detección de frustración (múltiples clicks rápidos)
- [ ] Detección de scroll rápido (usuario buscando algo)
- [ ] Estados contextuales por ruta (diferentes comportamientos por módulo)
- [ ] Gestos personalizados (animaciones específicas por acción)
- [ ] Integración con analytics (track de interacciones)
- [ ] Soporte para múltiples idiomas en tips
- [ ] Modo "discreto" con interacciones mínimas
- [ ] Sincronización con notificaciones del sistema

---

## 📚 Referencias

- [MDN: Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Web.dev: Optimize JavaScript execution](https://web.dev/optimize-javascript-execution/)
- [Angular Performance Checklist](https://github.com/mgechev/angular-performance-checklist)

---

**Versión:** 1.0.0  
**Última actualización:** 27 de diciembre de 2025  
**Autor:** GitHub Copilot + Tu Equipo
