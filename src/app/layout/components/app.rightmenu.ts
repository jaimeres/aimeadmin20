import { Component, inject } from '@angular/core';
import { LayoutService } from '@/layout/service/layout.service';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: '[app-right-menu]',
  standalone: true,
  imports: [DrawerModule, FormsModule],
  template: `<p-drawer [(visible)]="rightMenuActive" position="right">
    <ng-template #headless>
      
    </ng-template>
  </p-drawer>`
})
export class AppRightMenu {
  layoutService = inject(LayoutService);

  get rightMenuActive(): boolean {
    return this.layoutService.layoutState().rightMenuActive;
  }

  set rightMenuActive(_val: boolean) {
    this.layoutService.layoutState.update((prev) => ({ ...prev, rightMenuActive: _val }));
  }
}
