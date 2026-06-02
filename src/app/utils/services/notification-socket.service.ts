// [[[II ESC:004-01 DOC:docs/documents/2026-05-30_004_sistema-avisos-socket.md#escenario-01
import { inject, Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { resolveNativeLocalUrl } from '../native-local-url.util';
import { MessageService } from '../../components/services/message.service';

/**
 * Estructura de un aviso/alerta recibido o enviado por el socket.
 */
export interface SocketNotice {
  /** Tipo o categoría del aviso (ej: 'login', 'alerta', 'info'). */
  type?: string;
  /** Título corto del aviso. */
  title?: string;
  /** Mensaje a mostrar al usuario. */
  message?: string;
  /** Gravedad para el toast: 'success' | 'info' | 'warn' | 'error'. */
  severity?: 'success' | 'info' | 'warn' | 'error';
  /** Datos adicionales libres. */
  data?: any;
  /** Marca de tiempo del aviso. */
  timestamp?: string;
}

/**
 * Servicio de avisos/alertas en tiempo real mediante Socket.IO.
 *
 * ⚠️ IMPORTANTE: el servidor AÚN NO implementa este socket. Todo el cliente
 * queda preparado localmente: conexión, autenticación por token, escucha de
 * eventos entrantes y emisión de avisos. Cuando el backend exista, basta con
 * apuntar `environment.socket_url` al servidor real.
 *
 * Eventos esperados del servidor (a definir en backend):
 *  - 'notice'  → recibe un {@link SocketNotice} y lo muestra como toast.
 *  - 'alert'   → alias de 'notice' para alertas críticas.
 *
 * Eventos que emite el cliente:
 *  - 'login_notice' → al iniciar sesión (ver {@link emitLoginNotice}).
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationSocketService {

  private messageS = inject(MessageService);

  /** Instancia activa del socket (null cuando está desconectado). */
  private socket: Socket | null = null;

  /** Estado reactivo de la conexión del socket. */
  private readonly _connected = signal<boolean>(false);
  readonly connected = this._connected.asReadonly();

  /**
   * Establece la conexión con el servidor de avisos.
   *
   * No falla el flujo de la app si el servidor no existe todavía: los errores
   * de conexión se registran en consola pero no se propagan.
   *
   * @param token Token de acceso JWT para autenticar el socket.
   */
  connect(token?: string): void {
    // Si no hay URL configurada o ya estamos conectados, no hacemos nada.
    // [[[II ESC:006-01 DOC:docs/documents/2026-06-01_006_android-http-local-debug.md#escenario-01
    const url = resolveNativeLocalUrl((environment as any).socket_url);
    // ]]]FI
    if (!url || this.socket?.connected) {
      return;
    }

    try {
      this.socket = io(url, {
        // Reintenta automáticamente; útil cuando el backend aún no responde.
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        transports: ['websocket'],
        // El backend deberá leer el token para autenticar la sesión del socket.
        auth: token ? { token } : undefined,
      });

      this.registerCoreListeners();
    } catch (error) {
      console.warn('[NotificationSocket] No fue posible iniciar el socket:', error);
    }
  }

  /**
   * Registra los listeners base de conexión y de avisos entrantes.
   */
  private registerCoreListeners(): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('connect', () => {
      this._connected.set(true);
      console.log('[NotificationSocket] Conectado:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: string) => {
      this._connected.set(false);
      console.log('[NotificationSocket] Desconectado:', reason);
    });

    this.socket.on('connect_error', (error: any) => {
      // El servidor aún no existe: solo informamos, no rompemos la app.
      console.warn('[NotificationSocket] Error de conexión:', error?.message ?? error);
    });

    // Avisos/alertas entrantes desde el servidor.
    this.socket.on('notice', (payload: SocketNotice) => this.handleIncomingNotice(payload));
    this.socket.on('alert', (payload: SocketNotice) => this.handleIncomingNotice(payload));
  }

  /**
   * Muestra un aviso entrante como toast usando el sistema de mensajes global.
   */
  private handleIncomingNotice(payload: SocketNotice): void {
    if (!payload) {
      return;
    }
    this.messageS.changeMessage(
      payload.message ?? 'Tienes un nuevo aviso',
      null,
      {},
      payload.severity ?? 'info',
      payload.title ?? 'Aviso',
    );
  }

  /**
   * Emite un aviso genérico hacia el servidor.
   *
   * Si el socket no está conectado, el aviso se descarta silenciosamente
   * (el servidor aún no está implementado).
   *
   * @param event Nombre del evento del servidor.
   * @param notice Contenido del aviso.
   */
  emitNotice(event: string, notice: SocketNotice): void {
    if (!this.socket?.connected) {
      console.log(`[NotificationSocket] (pendiente) emitiría '${event}':`, notice);
      return;
    }
    this.socket.emit(event, notice);
  }

  /**
   * Emite el aviso de inicio de sesión hacia el servidor.
   *
   * Se invoca desde AuthService justo después de un login exitoso.
   *
   * @param user Usuario que inició sesión (id, username, etc.).
   */
  emitLoginNotice(user: any): void {
    const notice: SocketNotice = {
      type: 'login',
      title: 'Inicio de sesión',
      message: `El usuario ${user?.username ?? user?.id ?? ''} inició sesión`.trim(),
      severity: 'info',
      data: {
        userId: user?.id ?? null,
        username: user?.username ?? null,
      },
      timestamp: new Date().toISOString(),
    };
    this.emitNotice('login_notice', notice);
  }

  /**
   * Cierra la conexión del socket y limpia el estado.
   * Llamar al cerrar sesión.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this._connected.set(false);
  }
}
// ]]]FI
