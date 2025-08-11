import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-custom-actions-selection',
  imports: [DialogModule],
  templateUrl: './custom-actions-selection.component.html',
  styleUrl: './custom-actions-selection.component.scss',
  standalone: true
})
export class CustomActionsSelectionComponent {

  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();


  onHide(e: any) {
    this.visibleChange.emit(false);
  }

}
