import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges, computed } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { TreeTableModule } from 'primeng/treetable';
import { MessageService } from '../services/message.service';
import { GeneralService } from '../../utils/services/general.service';
import { TaskService } from '../../tasks/services/task.service';

@Component({
  selector: 'app-custom-task-tree',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TooltipModule,
    TreeTableModule,
  ],
  templateUrl: './custom-task-tree.component.html',
  styleUrl: './custom-task-tree.component.scss',
})
export class CustomTaskTreeComponent implements OnChanges {
  // [[[II ESC:024-12 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-12
  @Input() active = false;
  @Input() selected: any[] = [];
  @Input() module = '';
  @Input() consumerApp = '';
  @Input() consumerType = '';
  @Input() refreshKey = 0;

  @Output() createDetail = new EventEmitter<any>();
  @Output() editDetail = new EventEmitter<{ detail: any; task: any }>();

  private readonly taskS = inject(TaskService);
  private readonly generalS = inject(GeneralService);
  private readonly messageS = inject(MessageService);

  readonly taskNodes = signal<TreeNode[]>([]);
  readonly loading = signal(false);
  readonly columns = signal([
    { field: 'name', header: 'Tarea' },
    { field: 'status__name', header: 'Estado' },
    { field: 'created_at', header: 'Creado' },
  ]);
  readonly globalFilterFields = computed(() => this.columns().map((column) => column.field));

  private loadedRootKey = '';
  private loadedDetailKey = '';
  private relatedDetails: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    const shouldReset = !!changes['selected'] || !!changes['consumerApp'] || !!changes['consumerType'];
    if (shouldReset) {
      this.loadedRootKey = '';
      this.loadedDetailKey = '';
      this.relatedDetails = [];
      this.taskNodes.set([]);
    }

    if (changes['refreshKey']) {
      this.loadedRootKey = '';
      this.loadedDetailKey = '';
      this.relatedDetails = [];
      this.taskNodes.update((nodes) => nodes.map((node) => ({
        ...node,
        children: [],
        leaf: false,
        data: { ...(node.data || {}), __childrenLoaded: false },
      })));
    }

    if (this.active) {
      this.loadRootTasks();
    }
  }

  onNodeExpand(event: any): void {
    const node = event?.node as TreeNode | undefined;
    if (!node || node.data?.__taskTreeKind !== 'task' || node.data?.__childrenLoaded) return;
    this.loadTaskDetails(node);
  }

  openRow(rowNode: any, rowData: any): void {
    if (rowData?.__taskTreeKind === 'detail') {
      this.editDetail.emit({ detail: rowData, task: rowNode?.node?.parent?.data });
      return;
    }

    if (rowData?.__taskTreeKind === 'task') {
      this.createDetail.emit(rowData);
    }
  }

  private loadRootTasks(): void {
    const selectedRecord = this.selected?.[0];
    const consumerId = selectedRecord?.id;
    const idsTask = this.normalizeIds(selectedRecord?.tasks);
    const key = `${this.consumerType}:${consumerId}:${idsTask.join(',')}:${this.module}`;

    if (!consumerId || idsTask.length === 0 || key === this.loadedRootKey) return;

    this.loading.set(true);
    this.taskS.getObject({
      app: 'tasks/task',
      type: 'task',
      fields: 'name,modules,action_app,is_detail_required,child_form_fields,status,',
      filter: 'filter[is_active]=true',
    }).subscribe({
      next: (resp: any) => {
        const tasks = this.generalS.DJAtoObject({
          respDJA: resp,
          fields: this.taskS.fieldsForm('task'),
        });
        const idSet = new Set(idsTask.map((id) => String(id)));
        const filteredTasks = tasks.filter((task: any) => idSet.has(String(task.id)) && this.matchesModule(task));
        this.taskNodes.set(filteredTasks.map((task: any) => this.toTaskNode(task)));
        this.loadedRootKey = key;
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.messageS.changeMessage('Hay un error al cargar las tareas.', err, []);
      }
    });
  }

  private loadTaskDetails(node: TreeNode): void {
    const selectedRecord = this.selected?.[0];
    const consumerId = selectedRecord?.id;
    if (!consumerId || !this.consumerApp) return;

    this.loading.set(true);
    this.ensureRelatedDetails(consumerId, () => {
      const taskId = String(node.data?.id);
      const detailNodes = this.relatedDetails
        .filter((detail) => String(detail?.task) === taskId)
        .map((detail) => this.toDetailNode(detail));

      node.children = detailNodes;
      node.leaf = detailNodes.length === 0;
      node.data = { ...(node.data || {}), __childrenLoaded: true };
      this.taskNodes.set([...this.taskNodes()]);
      this.loading.set(false);
    });
  }

  private ensureRelatedDetails(consumerId: any, done: () => void): void {
    const key = `${this.consumerApp}:${consumerId}`;
    if (key === this.loadedDetailKey) {
      done();
      return;
    }

    this.taskS.getRelated({
      id: consumerId,
      app: this.consumerApp,
      type: 'task-detail',
      related: 'task_details',
      include: 'task',
      fields: 'name,task,parent_form_data,form_data,status,created_at,modified_at,',
    }).subscribe({
      next: (resp: any) => {
        this.relatedDetails = this.generalS.DJAtoObject({
          respDJA: resp,
          fields: this.taskS.fieldsForm('task-detail'),
        });
        this.loadedDetailKey = key;
        done();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.messageS.changeMessage('Hay un error al cargar los detalles de tareas.', err, []);
      }
    });
  }

  private toTaskNode(task: any): TreeNode {
    return {
      data: {
        ...task,
        __taskTreeKind: 'task',
        __childrenLoaded: false,
      },
      children: [],
      leaf: false,
    };
  }

  private toDetailNode(detail: any): TreeNode {
    return {
      data: {
        ...detail,
        __taskTreeKind: 'detail',
        name: detail.name || detail.task__name || detail.task_name || `Detalle ${detail.id}`,
      },
      children: [],
      leaf: true,
    };
  }

  private normalizeIds(value: any): any[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => typeof item === 'object' ? item?.id : item)
        .filter((item) => item !== null && item !== undefined && item !== '');
    }
    return [typeof value === 'object' ? value?.id : value].filter((item) => item !== null && item !== undefined && item !== '');
  }

  private matchesModule(task: any): boolean {
    if (!this.module) return true;
    const modules = task?.modules;
    return Array.isArray(modules) ? modules.includes(this.module) : modules === this.module;
  }
  // ]]]FI
}
