import { Component, signal } from '@angular/core';
import { MessageService } from '../services/message.service';
import { BlockUIModule } from 'primeng/blockui';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-blocked',
  imports: [BlockUIModule, ProgressSpinnerModule],
  templateUrl: './blocked.component.html',
  styleUrl: './blocked.component.scss',
  standalone: true,
})
export class BlockedComponent {

  public visible = signal<boolean>(true);
  constructor(private messageS: MessageService,) { }

  ngOnInit() {
    //console.log('BlockedComponent..............');

    this.messageS.currentShowBlocked.subscribe((visible: boolean) => {
      this.visible.set(visible);
    });
  }

}
