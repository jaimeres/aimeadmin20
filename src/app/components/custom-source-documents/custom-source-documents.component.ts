import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * [[[II ESC:057-54 DOC:docs/documents/2026-08-08-057-propuesta-compras-v3.md#escenario-54
 * Documentos INFERIORES que hoy alimentan la tabla derivada, cada uno con su
 * reversa.
 *
 * Existe porque elegir un documento origen dispara una acción que cambia el
 * formulario y no dejaba rastro: no había forma de saber qué se había cargado
 * ni de retirarlo sin borrar fila por fila.
 *
 * NO conoce compras ni ningún recurso: recibe una lista ya derivada de las
 * filas y avisa cuál se quiere retirar. Quien la arma es `ConversionCRUD`, que
 * es donde vive el contrato `sources`.
 * ]]]FI
 */
@Component({
  selector: 'app-custom-source-documents',
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './custom-source-documents.component.html',
  // El host es un bloque de alto natural: sin esto hereda el `display` del sitio
  // donde se inserte y puede estirarse dentro de un contenedor flex.
  styles: [':host { display: block; }'],
  standalone: true,
})
export class CustomSourceDocumentsComponent {

  /** `{ field, id, label, rows }` por documento cargado. */
  @Input() documents: { field: string; id: any; label: string; rows: number }[] = [];

  /** Retirar un documento completo: se van sus filas y ninguna otra. */
  @Output() removeDocument = new EventEmitter<{ field: string; id: any }>();

  trackById = (_: number, document: { id: any }) => document?.id;
}
