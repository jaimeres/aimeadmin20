import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-custom-local-settings',
  imports: [DialogModule, ReactiveFormsModule, FormsModule, CommonModule, SelectModule, MultiSelectModule, ButtonModule, CardModule],
  templateUrl: './custom-local-settings.component.html',
  styleUrl: './custom-local-settings.component.scss',
  standalone: true
})
export class CustomLocalSettingsComponent implements OnChanges {

  @Input() visible: boolean = false;
  @Output() visibleAction = new EventEmitter<boolean>();
  @Input() field: any = {};
  @Output() saveAction = new EventEmitter<void>();
  @Input() formGroup: FormGroup | undefined;


  public visibleSignal = signal<boolean>(false);
  public fieldSignal = signal<any>(null);
  public formGroupSignal = signal<FormGroup | undefined>(undefined);

  ngOnChanges(changes: SimpleChanges) {

    if (changes['visible']) {
      this.visibleSignal.set(changes['visible'].currentValue);
    }

    if (changes['field']) {
      this.fieldSignal.set(changes['field'].currentValue);
    }

    if (changes['formGroup']) {
      this.formGroupSignal.set(changes['formGroup'].currentValue);
    }
  }


  cols(): any[] {
    // Implementa la lógica para obtener las columnas según sea necesario
    return [];
  }

  onHide(e: any) {
    this.visibleAction.emit(false);
  }





  formasPago = [
    { label: 'Efectivo', value: '01' },
    { label: 'Cheque', value: '02' },
    { label: 'Transferencia', value: '03' },
    { label: 'Por definir', value: '99' }
  ];
  monedas = [
    { label: 'MXN', value: 'MXN' },
    { label: 'USD', value: 'USD' }
  ];

  tipoComprobante = [
    { label: 'Ingreso', value: 'I' },
    { label: 'Egreso', value: 'E' },
    { label: 'Traslado', value: 'T' }
  ]

  metodoPago = [
    { label: 'Pago en una sola exhibición', value: 'PUE' },
    { label: 'Pago en parcialidades', value: 'PPD' }
  ];

  usoDelCFDI = [
    { label: 'Gastos en general', value: 'G01' },
    { label: 'Adquisición de mercancías', value: 'G02' },
    { label: 'Servicios generales', value: 'G03' },
    { label: 'Por definir', value: 'G99' }
  ]


}
