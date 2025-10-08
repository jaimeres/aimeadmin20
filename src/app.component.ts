import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BlockUIModule } from 'primeng/blockui';
import { SkeletonModule } from 'primeng/skeleton';
import { CommonModule } from '@angular/common';
import { UpdateDialogComponent } from './app/components/update-dialog/update-dialog.component';
import { UpdateManagerService } from './app/utils/services/update-manager.service';
import { UpdateCheckResult } from './app/utils/services/update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    BlockUIModule,
    SkeletonModule,
    CommonModule,
    UpdateDialogComponent
  ],
  template: `
    <router-outlet></router-outlet>
    
    <!-- Diálogo de actualización -->
    <app-update-dialog
      [(visible)]="showUpdateDialog"
      [updateResult]="currentUpdateResult"
      [currentVersion]="currentVersion"
      [isOffline]="isOffline"
      [downloadProgress]="downloadProgress"
      [isDownloading]="isDownloading"
      (updateClicked)="handleUpdateClick()"
      (laterClicked)="handleLaterClick()"
      (skipOfflineClicked)="handleSkipOfflineClick()">
    </app-update-dialog>
  `
})
export class AppComponent implements OnInit, OnDestroy {

  showUpdateDialog = false;
  currentUpdateResult: UpdateCheckResult | null = null;
  currentVersion = '';
  isOffline = false;
  downloadProgress = 0;
  isDownloading = false;

  constructor(
    private updateManager: UpdateManagerService
  ) { }

  async ngOnInit() {
    // Inicializar el sistema de actualizaciones
    await this.updateManager.initialize();

    // Suscribirse a los observables del UpdateManager
    this.updateManager.updateDialogVisible.subscribe(visible => {
      this.showUpdateDialog = visible;
    });

    this.updateManager.currentUpdateResult.subscribe(result => {
      this.currentUpdateResult = result;
    });

    this.updateManager.currentVersion.subscribe(version => {
      this.currentVersion = version;
    });

    this.updateManager.isOffline.subscribe(offline => {
      this.isOffline = offline;
    });
  }

  ngOnDestroy() {
    // Limpiar recursos
    this.updateManager.destroy();
  }

  async handleUpdateClick() {
    this.isDownloading = true;
    try {
      await this.updateManager.handleUpdateClick();
    } finally {
      this.isDownloading = false;
    }
  }

  async handleLaterClick() {
    await this.updateManager.handleLaterClick();
  }

  handleSkipOfflineClick() {
    this.updateManager.handleSkipOfflineClick();
  }
}