import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
  ComponentRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { TASK_MODULE_REGISTRY } from '../../utils/task-module-registry';

@Component({
  selector: 'app-task-module-loader',
  template: `<ng-container #container></ng-container>`,
  standalone: true,
})
export class TaskModuleLoaderComponent implements OnChanges, OnDestroy {

  @Input() tasksModule: Record<string, any> = {};
  @Output() closeDialog = new EventEmitter<void>();

  @ViewChild('container', { read: ViewContainerRef, static: true }) container!: ViewContainerRef;

  private componentRef: ComponentRef<any> | null = null;
  private closeSubscription: Subscription | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tasksModule']) {
      this.loadComponent();
    }
  }

  private async loadComponent() {
    this.cleanup();

    const moduleCode = Object.keys(this.tasksModule)[0];
    if (!moduleCode || !this.tasksModule[moduleCode]) return;

    const loader = TASK_MODULE_REGISTRY[moduleCode];
    if (!loader) {
      console.warn(`No hay componente registrado para el código de módulo: ${moduleCode}`);
      return;
    }

    const componentType = await loader();
    this.componentRef = this.container.createComponent(componentType);
    this.componentRef.setInput('showComponent', this.tasksModule[moduleCode]);

    if (this.componentRef.instance.closeDialog) {
      this.closeSubscription = this.componentRef.instance.closeDialog.subscribe(() => {
        this.closeDialog.emit();
      });
    }
  }

  private cleanup() {
    this.closeSubscription?.unsubscribe();
    this.closeSubscription = null;
    this.componentRef?.destroy();
    this.componentRef = null;
    this.container?.clear();
  }

  ngOnDestroy() {
    this.cleanup();
  }
}
