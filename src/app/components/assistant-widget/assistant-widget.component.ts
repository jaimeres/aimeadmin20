import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { AssistantWidgetService, AssistantMessage, AssistantResponse } from '../services/assistant-widget.service'; //
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type AssistantMood = 'idle' | 'talk' | 'think' | 'notify' | 'speed' | 'yawning' | 'look-left' | 'look-right' | 'look-up' | 'look-down' | 'confused' | 'waiting';

/**
 * CONSIDERACIONES DE RENDIMIENTO:
 * - Los listeners globales pueden afectar el rendimiento si no se optimizan
 * - Se usa throttling para limitar la frecuencia de ejecución
 * - Se usa debouncing para esperar a que el usuario termine de interactuar
 * - Es importante limpiar todos los listeners en ngOnDestroy
 * - Los timers largos (inactividad) deben cancelarse al destruir el componente
 */

/**
 * CONFIGURACIÓN DE DETECCIÓN:
 * Estos valores afectan el rendimiento y la experiencia del usuario
 */
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora en ms (AJUSTAR según necesidad)
const TYPING_DETECTION_THROTTLE = 300; // ms entre detecciones de escritura (RENDIMIENTO: más bajo = más CPU)
const SLOW_ACTION_THRESHOLD = 5000; // ms sin actividad para considerar "lento" (AJUSTAR según UX)
const CURSOR_TRACKING_THROTTLE = 500; // ms entre actualizaciones de posición del cursor (RENDIMIENTO CRÍTICO)
const EYE_UPDATE_DEBOUNCE = 200; // ms para actualizar dirección de ojos (RENDIMIENTO: evita cambios rápidos)


@Component({
  selector: 'app-assistant-widget',
  imports: [CommonModule, FormsModule, LottieComponent],
  templateUrl: './assistant-widget.component.html',
  styleUrl: './assistant-widget.component.scss',
  standalone: true,
})
export class AssistantWidgetComponent {

  /**
   * Rutas LOCALES a tus JSON Lottie. No hay llamadas HTTP externas.
   * Coloca los archivos en /assets/assistant/ (o ajusta las rutas).
   */

  /**
   * Puede ser un string (ruta única) o un objeto Record<AssistantMood, string>.
   * Si es string, se usará para todos los estados.
   * 
   * RENDIMIENTO: Considera usar sprites o imágenes optimizadas (WebP)
1   * IMPORTANTE: Los JSON de Lottie pueden ser pesados, usa imágenes estáticas cuando sea posible
   */
  @Input() animationPath: string | Record<AssistantMood, string> = {
    idle: '/assets/assistant/assistant_idle.json',
    talk: '/assets/assistant/assistant_talk.json',
    think: '/assets/assistant/assistant_think.json',
    notify: '/assets/assistant/assistant_notify.json',
    speed: '/assets/assistant/assistant_speed.json',
    yawning: '/assets/assistant/assistant_yawning.json',      // Estado: bostezando por inactividad
    'look-left': '/assets/assistant/assistant_look_left.json',   // Mirando a la izquierda
    'look-right': '/assets/assistant/assistant_look_right.json', // Mirando a la derecha
    'look-up': '/assets/assistant/assistant_look_up.json',       // Mirando arriba
    'look-down': '/assets/assistant/assistant_look_down.json',   // Mirando abajo
    confused: '/assets/assistant/assistant_confused.json',     // Usuario lento/confundido
    waiting: '/assets/assistant/assistant_waiting.json',       // Esperando acción del usuario
  };

  /**
   * Habilitar/deshabilitar detección de eventos avanzados
   * RENDIMIENTO: Deshabilita funcionalidades que no necesites para ahorrar recursos
   */
  @Input() enableInactivityDetection = true;      // Detectar 1 hora sin actividad
  @Input() enableTypingDetection = true;          // Detectar escritura y mover ojos
  @Input() enableSlowActionDetection = true;      // Detectar lentitud del usuario
  @Input() enableCursorTracking = false;          // ADVERTENCIA: Alto costo de rendimiento

