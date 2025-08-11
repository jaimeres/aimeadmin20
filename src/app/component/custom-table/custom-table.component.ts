import { CommonModule, KeyValue } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { ContextMenuModule } from 'primeng/contextmenu';
import { ConfigService } from '../../auth/services/config.service';



@Component({
  selector: 'app-custom-table',
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, MultiSelectModule, ToggleButtonModule, SelectModule, DialogModule, TableModule,
    ContextMenuModule, InputIconModule, IconFieldModule
  ],
  templateUrl: './custom-table.component.html',
  styleUrl: './custom-table.component.scss',
  standalone: true
})
export class CustomTableComponent implements OnChanges {

  optionsExport = signal<any[]>([{ id: 'excel', name: 'Excel' }, { id: 'pdf', name: 'PDF' }, { id: 'csv', name: 'CSV' }]);
  form = signal<FormGroup | null>(null);
  protected fb: FormBuilder = inject(FormBuilder);
  protected configS: ConfigService = inject(ConfigService);
  items!: MenuItem[];

  //https://www.npmjs.com/package/ngx-export-as

  // exportar
  @Output() exportDialogVisibleAction = new EventEmitter<boolean>();
  @Input() field: any = {};
  @Input() exportDialogVisible = false;

  //casi nica van a cambiar
  @Input() rows: number = 250;
  @Input() scrollable: boolean = true;
  @Input() showCurrentPageReport: boolean = true;
  @Input() paginator: boolean = true;
  @Input() totalRecords: number = 0;
  @Input() filterDelayTable: number = 300;
  @Input() minWidth: string = '75rem';
  @Input() value: any[] = [];
  @Input() columns: any[] = []; // trae las columnas seleccionadas
  @Input() selected: any[] = [];

  @Output() exportServerAction = new EventEmitter<void>();
  @Output() rowDoubleClick: EventEmitter<any> = new EventEmitter<any>();
  @Output() exportAction = new EventEmitter<any>();
  @Output() selectionAction = new EventEmitter<any[]>();
  @Output() lazyLoadAction = new EventEmitter<any>();

  //esportar datos
  exportDialogVisibleSignal = signal<boolean>(false);
  //Casi nuca van a cambiar
  rowsSignal = signal<number>(250);
  scrollableSignal = signal<boolean>(true);
  showCurrentPageReportSignal = signal<boolean>(true);
  paginatorSignal = signal<boolean>(true);
  totalRecordsSignal = signal<any>(10);
  filterDelayTableSignal = signal<number>(300);
  minWidthSignal = signal<any>({ 'min-width': '75rem' });
  valueSignal = signal<any[]>([{ name: "Solicitar material" }]);
  columnsSignal = signal<any[]>([]);
  selectedSignal = signal<any[]>([]);


  is_local_checked = true;

  private formSubscription: Subscription | undefined;

  ngOnChanges(changes: SimpleChanges) {

    if (changes['exportDialogVisible']) {
      this.exportDialogVisibleSignal.set(changes['exportDialogVisible'].currentValue);
    }

    if (changes['value']) {
      this.valueSignal.set(changes['value'].currentValue);
    }

    if (changes['columns']) {
      this.columnsSignal.set(changes['columns'].currentValue);
    }

    if (changes['selected']) {
      this.selectedSignal.set(changes['selected'].currentValue);
    }

    //casi nuca van a cambiar
    if (changes['rows']) {
      this.rowsSignal.set(changes['rows'].currentValue);
    }

    if (changes['scrollable']) {
      this.scrollableSignal.set(changes['scrollable'].currentValue);
    }

    if (changes['showCurrentPageReport']) {
      this.showCurrentPageReportSignal.set(changes['showCurrentPageReport'].currentValue);
    }

    if (changes['paginator']) {
      this.paginatorSignal.set(changes['paginator'].currentValue);
    }

    if (changes['totalRecords']) {
      this.totalRecordsSignal.set(changes['totalRecords'].currentValue);
    }

    if (changes['filterDelayTable']) {
      this.filterDelayTableSignal.set(changes['filterDelayTable'].currentValue);
    }

    if (changes['minWidth']) {
      this.minWidthSignal.set({ 'min-width': changes['minWidth'].currentValue });
    }

  }
  ngOnDestroy() {
    this.formSubscription?.unsubscribe();
  }

  ngOnInit(): void {
    this.form.set(this.fb.group({
      cols: [{ value: this.columnsSignal().map((column: any) => column.field), disabled: true },
      [Validators.required]],
    }));

    this.items = [
      { label: 'View', icon: 'pi pi-fw pi-search', command: () => { console.log('View') } },
      { label: 'Delete', icon: 'pi pi-fw pi-times', command: () => { console.log('View') } }
    ];
  }

  changeToggleButton(status: any) {
    this.is_local_checked = status.checked;
    if (status.checked) {
      this.form()?.disable();
    } else {
      this.form()?.enable();
    }
  }

  //°°° SOLO LO TENGO PARA VER QUE TANTO SE LLAMAS LAS FUNCIONAES CON LA REDENREZAIÓN 
  p() {
    return this.columns
  }

  /*get disable() {
    return this.selected?.length != 1;
  }*/

  sort(event: any) {
    console.log(event);
  }

  exportData(tb: any) {
    console.log('exportData');

    //si es local exporta la info de la tabla, si no, consulta al servidor, emite al padre de la table
    if (this.is_local_checked) {
      tb.exportCSV();
    } else {
      this.exportServerAction.emit(this.form()?.value);
    }

    this.exportDialogVisibleAction.emit(false);
  }





  j(e: any) {
    this.lazyLoadAction.emit(e);
  }

}
