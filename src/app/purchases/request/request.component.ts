import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, Renderer2, signal, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { PurchaseService } from '../services/purchase.service';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-request',
  imports: [
    CommonModule,
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



  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Solicitudes detalle',
    command: () => this.openNew({ pos: 'request-detail' })
  }, {
    label: 'Solicitudes',
    command: () => this.openNew({ pos: 'request' })
  },
  {
    label: 'Remisiones',
    command: () => this.openNew({ pos: 'delivery-note' })
  },

  ]);

  // consultas
  public override getMenu = signal<MenuItem[]>([{
    label: 'Solicitudes detalle',
    command: () => this.getAll({ pos: 'request-detail' })
  }, {
    label: 'Solicitudes',
    command: () => this.getAll({ pos: 'request' })
  },
  {
    label: 'Remisiones',
    command: () => this.getAll({ pos: 'delivery-note' })
  }
  ]);

  /**
   * Muestra u oculta partes del componente
   */
  @Input() showComponent: any = null;

  /**
   * Emite el cierre del dialogo al componente padre
   */
  @Output() closeDialog = new EventEmitter<void>();

  constructor(crudS: PurchaseService,) {
    super(crudS, 'request-detail');
  }

  ngOnInit() {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'request-detail';
    this.app[this.typeDefault] = 'purchases/request-detail';
    this.module[this.typeDefault] = 'CO';


    this.app['request'] = 'purchases/request';
    this.module['request'] = 'CO';




    this.app['delivery-note'] = 'purchases/delivery-note';
    this.module['delivery-note'] = 'CO';


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

  // [[[II ESC:030-04 DOC:docs/documents/2026-07-14-030-child-runtime-overlay.md#escenario-04
  override onSelectAutoComplete(event: any) {
    // La relación y los children se resuelven en el componente dinámico desde
    // `relationship_field`; request-detail solo conserva su ajuste de autofocus.
    super.onSelectAutoComplete(event);
    this.replaceValDrawForm(
      [['', '', true]],
      [['requested', 'autofocus'],],
      this.drawForm()['request-detail']['general']['grid']);

    //desfragmentar this.draw() para foear la actuaklizacion de la vista
    const updatedDraw = { ...this.drawForm() };
    this.drawForm.set(updatedDraw);
  }
  // ]]]FI

  cancelRequestDetail() {
    console.log('cancelRequestDetail');
  }

  // [[[II ESC:034-02 `handleTableRowSave` se movió a `CRUD`: el nombre del campo
  // del detalle viaja en la configuración, así que no había nada específico de
  // solicitudes en él y toda pantalla con tabla derivada lo necesita igual. ]]]FI

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
