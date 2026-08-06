import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { Subject, debounceTime, firstValueFrom, map, startWith, takeUntil } from 'rxjs';
import { AssistantMessage, AssistantWidgetService } from '../services/assistant-widget.service';
import { GeneralService } from '@/utils/services/general.service';
import { AssistantMascotActionComponent } from './assistant-mascot-action/assistant-mascot-action.component';

export type AssistantMood = 'idle' | 'talk' | 'think' | 'notify' | 'speed' | 'yawning' | 'look-left' | 'look-right' | 'look-up' | 'look-down' | 'confused' | 'waiting';
export type AssistantExpression = AssistantMood | 'frightened' | 'searching' | 'working';

const INACTIVITY_TIMEOUT = 60 * 60 * 1000;
const SLOW_ACTION_THRESHOLD = 5000;
const CURSOR_TRACKING_THROTTLE = 90;
const TYPING_DETECTION_THROTTLE = 140;
const ACTIVITY_DETECTION_THROTTLE = 120;
const PANEL_OFFSET = 108;
const RAPID_ACTION_WINDOW = 1800;
const RAPID_ACTION_COUNT = 4;
const DELETE_ACTION_SELECTOR = 'button, [role="button"], a, .p-menuitem-link';
const DELETE_ICON_SELECTOR = '.pi-trash, .fa-trash, .fa-trash-alt, .bi-trash';
const DELETE_INTENT_PATTERN = /\b(eliminar|borrar|delete|trash|remove|quitar)\b/i;

const DEFAULT_ANIMATION_PATHS: Record<AssistantMood, string> = {
  idle: '/assets/assistant/assistant_idle.json',
  talk: '/assets/assistant/assistant_talk.json',
  think: '/assets/assistant/assistant_think.json',
  notify: '/assets/assistant/assistant_notify.json',
  speed: '/assets/assistant/assistant_speed.json',
  yawning: '/assets/assistant/assistant_yawning.json',
  'look-left': '/assets/assistant/assistant_look_left.json',
  'look-right': '/assets/assistant/assistant_look_right.json',
  'look-up': '/assets/assistant/assistant_look_up.json',
  'look-down': '/assets/assistant/assistant_look_down.json',
  confused: '/assets/assistant/assistant_confused.json',
  waiting: '/assets/assistant/assistant_waiting.json'
};

