import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';

export const PRIME_MODULES = [
  ReactiveFormsModule,
  FormsModule,
  CommonModule,
  CardModule,
  DialogModule,
  TabsModule,
  ConfirmDialogModule,
  SelectModule,
  MessageModule,
  AvatarModule,
  AvatarGroupModule

];
export { ConfirmationService } from 'primeng/api';
