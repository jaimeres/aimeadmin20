
import { Component, EventEmitter, Input, Output, signal, SimpleChanges } from '@angular/core';
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
  //@Output() helpAction = new EventEmitter<void>();
  //@Output() helpVideoAction = new EventEmitter<void>();

  @Input() config: any = null;


  public save = signal(true);
  public saveNotHide = signal(true);
  public resetForm = signal(true);
  public cancel = signal(true);
  //public help = signal(true);
  //public helpVideo = signal(true);

  // Configuración de botones con valores por defecto
  public buttonConfig = signal({
    save: {
      hide: false,
      label: 'Guardar y cerrar',
      icon: '',
      severity: 'secondary' as 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast' | null | undefined
    },
    cancel: {
      hide: false,
      label: 'Cancelar',
      icon: '',
      severity: 'danger' as 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast' | null | undefined
    },
    save_no_hide: {
      hide: false,
      label: 'Guardar y nuevo',
      icon: '',
      severity: 'secondary' as 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast' | null | undefined
    },
    reset: {
      hide: false,
      label: 'Limpiar',
      icon: '',
      severity: 'warn' as 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast' | null | undefined
    },
    help: {
      hide: true,
      label: 'Ayuda',
      icon: 'pi pi-question-circle',
      severity: 'help' as 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast' | null | undefined,
      url: ''
    },
    help_video: {
      hide: true,
      label: 'Video',
      icon: 'pi pi-youtube',
      severity: 'danger' as 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast' | null | undefined,
      url: ''
    }
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && changes['config'].currentValue) {
      this.applyButtonConfig(changes['config'].currentValue);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      //|||pienso que con la nueva configuración de los botones ya no es necesario esto
      this.save.set(this.saveAction.observed);
      this.saveNotHide.set(this.saveNotHideAction.observed);
      this.resetForm.set(this.resetFormAction.observed);
      this.cancel.set(this.cancelAction.observed);
      //this.help.set(this.helpAction.observed);
      //this.helpVideo.set(this.helpVideoAction.observed);
    });
    // Se mete al setTimeout para eviatr el error //ERROR Error: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'true'. 
    //Current value: 'false'. Expression location: CustomButtonFooterComponent component. Find more at https://angular.io/errors/NG0100
  }

  /**
   * Aplica la configuración personalizada a los botones
   * @param config Configuración recibida desde el componente padre
   */
  private applyButtonConfig(config: any): void {
    if (!config || typeof config !== 'object') return;

    const buttons_crud = config?.buttons_crud

    const currentConfig = this.buttonConfig();
    const newConfig = { ...currentConfig };

    // Procesar cada botón en la configuración
    Object.keys(buttons_crud).forEach((buttonKey: string) => {
      if (newConfig.hasOwnProperty(buttonKey)) {
        const buttonSettings = buttons_crud[buttonKey];

        // Aplicar hide si está definido
        if (buttonSettings.hasOwnProperty('hide')) {
          newConfig[buttonKey as keyof typeof newConfig].hide = buttonSettings.hide;
        }

        // Aplicar label si está definido
        if (buttonSettings.hasOwnProperty('label')) {
          newConfig[buttonKey as keyof typeof newConfig].label = buttonSettings.label;
        }

        // Aplicar icon si está definido
        if (buttonSettings.hasOwnProperty('icon')) {
          newConfig[buttonKey as keyof typeof newConfig].icon = buttonSettings.icon;
        }

        // Aplicar severity si está definido
        if (buttonSettings.hasOwnProperty('severity')) {
          newConfig[buttonKey as keyof typeof newConfig].severity = buttonSettings.severity;
        }
      }
    });

    this.buttonConfig.set(newConfig);
    console.log('🔧 Configuración de botones aplicada:', newConfig);
  }

  help() {
    //abrir dialogo con documento de ayuda de jukai o usuario previamente revisado
  }

  helpVideo() {
    //redirigir a la url de youtube de la pagina de jukai.io
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
