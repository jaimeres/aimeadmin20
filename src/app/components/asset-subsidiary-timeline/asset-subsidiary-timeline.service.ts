import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GeneralService } from 'src/app/utils/services/general.service';

/**
 * Servicio mínimo y aislado para el endpoint /v1/assets/asset-subsidiary/.
 *
 * Se evita usar la instancia singleton de CRUDService porque ésta muta estado
 * compartido (`type`, `app`, `relationships`). Aquí mantenemos llamadas puras.
 *
 * [[[II ESC:002-01 DOC:docs/documents/2026-05-19_002_ui_timeline_asset_subsidiary.md#escenario-01
 */
@Injectable({ providedIn: 'root' })
export class AssetSubsidiaryTimelineService {

  private http = inject(HttpClient);
  private generalS = inject(GeneralService);
  private base = `${environment.base_url}/assets/asset-subsidiary/`;
  private subsidiariesUrl = `${environment.base_url}/companies/subsidiary/`;

  /** Lista de asignaciones del activo en el rango. */
  list(params: {
    assetId: string;
    startGte?: string; // ISO inclusive
    endLte?: string;   // ISO
  }): Observable<any> {
    const qs: string[] = [];
    qs.push(`filter[asset]=${encodeURIComponent(params.assetId)}`);
    if (params.startGte) qs.push(`filter[end_date.gte]=${encodeURIComponent(params.startGte)}`);
    if (params.endLte) qs.push(`filter[start_date.lte]=${encodeURIComponent(params.endLte)}`);
    qs.push('include=asset,subsidiary');
    qs.push('page[size]=500');
    return this.http.get(`${this.base}?${qs.join('&')}`);
  }

  /** Sucursales para el dropdown. */
  subsidiaries(): Observable<any> {
    return this.http.get(`${this.subsidiariesUrl}?page[size]=500&sort=name`);
  }

  create(attrs: { start_date: string; end_date: string | null; percentage: string; is_default: boolean; },
    assetId: string, subsidiaryId: string): Observable<any> {
    const body = this.generalS.baseDJA({
      attributes: { ...attrs } as any,
      type: 'asset-subsidiary',
      relationships: [
        { field: 'asset', id: assetId, type: 'asset' },
        { field: 'subsidiary', id: subsidiaryId, type: 'subsidiary' },
      ],
    });
    return this.http.post(this.base, body);
  }

  patch(id: string, attrs: Partial<{ start_date: string; end_date: string | null; percentage: string; is_default: boolean; }>,
    relationships?: Array<{ field: string; id: string; type: string }>): Observable<any> {
    const body = this.generalS.baseDJA({
      attributes: { ...attrs } as any,
      type: 'asset-subsidiary',
      relationships: relationships || [],
      id,
    });
    return this.http.patch(`${this.base}${id}/`, body);
  }

  remove(id: string): Observable<any> {
    return this.http.delete(`${this.base}${id}/`);
  }
}
// ]]]FI
