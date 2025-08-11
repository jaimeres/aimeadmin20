import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
export const PRIME_MODULES = [
  ReactiveFormsModule,
  FormsModule,
  CommonModule,
  CardModule,
  DialogModule,
  TabsModule,
];
export { ConfirmationService } from 'primeng/api';
