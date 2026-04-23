import { Component, inject } from '@angular/core';
import { MonthlyComparisonWidget } from '@/pages/dashboard/analytics/components/monthlycomparisonwidget';
import { InsightsWidget } from '@/pages/dashboard/analytics/components/insightswidget';
import { MessageService } from '../../../components/services/message.service';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { ButtonModule } from 'primeng/button';
import { PopupComponent } from '../../../tasks/popup/popup.component';

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  //StatsWidget, StoresWidget, TopSearchesWidget, AnalyticsTableWidget, ExpensesWidget, RatingsWidget
  imports: [MonthlyComparisonWidget, InsightsWidget, DialogModule, EditorModule, ButtonModule, PopupComponent],
  styles: `


  


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

<app-popup></app-popup>

  `
})
export class DashboardAnalytics {

  private messageS: MessageService = inject(MessageService); // para mostrar mensajes

  constructor() {
    this.messageS.showBlocked(false);
  }


}
