import { Component, inject } from '@angular/core';
import { MessageModule } from 'primeng/message';

import { NetworkStatusService } from '../../utils/services/network-status.service';

// [[[II ESC:027-10 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-10 ESC:027-11 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-11
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [MessageModule],
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent {
  private readonly networkStatus = inject(NetworkStatusService);
  readonly connected = this.networkStatus.connected;
  readonly internetAvailable = this.networkStatus.internetAvailable;
}
// ]]]FI
