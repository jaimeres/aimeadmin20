import { Component, inject, Input, signal, SimpleChanges } from '@angular/core';
import { AuditService } from '../services/audit.service';
import { MessageService } from '../services/message.service';
import { GeneralService } from '../../utils/services/general.service';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-custom-audit',
  imports: [TableModule],
  templateUrl: './custom-audit.component.html',
  styleUrl: './custom-audit.component.scss',
  standalone: true,

})
export class CustomAuditComponent {

  private crudS = inject(AuditService);
  private messageS = inject(MessageService);
  private generalS = inject(GeneralService);

  @Input() cf: any = {};//custom fields
  @Input() selected: any = {};

  public items = signal<any[]>([]);

  public selectedSignal = signal<any[]>([]);
  // cfSignal era un array y el template accede a propiedades (created_by, utc_inactivated_at, etc.)
  // Al ser array el checker marcaba error: propiedad no existe en tipo any[]. Se cambia a objeto.
  public cfSignal = signal<any>({});
  ngOnChanges(changes: SimpleChanges) {
    if (changes['selected']) {
      this.selectedSignal.set(changes['selected'].currentValue);
    }
    if (changes['cf']) {
      this.cfSignal.set(changes['cf'].currentValue);
    }
  }

  getAll() {
    this.messageS.showBlocked(true);
    const filter = `filter[item_id]=${this.selected[0].id}`;
    const app = 'logs/log';
    const type = 'log';
    this.crudS.getObject({ filter, app, type }).subscribe({
      next: (resp: any) => {
        this.messageS.showBlocked(false);
        if (resp?.data.length == 0) {
          this.messageS.changeMessage('No hay datos para mostrar.', null, [], 'info');
        }

        this.items.set(this.generalS.DJAtoObject({
          respDJA: resp,
          additionalFieldsIncluded: [],
          customField: [],
          fieldsBool: [],
          moreFields: [],
          timeZone: [],
          node: false
        }));
      },
      error: (err: any) => {
        this.messageS.showBlocked(false);
        this.messageS.changeMessage(`Hay un error al cargar .`, err,);
      }
    });

  }

}
