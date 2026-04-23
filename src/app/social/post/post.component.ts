import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, HostListener, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AppTopbar } from '../../layout/components/app.topbar';
import { CRUD } from '../../utils/crud.class';
import { SocialService } from '../services/social.service';

type FeedFilter = 'all' | 'following' | 'teams';

interface HistoriaSocial {
  name: string;
  role: string;
  status: string;
  severity: 'success' | 'info' | 'warn';
}

interface TendenciaSocial {
  label: string;
  mentions: string;
  severity: 'success' | 'info' | 'warn';
}

interface PublicacionSocial {
  id: number;
  author: string;
  role: string;
  time: string;
  audience: Exclude<FeedFilter, 'all'>;
  title: string;
  body: string;
  tags: string[];
  imageLabel: string;
  accent: string;
  likes: number;
  comments: number;
  shares: number;
}

interface BloquePublicidad {
  title: string;
  subtitle: string;
  copy: string;
  cta: string;
}

interface AjusteRapido {
  label: string;
  description: string;
  state: string;
}

interface Celebracion {
  name: string;
  role: string;
  date: string;
}

interface RutaSistema {
  url: string;
  name: string;
}

function hasStorage(): boolean {
  return typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
}

function normalizeInternalUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const url = value.trim();
  if (!url.startsWith('/') || url.startsWith('/auth') || url.startsWith('/social')) {
    return null;
  }

  return url;
}

function resolveSystemRouteFromStorage(): RutaSistema {
  if (!hasStorage()) {
    return { url: '/', name: 'Inicio' };
  }

  try {
    const history = JSON.parse(globalThis.localStorage.getItem('lastVisited') || '[]');
    const historyMatch = Array.isArray(history)
      ? history.find((entry: any) => normalizeInternalUrl(entry?.url))
      : null;

    const historyUrl = normalizeInternalUrl(historyMatch?.url);
    if (historyUrl) {
      return {
        url: historyUrl,
        name: typeof historyMatch?.name === 'string' && historyMatch.name.trim() ? historyMatch.name.trim() : 'Sistema'
      };
    }

    const lastModuleUrl = normalizeInternalUrl(globalThis.localStorage.getItem('lastModuleUrl'));
    if (lastModuleUrl) {
      return { url: lastModuleUrl, name: 'Sistema' };
    }
  } catch (_) {
    return { url: '/', name: 'Inicio' };
  }

  return { url: '/', name: 'Inicio' };
}

