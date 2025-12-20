import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { ClassifierService } from '../services/classifier.service';
import { CRUD } from '../../utils/crud.class';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { TreeTableModule } from 'primeng/treetable';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ButtonModule } from 'primeng/button';
import { PRIME_MODULES } from '../../shared/primeng.index';
import { LOCAL_BASE } from '../../shared/components.index';

@Component({
  selector: 'app-classifier',
  imports: [
    CommonModule,
    TreeTableModule,
    ButtonModule,
    InputIconModule,
    IconFieldModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  templateUrl: './classifier.component.html',
  styleUrl: './classifier.component.scss',
  standalone: true,
  providers: [ConfirmationService]
})
export class ClassifierComponent extends CRUD implements OnInit {



  // Si se va a dar mas de un componente de alta
  override openNewMenu = signal<MenuItem[]>([{
    label: 'Clasificador',
    command: () => this.openNew({ pos: 'classifier-level', node: true })
  }, {
    label: 'Aplicación',
    command: () => this.openNew({ pos: 'app-classifier-type' })
  },

  ]);

  // consultas
  override getMenu = signal<MenuItem[]>([{
    label: 'Clasificadores',
    command: () => this.getClassifierLevel()
  }, {
    label: 'Aplicaciones',
    command: () => this.getAppClassifierType()
  },
  ]);

  // Propiedad específica para acceder a métodos de ClassifierService
  private classifierS: ClassifierService;

  constructor(crudS: ClassifierService,) {
    super(crudS, 'classifier-level');
    this.classifierS = crudS;

    // Effect que reacciona automáticamente cuando items() cambia
    effect(() => {
      const currentItems = this.items();
      if (currentItems && currentItems.length > 0) {
        // Transformar solo si tenemos datos
        const transformed = this.transformToTreeNodes(currentItems);
        this.treeItems.set(transformed);
      }
    });
  }

  ngOnInit() {
    this.typeDefault = 'classifier-level';
    this.app[this.typeDefault] = 'classifiers/classifier-level';
    this.module[this.typeDefault] = 'CS';

    this.initCRUD();
  }

  /**
   * Transforma un array plano en estructura TreeNode para p-treeTable
   */
  transformToTreeNodes(items: any[]): any[] {
    return items.map(item => ({
      data: item,
      children: [],
      leaf: false,
      expanded: false
    }));
  }

  /**
   * Signal que contiene los items transformados a TreeNode[]
   */
  treeItems = signal<any[]>([]);

  getClassifierLevel() {

    this.sort = 'classifier_type,level';
    //AUN NO RECUEROD SI TENGO SORT COMO GLOBAL POR ALGUNA RAZON EN PARTICULAR
    super.getAll({ pos: 'classifier-level', /*node: true,*/ force: true, /*sort: 'classifier_type,level'*/ });
  }


  /**
     * Obtiene los tipos de clasificadores
     */
  getAppClassifierType() {
    // lo sobreescribo para limpiar sort ya que app-classifier-type no tiene sort
    this.sort = '';
    this.getAll({ pos: 'app-classifier-type' });
  }

  openNewClassifier(rowData: any, rowNodee: any) {

  }

  editClassifier(formData: any, id: string) {
    console.log('editClassifier', formData.classifiers);
    /*return this.http.patch(`${this._classifiers}/classifiers/${id}/`, this.generalS.baseDJA({
      attributes: formData,
      type: "classifier", //classifier_level
      relationships: [
        { id: formData.classifier_level, field: 'classifier_level', type: 'classifier-level' },
        { id: formData.classifiers, field: 'classifiers', type: 'classifier' },
      ],
      id: id
    }));*/
  }

  deleteClassifier(id: string) {
    //return this.http.delete(`${this._classifiers}/classifiers/${id}/`);
  }

  /**
    * 
    * @param node El nodo que se va a actualizar
    * @param level nivel de clasificadoe
    * @param classifier_type el tipo de clasificador
    * @param option null para cargar el nodo, getPreviousLevel para cargar el clasificador de nivel superior
    */
  /**
   * Maneja la expansión de nodos del TreeTable (lazy loading)
   * Carga los clasificadores hijos del nodo expandido
   */
  getClassifiers(event: any) {
    this.showBlocked();

    //$event.node.data.level,$event.node.data.classifier_type

    // Obtener el nodo desde el evento
    const level = event.data.level; // Nivel de los hijos
    const classifier_type = event.data.classifier_type;

    const filter = 'filter[classifier_level.classifier_type]=' + classifier_type + '&filter[classifier_level.level]=' + level;
    this.sort = '';

    this.classifierS.getClassifiersForLevel(filter).subscribe({
      next: (resp: any) => {
        // Obtener los datos planos del servidor
        const childrenData = this.DJAtoObject({ resp });

        // Transformar a formato TreeNode para el TreeTable
        event.children = this.transformToTreeNodes(childrenData);

        // Actualizar el array completo para que PrimeNG detecte los cambios
        this.treeItems.set([...this.treeItems()]);

        this.showBlocked(false);
      },
      error: (e: any) => {
        this.showBlocked(false);
        this.messageS.changeMessage('No fue posible obtener los clasificadores.', e);
      }
    });
  }


}
