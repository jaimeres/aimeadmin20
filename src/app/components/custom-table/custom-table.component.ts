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
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-custom-table',
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, MultiSelectModule, ToggleButtonModule, SelectModule, DialogModule, TableModule,
    ContextMenuModule, InputIconModule, IconFieldModule, TooltipModule
  ],
  templateUrl: './custom-table.component.html',
  styleUrl: './custom-table.component.scss',
  standalone: true
})
export class CustomTableComponent implements OnChanges {

  optionsExport = signal<any[]>([{ id: 'excel', name: 'Excel' }, { id: 'pdf', name: 'PDF' }, { id: 'csv', name: 'CSV' }]);
  form = signal<FormGroup | null>(null);
  protected fb: FormBuilder = inject(FormBuilder);
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

  // Control de búsqueda remota/local
  searchRemoteEnabled = signal<boolean>(false);
  showSearchWarning = signal<boolean>(false);

  is_local_checked = true;

  private formSubscription: Subscription | undefined;

  ngOnChanges(changes: SimpleChanges) {

    if (changes['value']) {
      this.valueSignal.set(changes['value'].currentValue);
    }

    if (changes['columns']) {
      this.columnsSignal.set(changes['columns'].currentValue);
    }

    if (changes['selected']) {
      this.selectedSignal.set(changes['selected'].currentValue);
    }

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
    //quitar esta clase es para se permita el scroll  nivel de toda la pagina, ya que a veces se visualizar 
    // un pequeño scroll cuando se carga la tabla y como que la pagina no ajusta al 100% de altura
    document.documentElement.classList.remove('table-fit-mode');
    this.formSubscription?.unsubscribe();
  }

  ngOnInit(): void {
    //añadir esta clase es para se permita el scroll  nivel de toda la pagina, ya que a veces se visualizar
    // un pequeño scroll cuando se carga la tabla y como que la pagina no ajusta al 100% de altura
    document.documentElement.classList.add('table-fit-mode');

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

    this.onExportDialogVisible(false);
  }

  /**
   * Toggle entre búsqueda local (página visible) y remota (servidor completo)
   */
  toggleSearchRemote() {
    this.searchRemoteEnabled.update(val => !val);

    // Mostrar/ocultar advertencia
    this.showSearchWarning.set(!this.searchRemoteEnabled());

    console.log('🌐 Búsqueda remota:', this.searchRemoteEnabled() ? 'HABILITADA (servidor)' : 'DESHABILITADA (solo página visible)');
  }

  /**
   * Intercepta el evento onLazyLoad de PrimeNG, agrega searchRemote y lo emite
   */
  onLazyLoadInternal(event: any) {
    // Agregar searchRemote directamente al objeto event
    event.searchRemote = this.searchRemoteEnabled();

    // Emitir el evento modificado
    this.lazyLoadAction.emit(event);
  }

  /**
   * Maneja el input de búsqueda
   * - Modo LOCAL: filtra en tiempo real mientras escribes
   * - Modo REMOTO: solo muestra lo que escribes, búsqueda se ejecuta con Enter
   *   EXCEPCIÓN: si se vacía la caja, restaura automáticamente datos originales
   */
  onSearchInput(event: any, dt: any) {
    const value = event.target.value;

    if (!this.searchRemoteEnabled()) {
      // Búsqueda LOCAL: filtrar en tiempo real
      dt.filterGlobal(value, 'contains');
    } else {
      // Modo REMOTO: detectar si se vació la caja para restaurar automáticamente
      if (value.trim() === '') {
        dt.filterGlobal('', 'contains');
        console.log('🧹 Campo vaciado en modo remoto - Restaurando datos originales');
      }
    }
  }

  /**
   * Ejecuta búsqueda remota al presionar Enter
   */
  onSearchEnter(event: any, dt: any) {
    const value = event.target.value;

    if (this.searchRemoteEnabled()) {
      // Búsqueda REMOTA: ejecutar al presionar Enter
      dt.filterGlobal(value, 'contains');
      console.log('🔍 Enter presionado - Ejecutando búsqueda remota:', value);
    }
  }


  // Métodos para el paginador responsive
  getFirstRecord(): number {
    if (!this.valueSignal() || this.valueSignal().length === 0) return 0;
    return 1; // Simplificado para el primer registro mostrado
  }

  getLastRecord(): number {
    const current = this.valueSignal().length;
    const total = this.totalRecordsSignal();
    return Math.min(current, total);
  }

  getPaginatorTooltip(): string {
    const first = this.getFirstRecord();
    const last = this.getLastRecord();
    const total = this.totalRecordsSignal();
    const selected = this.selectedSignal().length;

    return `Mostrar del ${first} al ${last} de ${total} registros - ${selected} seleccionados`;
  }

  getRowsPerPageOptions(): number[] {
    const currentRows = Number(this.rowsSignal()) || 0;
    const baseOptions = [10, 20, 50, 100, 250, 500, 1000];
    const options = new Set<number>(baseOptions);
    if (currentRows > 0) {
      options.add(currentRows);
    }
    return Array.from(options).sort((a, b) => a - b);
  }

  onExportDialogVisible(event: any) {
    this.exportDialogVisibleAction.emit(false);
  }

}