  @Input() apiUrl = '/api/assistant/chat';
  @Input() welcomeTips: string[] = [];
  @Input() context: Record<string, any> = {};

  // Estado UI
  open = false;
  thinking = false;
  messages: AssistantMessage[] = [];
  draft = '';

  // Estado de la animación (local, sin HTTP externo)
  mood: AssistantMood = 'idle';
  options: AnimationOptions = { path: '', loop: true, autoplay: true };

  // Detectar si es imagen estática o animación Lottie
  isStaticImage = false;
  imagePath = '';

  // Variables para drag and drop
  isDragging = false;
  fabPosition = { x: 20, y: 20 }; // posición desde right y bottom
  dragStart = { x: 0, y: 0 };
  dragOffset = { x: 0, y: 0 };

  // ===== SISTEMA DE DETECCIÓN DE ACTIVIDAD =====
  // RENDIMIENTO: Estos timers deben limpiarse en ngOnDestroy
  private lastActivityTime = Date.now();
  private inactivityTimer: any = null;
  private slowActionTimer: any = null;
  private cursorTrackingTimer: any = null;
  private eyeUpdateTimer: any = null;

  // Estado actual del usuario
  private isUserTyping = false;
  private isUserInactive = false;
  private isUserSlow = false;
  private lastCursorPosition = { x: 0, y: 0 };
  private currentEyeDirection: AssistantMood | null = null;

  /**
   * IMPORTANTE: Funciones bound para poder removerlas correctamente
   * Si no se bindean, no se pueden remover y causan memory leaks
   */
  private boundHandleUserActivity: any;
  private boundHandleKeyPress: any;
  private boundHandleCursorMove: any;

  private destroy$ = new Subject<void>();
  private idle$ = new Subject<void>();

  constructor(private svc: AssistantWidgetService) { }

  ngOnInit(): void {
    // Detectar si es imagen estática o animación Lottie
    this.detectFileType();

    // Inicializa opciones con el JSON local correspondiente
    if (!this.isStaticImage) {
      this.refreshOptions();
    }

    // Tip de bienvenida tras 2.5s de inactividad
    this.idle$.pipe(debounceTime(2500), takeUntil(this.destroy$)).subscribe(() => {
      if (!this.open && this.welcomeTips?.length) {
        const tip = this.welcomeTips[Math.floor(Math.random() * this.welcomeTips.length)];
        this.pushAssistant(tip);
        setTimeout(() => this.messages.pop(), 5000);
      }
    });
    this.pokeIdle();

    // Agregar listeners globales para drag and drop
    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
    document.addEventListener('touchmove', this.onDragMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onDragEnd.bind(this));

    // ===== INICIALIZAR SISTEMA DE DETECCIÓN AVANZADO =====
    this.initializeAdvancedDetection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Remover listeners globales de drag and drop
    document.removeEventListener('mousemove', this.onDragMove.bind(this));
    document.removeEventListener('mouseup', this.onDragEnd.bind(this));
    document.removeEventListener('touchmove', this.onDragMove.bind(this));
    document.removeEventListener('touchend', this.onDragEnd.bind(this));

    // ===== LIMPIEZA CRÍTICA: PREVENIR MEMORY LEAKS =====
    // IMPORTANTE: Si no se limpian estos listeners, seguirán ejecutándose
    // incluso después de destruir el componente, causando:
    // 1. Memory leaks
    // 2. Errores de referencia a objetos destruidos
    // 3. Degradación del rendimiento
    this.cleanupAdvancedDetection();
  }

  private detectFileType() {
    const path = typeof this.animationPath === 'string'
      ? this.animationPath
      : this.animationPath[this.mood];

    // Detectar extensiones de imagen estática
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    this.isStaticImage = imageExtensions.some(ext => path.toLowerCase().endsWith(ext));

    if (this.isStaticImage) {
      this.imagePath = path;
    }
  }

