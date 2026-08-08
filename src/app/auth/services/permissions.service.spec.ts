import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PermissionsService } from './permissions.service';
import { environment } from '../../../environments/environment';

// [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01
describe('PermissionsService', () => {
  let service: PermissionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PermissionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('publishes refresh only after strings and tree complete', () => {
    let result: any;
    service.refresh().subscribe((value) => result = value);

    http.expectOne(`${environment.base_url}/permissions/me/strings/`).flush({
      data: { attributes: { strings: { permissions2: '01' } } },
    });
    expect(result).toBeUndefined();

    http.expectOne(`${environment.base_url}/permissions/me/tree/`).flush({
      data: {
        attributes: {
          user: 'user-1',
          assets: {
            maintenance: {
              list: { value: true, label: 'Ver mantenimientos', field_permissions: 'permissions2', position: 47 },
            },
          },
        },
      },
    });

    expect(result.tree.assets.maintenance.list.label).toBe('Ver mantenimientos');
    expect(service.hasTreeData()).toBeTrue();
  });

  it('does not send a permission path absent from the declared tree', () => {
    const declared: any = {
      assets: {
        maintenance: {
          update: { value: true, label: 'Modificar mantenimiento', field_permissions: 'permissions2', position: 49 },
        },
      },
    };
    const candidate = structuredClone(declared);
    candidate.assets.maintenance['update.injected'] = {
      value: true, label: 'Inyectado', field_permissions: 'assets_per', position: 99,
    };

    service.saveForUser('user-1', candidate, declared).subscribe();
    const request = http.expectOne(`${environment.base_url}/permissions/user-1/tree/`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.data.attributes.assets.maintenance['update.injected']).toBeUndefined();
    request.flush({ data: { attributes: declared } });
  });
});
// ]]]FI
