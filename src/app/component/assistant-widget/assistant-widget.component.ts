import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { AssistantWidgetService, AssistantMessage, AssistantResponse } from '../services/assistant-widget.service'; //
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type AssistantMood = 'idle' | 'talk' | 'think' | 'notify' | 'speed';


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
   */
  @Input() animationPath: string | Record<AssistantMood, string> = {
    idle: '/assets/assistant/assistant_idle.json',
    talk: '/assets/assistant/assistant_talk.json',
    think: '/assets/assistant/assistant_think.json',
    notify: '/assets/assistant/assistant_notify.json',
    speed: '/assets/assistant/assistant_speed.json',
  };

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
  options: AnimationOptions = { path: typeof this.animationPath === 'string' ? this.animationPath : this.animationPath[this.mood], loop: true, autoplay: true };

  private destroy$ = new Subject<void>();
  private idle$ = new Subject<void>();

  constructor(private svc: AssistantWidgetService) { }

  ngOnInit(): void {
    // Inicializa opciones con el JSON local correspondiente
    this.refreshOptions();

    // Tip de bienvenida tras 2.5s de inactividad
    this.idle$.pipe(debounceTime(2500), takeUntil(this.destroy$)).subscribe(() => {
      if (!this.open && this.welcomeTips?.length) {
        const tip = this.welcomeTips[Math.floor(Math.random() * this.welcomeTips.length)];
        this.pushAssistant(tip);
        setTimeout(() => this.messages.pop(), 5000);
      }
    });
    this.pokeIdle();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Cambia el estado de ánimo y actualiza la animación local */
  setMood(mood: AssistantMood) {
    this.mood = mood;
    this.refreshOptions();
  }

  private refreshOptions() {
    this.options = {
      path: typeof this.animationPath === 'string' ? this.animationPath : this.animationPath[this.mood],
      loop: true,
      autoplay: true
    };
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
}

