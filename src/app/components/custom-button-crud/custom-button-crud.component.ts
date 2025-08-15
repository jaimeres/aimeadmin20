import { Component, computed, EventEmitter, Input, Output, signal, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { SplitButton } from 'primeng/splitbutton';
import { ToolbarModule } from 'primeng/toolbar';
import { SpeedDialModule } from 'primeng/speeddial';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-custom-button-crud',
  imports: [CommonModule, ButtonModule, SplitButton, ToolbarModule, SpeedDialModule, MenuModule],
  templateUrl: './custom-button-crud.component.html',
  styleUrl: './custom-button-crud.component.scss',
  standalone: true
})
export class CustomButtonCrudComponent {

  @ViewChild('contextMenu', { static: false }) contextMenu: any;

  @Input() moreOptions: any;
  @Input() openNewMenu: any;
  @Input() startMenu: any;
  @Input() getMenu: any;
  @Input() selected: any[] = [];

  @Output() deleteAction = new EventEmitter<void>();
  @Output() editAction = new EventEmitter<void>();
  @Output() refreshAction = new EventEmitter<void>();
  @Output() newAction = new EventEmitter<void>();
  @Output() startAction = new EventEmitter<void>();

  public showDeleteSignal = signal<boolean>(true);
  public showEditSignal = signal<boolean>(true);
  public showRefreshSignal = signal<boolean>(true);
  public showNewSignal = signal<boolean>(true);
  public showStartSignal = signal<boolean>(false);
  public moreOptionsSignal = signal<any>([]);
  public openNewMenuSignal = signal<any>([]);
  public startMenuSignal = signal<any>([]);
  public getMenuSignal = signal<any>([]);
  public selectedSignal = signal<any[]>([]);

  ngAfterViewInit() {
    setTimeout(() => {
      //inicializa con true si fueron implementados en el padre, es decir, solo aquellos que tiene su Output 
      // implementado |||los botones que implementarn botones simples o splitButton siempre deben tener en 
      // emitter, es decir un Output que es el que controla si el boton es visible y es quien emite el 
      // evento al picar directamente sobre el boton y opcionalemnte un inpunt de tipo menú que en quien controla 
      // cuando se ve el menú o el boton simple
      this.showDeleteSignal.set(this.deleteAction.observed);
      this.showEditSignal.set(this.editAction.observed);
      this.showRefreshSignal.set(this.refreshAction.observed);
      this.showNewSignal.set(this.newAction.observed);
      this.showStartSignal.set(this.startAction.observed);
    });
  }

  ngOnChanges(changes: SimpleChanges) {

    if (changes['moreOptions']) {
      this.moreOptionsSignal.set(changes['moreOptions'].currentValue);
    }

    if (changes['openNewMenu']) {
      this.openNewMenuSignal.set(changes['openNewMenu'].currentValue);
    }

    if (changes['startMenu']) {
      this.startMenuSignal.set(changes['startMenu'].currentValue);
    }

    if (changes['getMenu']) {
      this.getMenuSignal.set(changes['getMenu'].currentValue);
    }

    if (changes['selected']) {
      this.selectedSignal.set(changes['selected'].currentValue);
    }
  }

  disable = computed(() => this.selectedSignal()?.length != 1);

  // Menú contextual dinámico
  contextMenuItems = signal<any[]>([]);

  // Función para mostrar menú contextual
  showContextMenu(event: any, menuType: string) {
    let menuItems: any[] = [];

    switch (menuType) {
      case 'new':
        if (this.openNewMenuSignal()?.length > 0) {
          menuItems = [
            { label: 'Nuevo (Principal)', icon: 'pi pi-plus', command: () => this.newAction.emit() },
            { separator: true },
            ...this.openNewMenuSignal()
          ];
        }
        break;
      case 'refresh':
        if (this.getMenuSignal()?.length > 0) {
          menuItems = [
            { label: 'Actualizar (Principal)', icon: 'pi pi-refresh', command: () => this.refreshAction.emit() },
            { separator: true },
            ...this.getMenuSignal()
          ];
        }
        break;
      case 'start':
        if (this.startMenuSignal()?.length > 0) {
          menuItems = [
            { label: 'Iniciar (Principal)', icon: 'pi pi-bolt', command: () => this.startAction.emit() },
            { separator: true },
            ...this.startMenuSignal()
          ];
        }
        break;
      case 'more':
        menuItems = this.moreOptionsSignal() || [];
        break;
    }

    if (menuItems.length > 0) {
      this.contextMenuItems.set(menuItems);
      this.contextMenu.show(event);
    }
  }

  // Computed simplificado para speeddial - solo botones principales
  items = computed(() => {
    const speedDialItems: any[] = [];

    // Botón Nuevo
    if (this.showNewSignal()) {
      if (this.openNewMenuSignal()?.length > 0) {
        speedDialItems.push({
          icon: 'pi pi-plus',
          command: (event: any) => this.showContextMenu(event.originalEvent, 'new'),
          tooltip: 'Nuevo (con opciones)'
        });
      } else {
        speedDialItems.push({
          icon: 'pi pi-plus',
          command: () => this.newAction.emit(),
          tooltip: 'Nuevo'
        });
      }
    }

    // Botón Actualizar
    if (this.showRefreshSignal()) {
      if (this.getMenuSignal()?.length > 0) {
        speedDialItems.push({
          icon: 'pi pi-refresh',
          command: (event: any) => this.showContextMenu(event.originalEvent, 'refresh'),
          tooltip: 'Actualizar (con opciones)'
        });
      } else {
        speedDialItems.push({
          icon: 'pi pi-refresh',
          command: () => this.refreshAction.emit(),
          tooltip: 'Actualizar'
        });
      }
    }

    // Botón Editar
    if (this.showEditSignal()) {
      speedDialItems.push({
        icon: 'pi pi-pencil',
        command: () => this.editAction.emit(),
        tooltip: 'Editar',
        disabled: this.disable()
      });
    }

    // Botón Eliminar
    if (this.showDeleteSignal()) {
      speedDialItems.push({
        icon: 'pi pi-trash',
        command: () => this.deleteAction.emit(),
        tooltip: 'Eliminar',
        disabled: this.disable()
      });
    }

    // Botón Iniciar
    if (this.showStartSignal()) {
      if (this.startMenuSignal()?.length > 0) {
        speedDialItems.push({
          icon: 'pi pi-bolt',
          command: (event: any) => this.showContextMenu(event.originalEvent, 'start'),
          tooltip: 'Iniciar (con opciones)',
          disabled: this.disable()
        });
      } else {
        speedDialItems.push({
          icon: 'pi pi-bolt',
          command: () => this.startAction.emit(),
          tooltip: 'Iniciar',
          disabled: this.disable()
        });
      }
    }

    // Más opciones
    if (this.moreOptionsSignal()?.length > 0) {
      speedDialItems.push({
        icon: 'pi pi-ellipsis-v',
        command: (event: any) => this.showContextMenu(event.originalEvent, 'more'),
        tooltip: 'Más opciones'
      });
    }

    return speedDialItems;
  });
}
