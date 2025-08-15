import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, SimpleChanges } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { UploadEvent } from 'primeng/fileupload';


@Component({
  selector: 'app-custom-import',
  imports: [DialogModule, ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './custom-import.component.html',
  styleUrl: './custom-import.component.scss',
  standalone: true
})
export class CustomImportComponent {

  public form: any;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      data: ["", Validators.required],
    });
  }


  @Output() visibleAction = new EventEmitter<boolean>();
  @Output() saveAction = new EventEmitter<any>();


  @Input() visible: boolean = false;
  @Input() field: any = {};


  public visibleSignal = signal<boolean>(false);

  ngOnChanges(changes: SimpleChanges) {
    //console.log('CustomTableComponent',changes);

    if (changes['visible']) {
      this.visibleSignal.set(changes['visible'].currentValue);
    }
  }


  onHide(e: any) {
    this.visibleAction.emit(false);
  }

  onUpload(event: UploadEvent) {
    alert('onUpload');
  }

  /*save() {
    if (this.form.valid) {
      this.saveAction.emit(this.form.value);
      //this.visibleSignal.set(false);
    } else {
      alert('Formulario inválido');
    }
  }

  resetForm() {
    this.form.reset();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }*/

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      console.error('No se seleccionó ningún archivo');
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const textContent = reader.result as string;

      try {
        // 👇 Asegúrate que el texto no tenga comillas dobles al inicio/final
        const cleanedText = textContent.trim();

        const parsed = JSON.parse(cleanedText);

        if (!Array.isArray(parsed.data)) {
          throw new Error("El campo 'data' no es un array");
        }

        this.saveAction.emit(parsed.data);
        //console.log('Objetos encontrados:', parsed.data);
      } catch (e) {
        console.error('Error al parsear el JSON:', e);
      }
    };

    reader.onerror = () => {
      console.error('Error al leer el archivo:', reader.error);
    };

    reader.readAsText(file);
  }



}