  private refreshOptions() {
    const path = typeof this.animationPath === 'string'
      ? this.animationPath
      : this.animationPath[this.mood];

    // Actualizar detección de tipo
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    this.isStaticImage = imageExtensions.some(ext => path.toLowerCase().endsWith(ext));

    if (this.isStaticImage) {
      this.imagePath = path;
    } else {
      this.options = {
        path: path,
        loop: true,
        autoplay: true
      };
    }
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      if (this.messages.length === 0) {
        this.pushAssistant('Pregúntame lo que quieras sobre tu empresa o el sistema. ¿En qué te ayudo?');
      }
      this.setMood('talk');
    } else {
      this.setMood('idle');
    }
  }

  send(): void {
    const text = this.draft?.trim();
    if (!text) return;
    const userMsg: AssistantMessage = { role: 'user', content: text, ts: new Date().toISOString() };
    this.messages.push(userMsg);
    this.draft = '';
    this.askServer();
  }

  async askServer(): Promise<void> {
    try {
      this.thinking = true;
      this.setMood('think');
      const res = await this.svc.chat(this.apiUrl, this.messages, this.context).toPromise();
      if (res && res.messages) {
        for (const m of res.messages) this.messages.push(m);
      } else {
        this.messages.push({ role: 'assistant', content: 'Sin respuesta del servidor.', ts: new Date().toISOString(), error: true });
      }
      // Tras responder, vuelve a talk unos segundos y luego idle si cierran el panel
      this.setMood('talk');
      setTimeout(() => { if (!this.open) this.setMood('idle'); }, 3000);
    } catch (e: any) {
      this.messages.push({ role: 'assistant', content: 'Error al consultar el servidor. Intenta de nuevo.', ts: new Date().toISOString(), error: true });
      this.setMood('notify');
      setTimeout(() => this.setMood(this.open ? 'talk' : 'idle'), 2500);
    } finally {
      this.thinking = false;
    }
  }

  pushAssistant(text: string): void {
    this.messages.push({ role: 'assistant', content: text, ts: new Date().toISOString() });
  }

  onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      this.send();
      e.preventDefault();
    }
  }

  // Dispara la lógica de consejos por inactividad
  pokeIdle() { this.idle$.next(); }

  // ===== Drag and Drop =====
  onDragStart(event: MouseEvent | TouchEvent): void {
    event.stopPropagation();
    this.isDragging = true;

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    this.dragStart = { x: clientX, y: clientY };
    this.dragOffset = { x: this.fabPosition.x, y: this.fabPosition.y };

    // Prevenir selección de texto mientras se arrastra
    document.body.style.userSelect = 'none';
  }

  onDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    event.preventDefault();
    event.stopPropagation();

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    const deltaX = this.dragStart.x - clientX;
    const deltaY = this.dragStart.y - clientY;

    // Calcular nueva posición
    let newX = this.dragOffset.x + deltaX;
    let newY = this.dragOffset.y + deltaY;

    // Limitar dentro de la ventana (con margen de 10px)
    const margin = 10;
    const fabSize = 84;
    newX = Math.max(margin, Math.min(window.innerWidth - fabSize - margin, newX));
    newY = Math.max(margin, Math.min(window.innerHeight - fabSize - margin, newY));

    this.fabPosition = { x: newX, y: newY };
  }

  onDragEnd(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    event.stopPropagation();
    this.isDragging = false;

    // Restaurar selección de texto
    document.body.style.userSelect = '';
  }

  getFabStyle(): any {
    return {
      right: `${this.fabPosition.x}px`,
      bottom: `${this.fabPosition.y}px`,
      cursor: this.isDragging ? 'grabbing' : 'grab'
    };
  }

  getPanelStyle(): any {
    // El panel se posiciona cerca del botón
    const panelOffset = 96; // Espacio entre el botón y el panel
    return {
      right: `${this.fabPosition.x}px`,
      bottom: `${this.fabPosition.y + panelOffset}px`
    };
  }

  // ===== SISTEMA AVANZADO DE DETECCIÓN DE EVENTOS =====

  /**
   * Inicializa todo el sistema de detección de eventos del usuario
   * RENDIMIENTO: Solo inicializa lo que está habilitado mediante @Input
   */
  private initializeAdvancedDetection(): void {
    console.log('[AssistantWidget] Inicializando detección avanzada...');

    // Bind de funciones para poder removerlas después
    this.boundHandleUserActivity = this.handleUserActivity.bind(this);
    this.boundHandleKeyPress = this.handleKeyPress.bind(this);
    this.boundHandleCursorMove = this.throttle(this.handleCursorMove.bind(this), CURSOR_TRACKING_THROTTLE);

    if (this.enableInactivityDetection) {
      this.startInactivityDetection();
      console.log('[AssistantWidget] ✓ Detección de inactividad habilitada');
    }

    if (this.enableTypingDetection) {
      // RENDIMIENTO: keydown/keyup pueden dispararse muchas veces
      // Se usa throttling interno en handleKeyPress
      document.addEventListener('keydown', this.boundHandleKeyPress);
      document.addEventListener('keyup', this.boundHandleKeyPress);
      console.log('[AssistantWidget] ✓ Detección de escritura habilitada');
    }

    if (this.enableSlowActionDetection) {
      this.startSlowActionDetection();
      console.log('[AssistantWidget] ✓ Detección de lentitud habilitada');
    }

    if (this.enableCursorTracking) {
      // ADVERTENCIA: Alto costo de rendimiento
      // mousemove puede dispararse 60+ veces por segundo
      document.addEventListener('mousemove', this.boundHandleCursorMove);
      console.warn('[AssistantWidget] ⚠ Tracking de cursor habilitado (alto costo de rendimiento)');
    }

    // Detectar actividad general del usuario
    // RENDIMIENTO: Se usa throttling para limitar ejecuciones
    const activityEvents = ['click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, this.boundHandleUserActivity, { passive: true });
    });
  }

  /**
   * Limpia TODOS los listeners y timers
   * CRÍTICO: Llamar en ngOnDestroy para prevenir memory leaks
   */
  private cleanupAdvancedDetection(): void {
    console.log('[AssistantWidget] Limpiando detección avanzada...');

    // Limpiar timers
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.slowActionTimer) clearTimeout(this.slowActionTimer);
    if (this.cursorTrackingTimer) clearTimeout(this.cursorTrackingTimer);
    if (this.eyeUpdateTimer) clearTimeout(this.eyeUpdateTimer);

    // Remover listeners de escritura
    if (this.boundHandleKeyPress) {
      document.removeEventListener('keydown', this.boundHandleKeyPress);
      document.removeEventListener('keyup', this.boundHandleKeyPress);
    }

    // Remover listener de cursor
    if (this.boundHandleCursorMove) {
      document.removeEventListener('mousemove', this.boundHandleCursorMove);
    }

    // Remover listeners de actividad general
    if (this.boundHandleUserActivity) {
      const activityEvents = ['click', 'scroll', 'touchstart'];
      activityEvents.forEach(event => {
        document.removeEventListener(event, this.boundHandleUserActivity);
      });
    }

    console.log('[AssistantWidget] ✓ Limpieza completada');
  }

  // ===== DETECCIÓN DE INACTIVIDAD (1 HORA SIN ACTIVIDAD) =====

  /**
   * Inicia el sistema de detección de inactividad
   * CONSIDERACIÓN: 1 hora puede ser mucho o poco según el contexto
   * - Aplicaciones de productividad: considera 15-30 minutos
   * - Aplicaciones casuales: 1 hora está bien
   * - Aplicaciones críticas: puede que no quieras mostrar bostezo
   */
  private startInactivityDetection(): void {
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);

    this.isUserInactive = false;
    this.lastActivityTime = Date.now();

    this.inactivityTimer = setTimeout(() => {
      this.onUserInactive();
    }, INACTIVITY_TIMEOUT);
  }

  private onUserInactive(): void {
    if (this.open) return; // No molestar si el usuario tiene el chat abierto

    console.log('[AssistantWidget] Usuario inactivo por 1 hora - mostrando bostezo');
    this.isUserInactive = true;
    this.setMood('yawning');

    // Opcional: Mostrar mensaje
    // this.pushAssistant('¿Sigues ahí? Llevo esperando un buen rato...');

    // Volver a idle después de 5 segundos
    setTimeout(() => {
      if (!this.open) this.setMood('idle');
    }, 5000);
  }

  // ===== DETECCIÓN DE ESCRITURA Y MOVIMIENTO DE OJOS =====

  /**
   * Detecta cuando el usuario está escribiendo
   * RENDIMIENTO: Se usa throttling para evitar ejecuciones excesivas
   * LIMITACIÓN: No puede detectar en iframes o elementos con shadow DOM
   */
  private handleKeyPress(event: KeyboardEvent): void {
    this.handleUserActivity();
    this.isUserTyping = true;

    // Detectar posición del elemento activo (input/textarea donde escribe)
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')) {
      this.isUserTyping = false;
      return;
    }

    // CONSIDERACIÓN: Esta es una aproximación
    // El cursor real del texto no se puede obtener con precisión
    // Usamos la posición del elemento en su lugar
    const rect = activeElement.getBoundingClientRect();
    const typingPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    this.updateEyeDirection(typingPosition);

    // Resetear después de 1 segundo sin teclear
    clearTimeout(this.eyeUpdateTimer);
    this.eyeUpdateTimer = setTimeout(() => {
      this.isUserTyping = false;
      if (!this.open && !this.isDragging) {
        this.setMood('idle');
      }
    }, 1000);
  }

  /**
   * Actualiza la dirección de los ojos basándose en la posición del cursor o escritura
   * RENDIMIENTO: Se usa debouncing para evitar cambios rápidos que causen parpadeo
   * 
   * ALGORITMO:
   * 1. Calcula la posición del asistente en pantalla
   * 2. Calcula la posición del punto de interés (cursor/input)
   * 3. Determina la dirección basándose en ángulos y distancia
   * 4. Solo actualiza si la dirección cambió (evita renders innecesarios)
   */
  private updateEyeDirection(targetPosition: { x: number; y: number }): void {
    if (this.open || this.isDragging) return; // No cambiar ojos durante interacciones

    // Calcular posición central del asistente
    const fabRect = {
      x: window.innerWidth - this.fabPosition.x - 42, // 42 = mitad de 84px
      y: window.innerHeight - this.fabPosition.y - 42
    };

    // Calcular diferencias
    const deltaX = targetPosition.x - fabRect.x;
    const deltaY = targetPosition.y - fabRect.y;

    // Calcular ángulo (-180 a 180 grados)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // IMPORTANTE: Zona muerta para evitar cambios cuando está muy cerca
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < 100) {
      // Muy cerca, no cambiar dirección
      return;
    }

    // Determinar dirección basándose en ángulos
    // AJUSTA estos valores según el diseño de tus imágenes
    let newDirection: AssistantMood;
    if (angle >= -45 && angle < 45) {
      newDirection = 'look-right';
    } else if (angle >= 45 && angle < 135) {
      newDirection = 'look-down';
    } else if (angle >= 135 || angle < -135) {
      newDirection = 'look-left';
    } else {
      newDirection = 'look-up';
    }

    // Solo actualizar si cambió (evita renders innecesarios)
    if (newDirection !== this.currentEyeDirection) {
      console.log(`[AssistantWidget] Moviendo ojos: ${newDirection} (ángulo: ${angle.toFixed(1)}°)`);
      this.currentEyeDirection = newDirection;
      this.setMood(newDirection);
    }
  }

  /**
   * Maneja el movimiento del cursor
   * ADVERTENCIA: Este método puede ejecutarse 60+ veces por segundo
   * SOLO habilitar si realmente lo necesitas
   */
  private handleCursorMove(event: MouseEvent): void {
    this.lastCursorPosition = { x: event.clientX, y: event.clientY };
    this.updateEyeDirection(this.lastCursorPosition);
  }

  // ===== DETECCIÓN DE LENTITUD/CONFUSIÓN DEL USUARIO =====

  /**
   * Detecta cuando el usuario está tardando en realizar acciones
   * CASOS DE USO:
   * - Usuario está leyendo instrucciones largas
   * - Usuario está confundido
   * - Usuario se distrajo
   * 
   * CONSIDERACIÓN: Puede ser molesto si se activa demasiado
   * Ajusta SLOW_ACTION_THRESHOLD según tu aplicación
   */
  private startSlowActionDetection(): void {
    this.resetSlowActionTimer();
  }

  private resetSlowActionTimer(): void {
    if (this.slowActionTimer) clearTimeout(this.slowActionTimer);

    this.isUserSlow = false;

    this.slowActionTimer = setTimeout(() => {
      this.onUserSlow();
    }, SLOW_ACTION_THRESHOLD);
  }

  private onUserSlow(): void {
    if (this.open || this.isDragging) return;

    console.log('[AssistantWidget] Usuario lento/confundido - mostrando estado de espera');
    this.isUserSlow = true;

    // Cambiar entre 'confused' y 'waiting' según el contexto
    // 'confused': Si parece que no sabe qué hacer
    // 'waiting': Si simplemente está tomándose su tiempo
    const mood: AssistantMood = Math.random() > 0.5 ? 'confused' : 'waiting';
    this.setMood(mood);

    // Opcional: Ofrecer ayuda
    // if (Math.random() > 0.7) {
    //   this.pushAssistant('¿Necesitas ayuda con algo?');
    // }

    // Volver a idle después de 3 segundos
    setTimeout(() => {
      if (!this.open && !this.isUserTyping) this.setMood('idle');
    }, 3000);
  }

  /**
   * Se llama en cualquier actividad del usuario
   * RENDIMIENTO: Esta función se ejecuta MUCHO, mantenerla ligera
   */
  private handleUserActivity(): void {
    // Resetear todos los timers de inactividad/lentitud
    if (this.enableInactivityDetection) {
      this.resetInactivityTimer();
    }
    if (this.enableSlowActionDetection) {
      this.resetSlowActionTimer();
    }
  }

  // ===== UTILIDADES =====

  /**
   * Throttle: Limita la frecuencia de ejecución de una función
   * RENDIMIENTO: Esencial para eventos que se disparan frecuentemente
   * 
   * @param func Función a throttlear
   * @param limit Tiempo mínimo entre ejecuciones (ms)
   */
  private throttle(func: Function, limit: number): any {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * OVERRIDE del setMood original para considerar prioridades
   * IMPORTANTE: Algunos estados tienen mayor prioridad que otros
   */
  setMood(mood: AssistantMood) {
    // No cambiar mood durante drag o chat abierto
    if (this.isDragging || this.open) return;

    // Prioridad de estados:
    // 1. think (respondiendo al usuario)
    // 2. talk (chat abierto)
    // 3. notify (alerta importante)
    // 4. yawning, confused (estados emocionales)
    // 5. look-* (movimiento de ojos)
    // 6. idle (reposo)

    const currentPriority = this.getMoodPriority(this.mood);
    const newPriority = this.getMoodPriority(mood);

    // Solo cambiar si la nueva prioridad es mayor o igual
    if (newPriority >= currentPriority) {
      this.mood = mood;
      this.refreshOptions();
    }
  }

  /**
   * Define la prioridad de cada estado
   * Mayor número = mayor prioridad
   */
  private getMoodPriority(mood: AssistantMood): number {
    const priorities: Record<AssistantMood, number> = {
      'think': 100,
      'talk': 90,
      'notify': 80,
      'speed': 70,
      'yawning': 60,
      'confused': 50,
      'waiting': 45,
      'look-left': 30,
      'look-right': 30,
      'look-up': 30,
      'look-down': 30,
      'idle': 0
    };
    return priorities[mood] || 0;
  }
}

