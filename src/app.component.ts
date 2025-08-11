import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BlockUIModule } from 'primeng/blockui';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, BlockUIModule, SkeletonModule],
  template: `<router-outlet></router-outlet> `
})
export class AppComponent { }