@Component({
  selector: 'app-post',
  imports: [
    CommonModule,
    FormsModule,
    AppTopbar,
    AvatarModule,
    ButtonModule,
    CardModule,
    ChipModule,
    DividerModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: './post.component.html',
  styleUrl: './post.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class PostComponent extends CRUD implements OnInit {

  @ViewChild('composer') composerRef?: ElementRef<HTMLTextAreaElement>;

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Nueva publicación',
    icon: 'pi pi-pen-to-square',
    command: () => this.focusComposer()
  }]);

  public override getMenu = signal<MenuItem[]>([
    {
      id: 'all',
      label: 'Inicio',
      command: () => this.setFilter('all')
    },
    {
      id: 'following',
      label: 'Siguiendo',
      command: () => this.setFilter('following')
    },
    {
      id: 'teams',
      label: 'Equipos',
      command: () => this.setFilter('teams')
    }
  ]);

  readonly draft = signal('');
  readonly activeFilter = signal<FeedFilter>('all');
  readonly viewportWidth = signal(1200);
  readonly isMobileViewport = signal(false);
  readonly returnRoute = signal<RutaSistema>({ url: '/', name: 'Inicio' });
  readonly heroChips = ['Avisos del día', 'Colaboración entre áreas', 'Comunidad interna'];
  readonly stories: HistoriaSocial[] = [
    { name: 'Andrea', role: 'Coordinación de campo', status: 'En ruta', severity: 'success' },
    { name: 'Marco', role: 'Mesa de compras', status: 'Cerrando precios', severity: 'info' },
    { name: 'Lucía', role: 'Capital humano', status: 'Entrevistas activas', severity: 'warn' },
  ];
  readonly trends: TendenciaSocial[] = [
    { label: 'mantenimiento-prioritario', mentions: '28 conversaciones', severity: 'success' },
    { label: 'foro-proveedores', mentions: '14 conversaciones', severity: 'info' },
    { label: 'alertas-asistencia', mentions: '9 conversaciones', severity: 'warn' },
  ];
  readonly adsLeft: BloquePublicidad[] = [
    {
      title: 'Publicidad',
      subtitle: 'Refacciones certificadas',
      copy: 'Paquetes para mantenimiento preventivo con entrega inmediata en sedes prioritarias.',
      cta: 'Ver catálogo'
    },
    {
      title: 'Publicidad',
      subtitle: 'Capacitación express',
      copy: 'Talleres internos para jefaturas y cuadrillas con material actualizado.',
      cta: 'Solicitar cupo'
    }
  ];
  readonly adsRight: BloquePublicidad[] = [
    {
      title: 'Publicidad',
      subtitle: 'Marketplace corporativo',
      copy: 'Publica promociones internas y destaca productos con mayor rotación.',
      cta: 'Ir al marketplace'
    },
    {
      title: 'Publicidad',
      subtitle: 'Programa de bienestar',
      copy: 'Difunde campañas internas, reconocimientos y actividades para equipos.',
      cta: 'Conocer más'
    }
  ];
  readonly settings: AjusteRapido[] = [
    {
      label: 'Visibilidad del perfil',
      description: 'Solo colaboradores del ecosistema interno pueden ver tu actividad.',
      state: 'Equipo'
    },
    {
      label: 'Notificaciones',
      description: 'Alertas para menciones, respuestas y publicaciones del área.',
      state: 'Activas'
    },
    {
      label: 'Resumen diario',
      description: 'Concentrado automático con publicaciones clave al finalizar la jornada.',
      state: '18:00 h'
    }
  ];
  readonly birthdays: Celebracion[] = [
    { name: 'María López', role: 'Capital humano', date: 'Hoy' },
    { name: 'Carlos Reyes', role: 'Mantenimiento', date: 'Mañana' },
    { name: 'Ana Torres', role: 'Compras', date: 'En 3 días' },
  ];
  readonly promotions: Celebracion[] = [
    { name: 'Jorge Medina', role: 'Coordinador de operaciones', date: 'Nuevo cargo' },
    { name: 'Lucía Paredes', role: 'Líder de compras', date: 'Ascenso' },
  ];
  readonly posts = signal<PublicacionSocial[]>([
    {
      id: 1,
      author: 'Daniela Ruiz',
      role: 'Líder de operaciones',
      time: 'Hace 12 min',
      audience: 'teams',
      title: 'El tablero nocturno ya concentra despachos, diésel y urgencias',
      body: 'Unificamos la visibilidad del turno nocturno para que almacenes, mantenimiento y consumo de combustible compartan el mismo pulso operativo.',
      tags: ['Despacho', 'Almacenes', 'Turno nocturno'],
      imageLabel: 'Centro de control en tiempo real',
      accent: '#0ea5e9',
      likes: 34,
      comments: 8,
      shares: 4,
    },
    {
      id: 2,
      author: 'Sofia Campos',
      role: 'Experiencia del colaborador',
      time: 'Hace 38 min',
      audience: 'following',
      title: 'Las entrevistas de reclutamiento ya se agrupan por región',
      body: 'Capital humano reorganizó las vacantes por plaza y familia de puesto para acelerar las decisiones con los líderes de cada sede.',
      tags: ['Reclutamiento', 'Planeación regional', 'RRHH'],
      imageLabel: 'Embudo regional de entrevistas',
      accent: '#10b981',
      likes: 21,
      comments: 5,
      shares: 2,
    },
    {
      id: 3,
      author: 'Luis Mendoza',
      role: 'Analista de compras',
      time: 'Hace 1 h',
      audience: 'teams',
      title: 'La lista de subastas críticas ya se sigue desde el feed',
      body: 'Compras ahora marca tiempos de entrega tensos, huecos de precio y riesgos de proveedor sin salir de la red social interna.',
      tags: ['Subastas', 'Precios', 'Riesgo'],
      imageLabel: 'Matriz comparativa de ofertas',
      accent: '#f59e0b',
      likes: 17,
      comments: 3,
      shares: 1,
    },
  ]);
  readonly visiblePosts = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') {
      return this.posts();
    }

    return this.posts().filter(post => post.audience === filter);
  });
  readonly showAdvertisingPanel = computed(() => !this.isMobileViewport());
  readonly showSecondaryPanel = computed(() => !this.isMobileViewport() && this.viewportWidth() >= 1200);
  readonly shellClasses = computed(() => ({
    'social-shell--ads': this.showAdvertisingPanel(),
    'social-shell--full': this.showSecondaryPanel(),
  }));
  readonly returnButtonLabel = computed(() => {
    const route = this.returnRoute();
    return route.name && route.name !== 'Inicio' ? `Regresar a ${route.name}` : 'Regresar al sistema';
  });

  constructor(crudS: SocialService) {
    const systemRoute = resolveSystemRouteFromStorage();
    super(crudS, 'social-post');
    this.returnRoute.set(systemRoute);
    this.syncViewportState();
  }

  ngOnInit(): void {
    this.typeDefault = 'social-post';
    this.app[this.typeDefault] = 'social/post';
    this.module[this.typeDefault] = 'SO';
    this.moreOptions.set([]);
    this.syncViewportState();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportState();
  }

  setFilter(filter: FeedFilter): void {
    this.activeFilter.set(filter);
  }

  goBackToSystem(): void {
    const target = this.returnRoute().url || '/';
    this.router.navigateByUrl(target).catch(() => this.router.navigateByUrl('/'));
  }

  focusComposer(): void {
    queueMicrotask(() => this.composerRef?.nativeElement.focus());
  }

  runMenuCommand(item: MenuItem): void {
    item.command?.({ item } as any);
  }

  private syncViewportState(): void {
    const width = typeof globalThis !== 'undefined' && typeof globalThis.innerWidth === 'number'
      ? globalThis.innerWidth
      : 1200;

    this.viewportWidth.set(width);

    try {
      this.isMobileViewport.set(this.generalS.isMobileScreen());
    } catch (_) {
      this.isMobileViewport.set(width <= 991);
    }
  }

  publishPost(): void {
    const message = this.draft().trim();
    if (!message) {
      return;
    }

    this.posts.update(current => [{
      id: Date.now(),
      author: this.crudS.authS.user()?.name || 'Tu usuario',
      role: 'Comunidad interna',
      time: 'Ahora mismo',
      audience: 'following',
      title: 'Nueva publicación del equipo',
      body: message,
      tags: ['Social', 'Actualización'],
      imageLabel: 'Nueva tarjeta de conversación',
      accent: '#f43f5e',
      likes: 0,
      comments: 0,
      shares: 0,
    }, ...current]);

    this.draft.set('');
  }

  trackByPost(_: number, post: PublicacionSocial): number {
    return post.id;
  }

}
