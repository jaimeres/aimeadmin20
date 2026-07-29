import { ComponentFixture, TestBed } from '@angular/core/testing';
// [[[II ESC:031-03 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-03
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
// ]]]FI

import { AssetComponent } from './asset.component';

describe('AssetComponent', () => {
  let component: AssetComponent;
  let fixture: ComponentFixture<AssetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetComponent],
      // [[[II ESC:031-03 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-03
      // AssetService -> ConfigService inyecta HttpClient y CRUD usa el router;
      // sin estos providers el TestBed no puede crear el componente.
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      // ]]]FI
    })
      .compileComponents();

    fixture = TestBed.createComponent(AssetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
