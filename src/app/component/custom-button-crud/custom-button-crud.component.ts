import { Component, computed, EventEmitter, Input, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { SplitButton } from 'primeng/splitbutton';
import { ToolbarModule } from 'primeng/toolbar';
import { SpeedDialModule } from 'primeng/speeddial';

@Component({
  selector: 'app-custom-button-crud',
  imports: [CommonModule, ButtonModule, SplitButton, ToolbarModule, SpeedDialModule],
  templateUrl: './custom-button-crud.component.html',
  styleUrl: './custom-button-crud.component.scss',
  standalone: true
})
export class CustomButtonCrudComponent {

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


  items = [
    {
      icon: 'pi pi-pencil',
      command: () => {
        //this.messageService.add({ severity: 'info', summary: 'Add', detail: 'Data Added' });
      }
    },
    {
      icon: 'pi pi-refresh',
      command: () => {
        //this.messageService.add({ severity: 'success', summary: 'Update', detail: 'Data Updated' });
      }
    },
    {
      icon: 'pi pi-trash',
      command: () => {
        //this.messageService.add({ severity: 'error', summary: 'Delete', detail: 'Data Deleted' });
      }
    },
    {
      icon: 'pi pi-upload',
      routerLink: ['/fileupload']
    },
    {
      icon: 'pi pi-external-link',
      target: '_blank',
      url: 'https://angular.dev'
    }
  ];


}
