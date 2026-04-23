import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { LOCAL_BASE } from '../../shared/components.index';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TreeNode } from 'primeng/api';

@Component({
  selector: 'app-organization-chart',
  imports: [...PRIME_MODULES, ...LOCAL_BASE, OrganizationChartModule],
  templateUrl: './organization-chart.component.html',
  styleUrl: './organization-chart.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class OrganizationChartComponent extends CRUD implements OnInit {

  chart = true
  selectedNodes!: TreeNode[];

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Organigrama',
    command: () => this.openNew({ pos: 'organizational-chart' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Organigrama',
    command: () => this.getAll({ pos: 'organizational-chart' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'organizational-chart');
  }

  ngOnInit(): void {
    this.typeDefault = 'organizational-chart';
    this.app[this.typeDefault] = 'employees/organizational-chart';
    this.module[this.typeDefault] = 'OR';
    this.initCRUD();
  }

  data: TreeNode[] = [
    {
      expanded: true,
      type: 'person',
      data: {
        image: 'https://primefaces.org/cdn/primeng/images/demo/avatar/amyelsner.png',
        name: 'Martin',
        title: 'CEO'
      },
      children: [
        {
          expanded: true,
          type: 'person',
          data: {
            image: 'https://primefaces.org/cdn/primeng/images/demo/avatar/annafali.png',
            name: 'Eduardo',
            title: 'CFO'
          },
          children: [
            {
              label: 'Jaime'
            },
            {
              label: 'Eduardo'
            },
            {
              label: 'Alejandro'
            },
            {
              label: 'Carlos'
            }
          ]
        },
        {
          expanded: true,
          type: 'person',
          data: {
            image: 'https://primefaces.org/cdn/primeng/images/demo/avatar/stephenshaw.png',
            name: 'Miguel',
            title: 'CHRO'
          },
          children: [
            {
              label: 'Francisco'
            },
            {
              label: 'Enrique'
            },

            {
              label: 'Tony'
            },
          ]
        },
        {
          expanded: true,
          type: 'person',
          data: {
            image: 'https://primefaces.org/cdn/primeng/images/demo/avatar/stephenshaw.png',
            name: 'Alberto',
            title: 'COO'
          },
          children: [
            {
              label: 'Jose Luis'
            },
            {
              label: 'Jorge C'
            },
            {
              label: 'Jorge R'
            },
            {
              label: 'Jorge R'
            },
          ]
        },
        {
          expanded: true,
          type: 'person',
          data: {
            image: 'https://primefaces.org/cdn/primeng/images/demo/avatar/stephenshaw.png',
            name: 'Fernando',
            title: 'CCO'
          },
          children: [
            {
              label: 'Ramon'
            },
          ]
        }
      ]
    }
  ];

}
