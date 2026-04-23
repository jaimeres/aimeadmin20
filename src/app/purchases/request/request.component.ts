import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, Renderer2, signal, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { PurchaseService } from '../services/purchase.service';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';

@Component({
  selector: 'app-request',
  imports: [
    CommonModule,
    TableModule,
    TagModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './request.component.html',
  styleUrl: './request.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class RequestComponent extends CRUD implements OnInit {

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  public formSA: FormGroup = new FormGroup({});

  /**
   * Muestra u oculta partes del componente
   */
  @Input() showComponent: any = null;

  /**
   * Emite el cierre del dialogo al componente padre
   */
  @Output() closeDialog = new EventEmitter<void>();

  public products = signal<any[]>([]);
  public stock = signal<any[]>([]);

  constructor(crudS: PurchaseService,) {
    super(crudS, 'request-detail');
  }



  ngOnInit() {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'request-detail';
    this.app[this.typeDefault] = 'purchases/request-detail';
    this.module[this.typeDefault] = 'CO';

    // request-detail no siempre soporta is_active como filtro de listado.
    // Si viene activo por configuración global, provoca 400 en el backend.
    const requestFields = this.crudS.fieldsForm(this.typeDefault);
    if (requestFields?.is_active?.cols?.filter) {
      requestFields.is_active.cols.filter.active = false;
    }



    //////////////////////////////////////////////////////////////////////
    /*const option_label = this.searchFieldDrawForm('search_name', 'request-detail');
    this.search_name.set(option_label.option_label);*/
    this.initCRUD();
  }

  /*ppDialogVisible = false;
  scDialogVisible = false;
  rDialogVisible = false;
  saDialogVisible = false;
  aDialogVisible = false;
  pDialogVisible = false;
  cDialogVisible = false;
  tDialogVisible = false;
  eDialogVisible = false;

  // Temporal: menu clic derecho + dialogo de confirmacion visual.*/
  tempActionDialogVisible = false;
  tempActionLabel = '';


  /**
   * Sobreescribe el método onHide para poder avisar al padre que se cerro el dialogo
   * @param app 
   */
  override onHide(app: any = null) {
    super.onHide();
    this.closeDialog.emit();
  }

  showMore(item: any) {
    console.log('showMore---------', item);
  }

  override onSelectAutoComplete(event: any) {

    console.log('onSelectAutoComplete------------------', event);

    this.currentForm()?.get('product')?.setValue(event.event.id);

    //°°°POR EL MOMENTO ES EL PRIMER ELEMENTO PERO DESPUES DEBE RESIOLVERSE COMO LIDIar cuando se retorna mas de uno
    /*const sName = this.search_name();  // Cadena dinámica
    const option_label: any = {};
    // Asigna el valor de manera dinámica
    option_label[sName] = event[sName];
    this.currentForm()?.get('search_name')?.setValue(option_label)*/
    //option_label
    this.replaceValDrawForm(
      [['', '', true]],
      [['requested', 'autofocus'],],
      this.drawForm()['request-detail']['general']['grid']);

    //desfragmentar this.draw() para foear la actuaklizacion de la vista
    const updatedDraw = { ...this.drawForm() };
    this.drawForm.set(updatedDraw);
  }



  public columnsExist: any[] = [
    { field: 'code', header: 'Código', maxlength: 40, type: 'text' },
    { field: 'name', header: 'Nombre', maxlength: 50 },
    { field: 'price', header: 'Precio' },
    { field: 'requested', header: 'Cantidad' },
    { field: 'discard_proof', header: 'Desecho' },
  ];


  cancelRequestDetail() {
    console.log('cancelRequestDetail');

  }


  private openTempDialogFor(status: string, label: string) {
    this.tempActionLabel = label;
    this.tempActionDialogVisible = true;
  }


  //temporal
  override onSelection(event: any[]) {

    super.onSelection(event);
    console.log(this.startMenu());

    this.startMenu().push(
      { separator: true },
      { label: 'Pedido a proveedor', command: () => this.openTempDialogFor('P', 'Pedido a proveedor') },
      { label: 'Salida de almacén', command: () => this.openTempDialogFor('SA', 'Salida de almacén') },
      { label: 'Subastar', command: () => this.openTempDialogFor('SC', 'Subastar') },
      { label: 'Rechazar', command: () => this.openTempDialogFor('R', 'Rechazar') },
      { label: 'Cancelar', command: () => this.openTempDialogFor('C', 'Cancelar') },
      { label: 'Duplicar', command: () => this.openTempDialogFor('D', 'Duplicar') },
      { label: 'Enlazar', command: () => this.openTempDialogFor('E', 'Enlazar') },
    );
  }

}
