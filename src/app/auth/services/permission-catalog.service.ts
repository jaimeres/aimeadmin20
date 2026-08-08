import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PermissionCatalog, parsePermissionCatalogResponse } from '../schemas/permission-catalog.schema';

// [[[II ESC:037-02 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-02
@Injectable({ providedIn: 'root' })
export class PermissionCatalogService {
  private readonly http = inject(HttpClient);

  loadForUser(userId: string): Observable<PermissionCatalog> {
    return this.http.get<unknown>(`${environment.base_url}/permissions/${userId}/catalog/`).pipe(
      map(parsePermissionCatalogResponse),
    );
  }
}
// ]]]FI
