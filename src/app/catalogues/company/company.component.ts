import { Component, EventEmitter, Input, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';
import { CompanyService } from '../services/company.service';
import { MenuItem } from 'primeng/api';


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


  override openNewMenu = signal<MenuItem[]>([{
    label: 'Grupos',
    command: () => this.openNew({ pos: 'group' })
  },
  {
    label: 'Empresas',
    command: () => this.openNew({ pos: 'company' })
  },
  {
    label: 'Sucursales',
    command: () => this.openNew({ pos: 'subsidiary' })
  }, {
    label: 'Almacenes',
    command: () => this.openNew({ pos: 'warehouse' })
  },
  {
    label: 'Secciones',
    command: () => this.openNew({ pos: 'section' })
  },
  {
    label: 'Anaqueles',
    command: () => this.openNew({ pos: 'rack' })
  }, {
    label: 'Ubicaciones',
    command: () => this.openNew({ pos: 'slot' })
  }
  ]);

  override getMenu = signal<MenuItem[]>([{
    label: 'Grupos',
    command: () => this.getAll({ pos: 'group' })
  }, {
    label: 'Empresas',
    command: () => this.getAll({ pos: 'company' }),
  }, {
    label: 'Sucursales',
    command: () => this.getAll({ pos: 'subsidiary' })
  }, {
    label: 'Almacenes',
    command: () => this.getAll({ pos: 'warehouse' })
  }, {
    label: 'Secciones',
    command: () => this.getAll({ pos: 'section' })
  }, {
    label: 'Anaqueles',
    command: () => this.getAll({ pos: 'rack' })
  }, {
    label: 'Ubicaciones',
    command: () => this.getAll({ pos: 'slot' })
  }
  ]);

  constructor(crudS: CompanyService,) {
    super(crudS, 'group');
  }

  ngOnInit() {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'group';
    this.app[this.typeDefault] = 'companies/group';
    this.module[this.typeDefault] = 'GR';

    this.app['company'] = 'companies/company';
    this.module['company'] = 'EM';

    this.app['subsidiary'] = 'companies/subsidiary';
    this.module['subsidiary'] = 'SU';

    this.app['warehouse'] = 'companies/warehouse';
    this.module['warehouse'] = 'AL';

    this.app['section'] = 'companies/section';
    this.module['section'] = 'SE';

    this.app['rack'] = 'companies/rack';
    this.module['rack'] = 'ANA';

    this.app['slot'] = 'companies/slot';
    this.module['slot'] = 'UB';

    this.initCRUD();

  }

}
