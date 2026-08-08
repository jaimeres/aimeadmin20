import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { PermissionCatalogService } from './permission-catalog.service';

// [[[II ESC:037-02 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-02
describe('PermissionCatalogService', () => {
  it('loads the catalog from the user permission URL', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(PermissionCatalogService);
    const http = TestBed.inject(HttpTestingController);
    let received: any;

    service.loadForUser('user-1').subscribe((catalog) => received = catalog);
    const request = http.expectOne(`${environment.base_url}/permissions/user-1/catalog/`);
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        type: 'permission-catalog', id: 'user-1',
        attributes: {
          permissions: {}, forms: {}, consumers_by_permission: {},
          configuration_context: { resolved_levels: [], resource_sources: {}, contextual_subsidiaries: 0, warning: '' },
        },
      },
    });

    expect(received.userId).toBe('user-1');
    http.verify();
  });
});
// ]]]FI
