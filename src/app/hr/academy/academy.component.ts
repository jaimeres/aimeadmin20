import { Component, OnInit, signal } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CrudPageShellComponent } from '../../shared/crud-page-shell.component';
import { CRUD } from '../../utils/crud.class';
import { HrService } from '../services/hr.service';

@Component({
  selector: 'app-academy',
  imports: [CrudPageShellComponent],
  templateUrl: './academy.component.html',
  styleUrl: './academy.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class AcademyComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Curso o evaluación',
    command: () => this.openNew({ pos: 'hr-courses-evaluations' })
  }]);

  public override getMenu = signal<MenuItem[]>([{
    label: 'Cursos y evaluaciones',
    command: () => this.getAll({ pos: 'hr-courses-evaluations' })
  }]);

  constructor(crudS: HrService) {
    super(crudS, 'hr-courses-evaluations');
  }

  ngOnInit(): void {
    this.typeDefault = 'hr-courses-evaluations';
    this.app[this.typeDefault] = 'hr/courses-evaluations';
    this.module[this.typeDefault] = 'HR';
    this.initCRUD();
  }

}
