import { Component, inject } from '@angular/core';
import { MonthlyComparisonWidget } from '@/pages/dashboard/analytics/components/monthlycomparisonwidget';
import { InsightsWidget } from '@/pages/dashboard/analytics/components/insightswidget';
import { MessageService } from '../../../components/services/message.service';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  //StatsWidget, StoresWidget, TopSearchesWidget, AnalyticsTableWidget, ExpensesWidget, RatingsWidget
  imports: [MonthlyComparisonWidget, InsightsWidget, DialogModule, EditorModule],
  styles: `

:host ::ng-deep .p-dialog .p-dialog-header {
  padding-left: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  background-color: #a12840;
}

:host ::ng-deep .p-dialog .p-dialog-content {
  padding: 0;
}





/* Header tipo nota (puedes ocultarlo si quieres más realismo) */
:host ::ng-deep .note-dialog .p-dialog-header {
  background: #f6d365;
  border: none;
  font-weight: bold;
}

/* Contenido sin padding */
:host ::ng-deep .note-dialog .p-dialog-content {
  padding: 0;
  background: #fff3a0;
}

/* Contenedor tipo nota */
.note-container {
  background: #fff3a0;
  height: 100%;
  padding: 0;
  box-shadow: 2px 4px 10px rgba(0,0,0,0.2);
  font-family: 'Segoe UI', sans-serif;
}

/* Editor ocupa todo el espacio */
:host ::ng-deep .note-container .p-editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:host ::ng-deep .note-container .p-editor-content {
  flex: 1;
  min-height: 150px;
}

/* Toolbar más minimalista */
:host ::ng-deep .p-editor-toolbar {
  background: #ffe066;
  border: none;
}




  `,
  template: `<div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 md:col-span-8">
      <monthly-comparison-widget />
    </div>
    <div class="col-span-12 md:col-span-4">
      <insights-widget />
    </div>
    <!--<stats-widget />
    <div class="col-span-12 md:col-span-12">
      <stores-widget />
    </div>
    <div class="col-span-12 md:col-span-6">
      <top-searches-widget />
    </div>
    <div class="col-span-12 md:col-span-6">
      <analytics-table-widget />
    </div>
    <div class="col-span-12 md:col-span-4">
      <expenses-widget />
    </div>
    <div class="col-span-12 md:col-span-8">
      <ratings-widget />
    </div>-->
  </div> 

  <p-dialog [visible]="true" closable="false" >
              <p-editor />
  </p-dialog>



              <p-dialog
              closable="false" 
  [visible]="true"
  [draggable]="true"
  [resizable]="false"
  [modal]="false"
  contentStyleClass="note-content"
  styleClass="note-dialog"
   [style]="{ width: '300px' }"
>
  <div class="note-container">
    <p-editor ></p-editor>
  </div>
</p-dialog>
  `
})
export class DashboardAnalytics {

  private messageS: MessageService = inject(MessageService); // para mostrar mensajes

  constructor() {
    this.messageS.showBlocked(false);
  }
}
