import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: string; // ISO datetime
  error?: boolean;
}

export interface AssistantResponse {
  messages: AssistantMessage[]; // respuestas (pueden venir varias)
  sessionId?: string;           // opcional: para mantener contexto en servidor
}

@Injectable({ providedIn: 'root' })
export class AssistantWidgetService {
  constructor(private http: HttpClient) { }

  chat(apiUrl: string, history: AssistantMessage[], context?: Record<string, any>): Observable<AssistantResponse> {
    return this.http.post<AssistantResponse>(apiUrl, { history, context });
  }
}