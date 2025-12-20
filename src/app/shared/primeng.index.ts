import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
export const PRIME_MODULES = [
  ReactiveFormsModule,
  FormsModule,
  CommonModule,
  CardModule,
  DialogModule,
  TabsModule,
  ConfirmDialogModule,
];
export { ConfirmationService } from 'primeng/api';
