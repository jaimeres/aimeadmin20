import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { NetworkStatusService } from '../../utils/services/network-status.service';
import { OfflineBannerComponent } from './offline-banner.component';

// [[[II ESC:027-10 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-10 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11
describe('OfflineBannerComponent', () => {
  let component: OfflineBannerComponent;
  let fixture: ComponentFixture<OfflineBannerComponent>;
  const connected = signal(true);
  const internetAvailable = signal(true);

  beforeEach(async () => {
    connected.set(true);
    internetAvailable.set(true);
    await TestBed.configureTestingModule({
      imports: [OfflineBannerComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: NetworkStatusService,
          useValue: {
            connected: connected.asReadonly(),
            internetAvailable: internetAvailable.asReadonly(),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfflineBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('permanece visible y sin cierre mientras el equipo está desconectado', () => {
    connected.set(false);
    internetAvailable.set(false);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Sin conexión a Internet');
    expect(element.textContent).toContain('Wi-Fi o los datos móviles');
    expect(element.querySelector('.p-message-close-button')).toBeNull();
  });

  it('se oculta automáticamente al recuperar la conexión', () => {
    connected.set(false);
    internetAvailable.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-message')).not.toBeNull();

    connected.set(true);
    internetAvailable.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-message')).toBeNull();
  });

  it('avisa cuando existe una red activa pero la aplicación no puede usar Internet', () => {
    connected.set(true);
    internetAvailable.set(false);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Sin conexión a Internet');
    expect(element.textContent).toContain('restricciones de red de la aplicación');
    expect(element.querySelector('.p-message-close-button')).toBeNull();
  });
});
// ]]]FI
