import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: string; // ISO datetime
  error?: boolean;
}

/**
 * Contrato del canal jukai (agente BOS, Paso 8). El servidor responde EXACTAMENTE
 * una de tres formas:
 *   { respuesta, session_id }               -> éxito
 *   { bloqueado: true, motivo, session_id } -> asistente deshabilitado (empresa/usuario/canal)
 *   { error }                               -> petición inválida o fallo del servidor
 */
export interface AssistantResponse {
  respuesta?: string;
  bloqueado?: boolean;
  motivo?: string;
  error?: string;
  session_id?: string;
}

export interface AssistantChatOptions {
  sessionId?: string;
  cliente?: 'web' | 'desktop' | 'mobile';
  timeZone?: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantWidgetService {
  constructor(private http: HttpClient) { }

  /**
   * Envía el último mensaje del usuario al agente. El JWT lo agrega el
   * `TokenAccessInterceptor` (encabezado `Authorization`); aquí sólo viajan el
   * texto y el contexto mínimo de la sesión.
   */
  chat(apiUrl: string, message: string, opts: AssistantChatOptions = {}): Observable<AssistantResponse> {
    const body: Record<string, unknown> = { message };
    if (opts.sessionId) body['session_id'] = opts.sessionId;
    if (opts.cliente) body['cliente'] = opts.cliente;
    if (opts.timeZone) body['time_zone'] = opts.timeZone;

    // JSON plano: el agente no habla JSON:API. Se fija explícitamente para que el
    // interceptor no imponga `application/vnd.api+json`.
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<AssistantResponse>(apiUrl, body, { headers });
  }
}
