import { Component, EventEmitter, Input, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { CompanyService } from '../services/company.service';


@Component({
  selector: 'app-company',
  imports: [
    CommonModule,
    TableModule,
    TagModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './company.component.html',
  styleUrl: './company.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class CompanyComponent extends CRUD implements OnInit {

  /**
   * Muestra u oculta partes del componente
   */
  @Input() showComponent: any = null;

  /**
  * Emite el cierre del dialogo al componente padre
  */
  @Output() closeDialog = new EventEmitter<void>();

  constructor(crudS: CompanyService,) {
    super(crudS, 'group');
  }

  ngOnInit() {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'group';
    this.app[this.typeDefault] = 'companies/group';
    this.module[this.typeDefault] = 'GR';


    this.initCRUD();

  }

  /*ngOnChanges(changes: SimpleChanges) {
    this.showComponentSignal()['local'] = false;

    if (changes['showComponent'] && changes['showComponent'].currentValue) {
      // Verifica si el valor actual de showComponent es válido
      const currentValue = changes['showComponent'].currentValue;

      if (currentValue['create']) {
        this.openNew(); // Aquí se realiza la lógica para crear
        this.showComponentSignal()['create'] = true;
      } else if (currentValue['update']) {
        this.showComponentSignal()['update'] = true;
        this.edit();
      } else if (currentValue['delete']) {
        this.showComponentSignal()['delete'] = true;
        this.delete();
      } else if (currentValue['read']) {
        this.showComponentSignal()['read'] = true;
        this.getAll();
      }
    }
  }*/


}