const MOOD_PRESENTATION: Record<AssistantExpression, { label: string; symbol: string }> = {
  idle: { label: 'Disponible', symbol: '' },
  talk: { label: 'Conversando', symbol: '•••' },
  think: { label: 'Pensando', symbol: '···' },
  notify: { label: 'Aviso', symbol: '!' },
  speed: { label: 'Vas muy rápido', symbol: 'ϟ' },
  yawning: { label: 'Con sueño', symbol: 'Zz' },
  'look-left': { label: 'Mirando a la izquierda', symbol: '' },
  'look-right': { label: 'Mirando a la derecha', symbol: '' },
  'look-up': { label: 'Mirando arriba', symbol: '' },
  'look-down': { label: 'Mirando abajo', symbol: '' },
  confused: { label: '¿Necesitas ayuda?', symbol: '?' },
  waiting: { label: 'Esperando', symbol: '◷' },
  frightened: { label: '¡Cuidado!', symbol: '!!' },
  searching: { label: 'Buscando', symbol: '' },
  working: { label: 'Trabajando', symbol: '' }
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
const LOOK_MOODS: ReadonlySet<AssistantExpression> = new Set(['look-left', 'look-right', 'look-up', 'look-down']);
const EXPRESSION_MOODS: ReadonlySet<AssistantExpression> = new Set(['talk', 'think', 'notify', 'speed', 'yawning', 'confused', 'waiting', 'frightened', 'searching', 'working']);

// [[[II ESC:032-01,032-03,032-04,032-05 DOC:docs/documents/2026-07-24-032-assistant-widget-mascota-natural.md#escenario-05
@Component({
  selector: 'app-assistant-widget',
  imports: [ReactiveFormsModule, LottieComponent, AssistantMascotActionComponent],
  templateUrl: './assistant-widget.component.html',
  styleUrl: './assistant-widget.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistantWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('assistantFab', { read: ElementRef })
  private fabElement?: ElementRef<HTMLElement>;

  private _animationPath: string | Record<AssistantMood, string> = DEFAULT_ANIMATION_PATHS;

  /**
   * Conserva la compatibilidad con imágenes o Lottie personalizados.
   * Sin un valor explícito se usa la mascota ligera de imagen + CSS.
   */
  @Input()
  set animationPath(value: string | Record<AssistantMood, string>) {
    this._animationPath = value;
    this.useCustomAnimation.set(true);
    this.refreshCustomAnimation();
  }

  get animationPath(): string | Record<AssistantMood, string> {
    return this._animationPath;
  }

  @Input() mascotImagePath = '/assets/assistant/assistant_logo_original.png';
  @Input() enableInactivityDetection = true;
  @Input() enableTypingDetection = true;
  @Input() enableSlowActionDetection = true;
  @Input() enableCursorTracking = true;
  @Input() apiUrl = '/api/assistant/chat';
  @Input() welcomeTips: string[] = [];
  @Input() context: Record<string, any> = {};

  readonly open = signal(false);
  readonly thinking = signal(false);
  readonly messages = signal<AssistantMessage[]>([]);
  readonly mood = signal<AssistantExpression>('idle');
  readonly isDragging = signal(false);
  readonly fabPosition = signal({ x: 20, y: 20 });
  readonly eyeOffset = signal({ x: 0, y: 0 });

  readonly useCustomAnimation = signal(false);
  readonly isStaticImage = signal(false);
  readonly imagePath = signal('');
  readonly animationOptions = signal<AnimationOptions>({
    path: '',
    loop: true,
    autoplay: true
  });

  readonly panelPosition = computed(() => {
    const position = this.fabPosition();
    return {
      right: position.x,
      bottom: position.y + PANEL_OFFSET
    };
  });
  readonly moodLabel = computed(() => MOOD_PRESENTATION[this.mood()].label);
  readonly moodSymbol = computed(() => MOOD_PRESENTATION[this.mood()].symbol);
  readonly eyeStyle = computed(() => ({
    x: `${this.eyeOffset().x}px`,
    y: `${this.eyeOffset().y}px`
  }));

  readonly draftControl = new FormControl('', { nonNullable: true });
  readonly draftEmpty = toSignal(
    this.draftControl.valueChanges.pipe(
      startWith(this.draftControl.value),
      map((value) => value.trim().length === 0)
    ),
    { initialValue: true }
  );

  private dragStart = { x: 0, y: 0 };
  private dragOffset = { x: 0, y: 0 };
  private dragMoved = false;
  private suppressNextClick = false;
  private dragListenersActive = false;

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private slowActionTimer: ReturnType<typeof setTimeout> | null = null;
  private typingResetTimer: ReturnType<typeof setTimeout> | null = null;
  private moodResetTimer: ReturnType<typeof setTimeout> | null = null;
  private welcomeTipTimer: ReturnType<typeof setTimeout> | null = null;
  private ambientEyeTimer: ReturnType<typeof setTimeout> | null = null;
  private dragClickResetTimer: ReturnType<typeof setTimeout> | null = null;

  private isUserTyping = false;
  private lastTimerResetAt = 0;
  private lastPointerActivityAt = 0;
  private ambientEyeIndex = 0;
  private recentActivityTimes: number[] = [];
  private nextSlowMood: AssistantMood = 'waiting';

  private readonly destroy$ = new Subject<void>();
  private readonly idle$ = new Subject<void>();
  private readonly activityEvents = ['scroll', 'touchstart'] as const;
  private readonly ambientEyePositions = [
    { x: 0, y: 0 },
    { x: -1.8, y: -0.4 },
    { x: 1.4, y: -1.1 },
    { x: 0.8, y: 1.2 },
    { x: -1.2, y: 0.8 }
  ];

  private readonly boundDragMove = (event: PointerEvent): void => this.onDragMove(event);
  private readonly boundDragEnd = (event: PointerEvent): void => this.onDragEnd(event);
  private readonly boundHandleUserActivity = this.throttle((): void => this.handleUserActivity(), ACTIVITY_DETECTION_THROTTLE);
  private readonly boundHandleClick = (event: MouseEvent): void => {
    this.boundHandleUserActivity();
    this.handleDeleteIntent(event);
  };
  private readonly boundHandleKeyPress = this.throttle((event: KeyboardEvent): void => this.handleKeyPress(event), TYPING_DETECTION_THROTTLE);
  private readonly boundHandleCursorMove = this.throttle((event: PointerEvent): void => this.handleCursorMove(event), CURSOR_TRACKING_THROTTLE);

  /** Contexto de conversación que devuelve el agente; se reenvía en cada turno. */
  private sessionId?: string;

  constructor(
    private readonly svc: AssistantWidgetService,
    private readonly general: GeneralService,
  ) {}

  ngOnInit(): void {
    this.idle$.pipe(debounceTime(2500), takeUntil(this.destroy$)).subscribe(() => {
      if (this.open() || this.welcomeTips.length === 0) return;

      const tip = this.welcomeTips[Math.floor(Math.random() * this.welcomeTips.length)];
      const tipMessage: AssistantMessage = {
        role: 'assistant',
        content: tip,
        ts: new Date().toISOString()
      };
      this.messages.update((messages) => [...messages, tipMessage]);
      this.welcomeTipTimer = setTimeout(() => {
        this.messages.update((messages) => messages.filter((message) => message !== tipMessage));
      }, 5000);
    });
    this.pokeIdle();

    this.initializeAdvancedDetection();
    this.scheduleAmbientEyeMotion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.removeDragListeners();
    document.body.style.userSelect = '';

    this.cleanupAdvancedDetection();
    this.clearTimer(this.typingResetTimer);
    this.clearTimer(this.moodResetTimer);
    this.clearTimer(this.welcomeTipTimer);
    this.clearTimer(this.ambientEyeTimer);
    this.clearTimer(this.dragClickResetTimer);
  }

  onFabClick(): void {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      this.clearTimer(this.dragClickResetTimer);
      return;
    }
    this.toggle();
  }

  onFabKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.toggle();
  }

  toggle(): void {
    const nextOpen = !this.open();
    this.open.set(nextOpen);
    this.clearTimer(this.moodResetTimer);

    if (nextOpen) {
      if (this.messages().length === 0) {
        this.pushAssistant('Pregúntame lo que quieras sobre tu empresa o el sistema. ¿En qué te ayudo?');
      }
      this.setMood('talk', true);
      return;
    }

    this.setMood('idle', true);
  }

  send(): void {
    const text = this.draftControl.value.trim();
    if (!text || this.thinking()) return;

    const userMessage: AssistantMessage = {
      role: 'user',
      content: text,
      ts: new Date().toISOString()
    };
    this.messages.update((messages) => [...messages, userMessage]);
    this.draftControl.reset('');
    void this.askServer(text);
  }

  async askServer(text: string): Promise<void> {
    try {
      this.thinking.set(true);
      this.setMood('think', true);

      const cliente = this.resolveCliente();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await firstValueFrom(
        this.svc.chat(this.apiUrl, text, { sessionId: this.sessionId, cliente, timeZone })
      );
      if (response.session_id) this.sessionId = response.session_id;

      if (response.respuesta) {
        this.pushAssistant(response.respuesta);
        this.setMood('talk', true);
        if (!this.open()) {
          this.clearTimer(this.moodResetTimer);
          this.moodResetTimer = setTimeout(() => this.setMood('idle', true), 3000);
        }
      } else if (response.bloqueado) {
        this.pushAssistantError(response.motivo ?? 'El asistente no está disponible.');
        this.notifyMood();
      } else {
        this.pushAssistantError(response.error ?? 'Sin respuesta del servidor.');
        this.notifyMood();
      }
    } catch {
      // Fallo de red o del servidor (no una respuesta de negocio).
      this.pushAssistantError('No se pudo conectar con el asistente.');
      this.notifyMood();
    } finally {
      this.thinking.set(false);
    }
  }

  private resolveCliente(): 'web' | 'desktop' | 'mobile' {
    try {
      return this.general.getClientPlatform?.() ?? 'web';
    } catch {
      return 'web';
    }
  }

  private pushAssistantError(text: string): void {
    this.messages.update((messages) => [
      ...messages,
      { role: 'assistant', content: text, ts: new Date().toISOString(), error: true }
    ]);
  }

  private notifyMood(): void {
    this.setMood('notify', true);
    this.clearTimer(this.moodResetTimer);
    this.moodResetTimer = setTimeout(() => this.setMood(this.open() ? 'talk' : 'idle', true), 2500);
  }

  pushAssistant(text: string): void {
    this.messages.update((messages) => [...messages, { role: 'assistant', content: text, ts: new Date().toISOString() }]);
  }

  onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      this.send();
      event.preventDefault();
    }
  }

  pokeIdle(): void {
    this.idle$.next();
  }

  onDragStart(event: PointerEvent): void {
    if (event.button !== 0) return;

    event.stopPropagation();
    this.isDragging.set(true);
    this.dragMoved = false;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.dragOffset = this.fabPosition();
    document.body.style.userSelect = 'none';
    this.addDragListeners();
  }

  onDragMove(event: PointerEvent): void {
    if (!this.isDragging()) return;

    event.preventDefault();
    const deltaX = this.dragStart.x - event.clientX;
    const deltaY = this.dragStart.y - event.clientY;
    if (Math.hypot(deltaX, deltaY) > 4) this.dragMoved = true;

    const margin = 10;
    const fabSize = this.fabElement?.nativeElement.getBoundingClientRect().width ?? 94;
    const x = Math.max(margin, Math.min(window.innerWidth - fabSize - margin, this.dragOffset.x + deltaX));
    const y = Math.max(margin, Math.min(window.innerHeight - fabSize - margin, this.dragOffset.y + deltaY));
    this.fabPosition.set({ x, y });
  }

  onDragEnd(event: PointerEvent): void {
    if (!this.isDragging()) return;

    event.stopPropagation();
    this.isDragging.set(false);
    this.suppressNextClick = this.dragMoved;
    if (this.suppressNextClick) {
      this.clearTimer(this.dragClickResetTimer);
      this.dragClickResetTimer = setTimeout(() => {
        this.suppressNextClick = false;
      }, 350);
    }
    document.body.style.userSelect = '';
    this.removeDragListeners();
  }

  setMood(mood: AssistantExpression, force = false): void {
    if (!force) {
      if (this.isDragging()) return;
      if (this.open() && mood !== 'talk' && mood !== 'think' && mood !== 'notify') return;
    }
    if (this.mood() === mood) return;

    this.mood.set(mood);
    if (this.useCustomAnimation()) this.refreshCustomAnimation();
  }

  private refreshCustomAnimation(): void {
    if (!this.useCustomAnimation()) return;

    const mood = this.mood();
    const animationMood: AssistantMood = mood === 'frightened' ? 'notify' : mood === 'searching' ? 'think' : mood === 'working' ? 'speed' : mood;
    const path = typeof this._animationPath === 'string' ? this._animationPath : this._animationPath[animationMood];
    if (!path) return;

    const staticImage = IMAGE_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(extension));
    this.isStaticImage.set(staticImage);

    if (staticImage) {
      this.imagePath.set(path);
      return;
    }

    this.animationOptions.set({
      path,
      loop: true,
      autoplay: true
    });
  }

  private initializeAdvancedDetection(): void {
    if (this.enableInactivityDetection) this.resetInactivityTimer();

    if (this.enableTypingDetection) {
      document.addEventListener('keydown', this.boundHandleKeyPress);
    }

    if (this.enableSlowActionDetection) this.resetSlowActionTimer();

    if (this.enableCursorTracking) {
      document.addEventListener('pointermove', this.boundHandleCursorMove, { passive: true });
    }

    document.addEventListener('click', this.boundHandleClick, { capture: true, passive: true });
    this.activityEvents.forEach((eventName) => {
      document.addEventListener(eventName, this.boundHandleUserActivity, { passive: true });
    });
  }

  private addDragListeners(): void {
    if (this.dragListenersActive) return;

    document.addEventListener('pointermove', this.boundDragMove);
    document.addEventListener('pointerup', this.boundDragEnd);
    document.addEventListener('pointercancel', this.boundDragEnd);
    this.dragListenersActive = true;
  }

  private removeDragListeners(): void {
    if (!this.dragListenersActive) return;

    document.removeEventListener('pointermove', this.boundDragMove);
    document.removeEventListener('pointerup', this.boundDragEnd);
    document.removeEventListener('pointercancel', this.boundDragEnd);
    this.dragListenersActive = false;
  }

  private cleanupAdvancedDetection(): void {
    this.clearTimer(this.inactivityTimer);
    this.clearTimer(this.slowActionTimer);

    document.removeEventListener('keydown', this.boundHandleKeyPress);
    document.removeEventListener('pointermove', this.boundHandleCursorMove);
    document.removeEventListener('click', this.boundHandleClick, true);
    this.activityEvents.forEach((eventName) => {
      document.removeEventListener(eventName, this.boundHandleUserActivity);
    });
  }

  private resetInactivityTimer(): void {
    this.clearTimer(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => this.onUserInactive(), INACTIVITY_TIMEOUT);
  }

  private onUserInactive(): void {
    if (this.open()) return;
    this.showTransientMood('yawning', 5000);
  }

  private resetSlowActionTimer(): void {
    this.clearTimer(this.slowActionTimer);
    this.slowActionTimer = setTimeout(() => this.onUserSlow(), SLOW_ACTION_THRESHOLD);
  }

  private onUserSlow(): void {
    if (this.open() || this.isDragging()) return;

    const mood = this.nextSlowMood;
    this.nextSlowMood = mood === 'waiting' ? 'confused' : 'waiting';
    this.showTransientMood(mood, 3000);
  }

  private handleKeyPress(_event: KeyboardEvent): void {
    this.handleUserActivity();
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')) {
      this.isUserTyping = false;
      return;
    }

    this.isUserTyping = true;
    const rect = activeElement.getBoundingClientRect();
    this.updateEyeDirection({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });

    this.clearTimer(this.typingResetTimer);
    this.typingResetTimer = setTimeout(() => {
      this.isUserTyping = false;
      if (!this.open() && !this.isDragging() && LOOK_MOODS.has(this.mood())) {
        this.setMood('idle', true);
      }
    }, 1000);
  }

  private handleCursorMove(event: PointerEvent): void {
    if (this.isDragging()) return;
    this.lastPointerActivityAt = Date.now();
    this.updateEyeDirection({ x: event.clientX, y: event.clientY });
  }

  private updateEyeDirection(targetPosition: { x: number; y: number }): void {
    const fabRect = this.fabElement?.nativeElement.getBoundingClientRect();
    if (!fabRect) return;

    const deltaX = targetPosition.x - (fabRect.left + fabRect.width / 2);
    const deltaY = targetPosition.y - (fabRect.top + fabRect.height / 2);
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < 24) {
      this.eyeOffset.set({ x: 0, y: 0 });
      return;
    }

    const movement = Math.min(3.8, distance / 85);
    const nextOffset = {
      x: Math.round((deltaX / distance) * movement * 10) / 10,
      y: Math.round((deltaY / distance) * movement * 10) / 10
    };
    const currentOffset = this.eyeOffset();
    if (Math.abs(currentOffset.x - nextOffset.x) >= 0.2 || Math.abs(currentOffset.y - nextOffset.y) >= 0.2) {
      this.eyeOffset.set(nextOffset);
    }

    if (this.open() || EXPRESSION_MOODS.has(this.mood())) return;

    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    let direction: AssistantMood;
    if (angle >= -45 && angle < 45) {
      direction = 'look-right';
    } else if (angle >= 45 && angle < 135) {
      direction = 'look-down';
    } else if (angle >= 135 || angle < -135) {
      direction = 'look-left';
    } else {
      direction = 'look-up';
    }
    this.setMood(direction);
  }

  private handleUserActivity(): void {
    const now = Date.now();
    this.recentActivityTimes = this.recentActivityTimes.filter((activityTime) => now - activityTime <= RAPID_ACTION_WINDOW);
    this.recentActivityTimes.push(now);

    if (this.recentActivityTimes.length >= RAPID_ACTION_COUNT && !this.open() && !this.isDragging()) {
      this.recentActivityTimes = [];
      this.showTransientMood('speed', 1800);
    } else if (!this.open() && (LOOK_MOODS.has(this.mood()) || this.mood() === 'waiting' || this.mood() === 'confused' || this.mood() === 'yawning')) {
      this.setMood('idle', true);
    }

    if (now - this.lastTimerResetAt < 700) return;
    this.lastTimerResetAt = now;
    if (this.enableInactivityDetection) this.resetInactivityTimer();
    if (this.enableSlowActionDetection) this.resetSlowActionTimer();
  }

  private showTransientMood(mood: AssistantExpression, duration: number): void {
    if (this.open()) return;

    this.clearTimer(this.moodResetTimer);
    this.setMood(mood, true);
    this.moodResetTimer = setTimeout(() => {
      if (!this.open() && !this.isUserTyping) this.setMood('idle', true);
    }, duration);
  }

  private handleDeleteIntent(event: MouseEvent): void {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) return;

    const action = eventTarget.closest<HTMLElement>(DELETE_ACTION_SELECTOR);
    if (!action || action.matches(':disabled') || action.getAttribute('aria-disabled') === 'true') return;

    const descriptor = [action.getAttribute('aria-label'), action.getAttribute('title'), action.getAttribute('data-builder-action'), action.className, action.textContent].filter(Boolean).join(' ');
    const isDeleteIntent = DELETE_INTENT_PATTERN.test(descriptor) || action.matches(DELETE_ICON_SELECTOR) || action.querySelector(DELETE_ICON_SELECTOR) !== null;
    if (!isDeleteIntent) return;

    this.clearTimer(this.moodResetTimer);
    this.setMood('frightened', true);
    this.moodResetTimer = setTimeout(() => {
      const nextMood: AssistantExpression = this.thinking() ? 'think' : this.open() ? 'talk' : 'idle';
      this.setMood(nextMood, true);
    }, 2200);
  }

  private scheduleAmbientEyeMotion(): void {
    this.ambientEyeTimer = setTimeout(() => {
      const canMove = !this.open() && !this.isDragging() && Date.now() - this.lastPointerActivityAt > 1800 && !EXPRESSION_MOODS.has(this.mood());

      if (canMove) {
        this.ambientEyeIndex = (this.ambientEyeIndex + 1) % this.ambientEyePositions.length;
        this.eyeOffset.set(this.ambientEyePositions[this.ambientEyeIndex]);
        if (LOOK_MOODS.has(this.mood())) this.setMood('idle', true);
      }
      this.scheduleAmbientEyeMotion();
    }, 2600);
  }

  private throttle<TArguments extends unknown[]>(callback: (...args: TArguments) => void, limit: number): (...args: TArguments) => void {
    let lastRun = Number.NEGATIVE_INFINITY;
    return (...args: TArguments): void => {
      const now = Date.now();
      if (now - lastRun < limit) return;
      lastRun = now;
      callback(...args);
    };
  }

  private clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
    if (timer !== null) clearTimeout(timer);
  }
}
// ]]]FI
