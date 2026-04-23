import { Component } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';

@Component({
  selector: 'app-popup',
  imports: [DialogModule, EditorModule],
  standalone: true,
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
})
export class PopupComponent {

  noteVisible: boolean = true;
  onNewNote() {
  }

}
