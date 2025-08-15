
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';


@Component({
  selector: 'app-custom-button-footer',
  imports: [CommonModule, ButtonModule],
  templateUrl: './custom-button-footer.component.html',
  styleUrl: './custom-button-footer.component.scss',
  standalone: true
})
export class CustomButtonFooterComponent {
  @Output() saveAction = new EventEmitter<void>();
  @Output() saveNotHideAction = new EventEmitter<boolean>();
  @Output() resetFormAction = new EventEmitter<void>();
  @Output() cancelAction = new EventEmitter<void>();

  public save = signal(true);
  public saveNotHide = signal(true);
  public resetForm = signal(true);
  public cancel = signal(true);



  ngAfterViewInit() {
    setTimeout(() => {
      this.save.set(this.saveAction.observed);
      this.saveNotHide.set(this.saveNotHideAction.observed);
      this.resetForm.set(this.resetFormAction.observed);
      this.cancel.set(this.cancelAction.observed);
    });
    // Se mete al setTimeout para eviatr el error //ERROR Error: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'true'. 
    //Current value: 'false'. Expression location: CustomButtonFooterComponent component. Find more at https://angular.io/errors/NG0100
  }


  //no lo estoy utilizando dejo el código por si as aelanto me sirve
  //private screenSizeS = inject(ScreenSizeService);

  // Variables para controlar la visibilidad de los botones según el tamaño de la pantalla
  // showSingleButton: boolean = false;
  //showMultipleButtons: boolean = false;

  /*ngOnInit() {
     // Suscripción al servicio para recibir actualizaciones de tamaño de pantalla
    this.screenSizeS.getScreenSize().subscribe((width: number) => {
      this.detectScreenSize(width);
    });
  }
*/
  // Método para detectar el tamaño de la pantalla y determinar la visibilidad de los botones
  /* detectScreenSize(width: number) {
     console.log('detectScreenSize', width);
     
     this.showSingleButton = width <= 767;
     this.showMultipleButtons = width > 767;
   }
 */
  // onSaveClick() {
  //   this.saveAction.emit();
  // }

  // onSaveNotHideClick() {
  //   this.saveNotHideAction.emit(false);
  // }

  // onResetFormClick() {
  //   this.resetFormAction.emit();
  // }


  // onCancelClick() {
  //   this.cancelAction.emit();
  // }

}
