import { Component, EventEmitter, inject, Input, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from '../services/message.service';
import { GeneralService } from '../../utils/services/general.service';
import { DocumentService } from '../services/document.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-custom-documents',
  imports: [CommonModule, TreeTableModule, ButtonModule, DialogModule, IconFieldModule, InputIconModule],
  templateUrl: './custom-documents.component.html',
  styleUrl: './custom-documents.component.scss'
})
export class CustomDocumentsComponent {

  /**
   * Contiene los registros de los documentos para las apps
   */
  public appDocuments = signal<any[]>([]);

  /**
   * Columnas de la tabla de documentos
  */
  public appDocumentColumns = signal<any[]>([
    { field: 'name', header: 'Nombre' },
    { field: 'is_active__text', header: 'Estatús' },
    //{ field: 'expiration', header: 'Vencimiento' },
    { field: 'start_date', header: 'Inicio' },
    { field: 'end_date', header: 'Fin' }
  ]);

  public loadingAppDocument = signal<boolean>(false);
  private messageS = inject(MessageService);
  private generalS = inject(GeneralService);
  private crudS = inject(DocumentService);
  private sanitizer = inject(DomSanitizer);

  @Output() loadAction = new EventEmitter<void>();
  @Output() newAction = new EventEmitter<void>();
  @Output() deleteDocumentAction = new EventEmitter<any>();
  @Output() detachDocumentAction = new EventEmitter<void>();

  @Input() selected: any[] = []; // elemento seleccionado
  @Input() type: string = ''; // tipo de objeto que se va a consultar
  @Input() app: string = ''; // app que se va a consultar
  @Input() filter: string = ''; // el pk por el cual se va a filtrar
  // [[[II ESC:024-14 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-14
  @Input() active = true;
  @Input() showNew = true;
  @Input() related = '';
  @Input() relatedType = '';
  // ]]]FI
  selectedSignal = signal<any>([]);

  ngOnChanges(changes: SimpleChanges) {

    if (changes['selected']) {
      this.selectedSignal.set(changes['selected'].currentValue || []);
    }
    // [[[II ESC:024-14 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-14
    if (!this.active) {
      this.appDocuments.set([]);
      return;
    }

    const shouldLoad = !!(
      changes['active'] ||
      changes['selected'] ||
      changes['type'] ||
      changes['app'] ||
      changes['filter'] ||
      changes['related'] ||
      changes['relatedType']
    );

    if (shouldLoad && this.selectedSignal()?.length > 0 && this.type && this.app && (this.filter || this.related)) {
      this.onLoadNodesDocuments();
    } else if (shouldLoad && (this.selectedSignal()?.length || 0) <= 0) {
      this.appDocuments.set([]);
    }
    // ]]]FI
  }

  /**
 * Contiene el archivo ya descargado y convertido a blob
 */
  public blobDocument = signal<SafeResourceUrl>('');

  /** 
   * muestra u oculta el dialogo para los documentos
   */
  public documentDialogVisible: boolean = false;

  /**
   *  Muestra el documento en un dialogo
   * @param item documento a mostrar
  */
  onShowDocument(url: string) {

    //llama al documento y lo muestra en un dialogo
    this.crudS.getFile({ url }).subscribe({
      next: (resp: any) => {
        // se regresa un blob, se zanitiza para que no se bloquee por seguridad
        const url = window.URL.createObjectURL(resp);
        this.blobDocument.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      },
      error: (err: any) => {
        this.messageS.changeMessage(`Hay un error al cargar los documentos.`,
          err, []/*this.customFieldSignal()*/);
      }
    });
    // abre el dialogo
    this.documentDialogVisible = true;
  }

  onLoadNodesDocuments() {

    if (!this.selectedSignal()[0]) {
      return
    }

    this.loadingAppDocument.set(true);
    // [[[II ESC:024-16 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-16
    if (this.related) {
      this.crudS.getRelated({
        id: this.selectedSignal()[0].id,
        app: this.app,
        type: this.relatedType || this.type,
        related: this.related,
        fields: 'name,file,is_active,created_at,modified_at,',
      }).subscribe({
        next: (resp: any) => {
          resp = this.generalS.DJAtoObject({ respDJA: resp, node: true })
            .map((node: any) => ({
              ...node,
              leaf: true,
              data: { ...(node.data || {}), __directDocumentFile: true },
            }));
          this.loadingAppDocument.set(false);
          this.appDocuments.set([...resp]);
        },
        error: (err: any) => {
          this.loadingAppDocument.set(false);
          this.messageS.changeMessage(`Hay un error al cargar los documentos.`,
            err, []);
        }
      });
      return;
    }
    // ]]]FI

    //aqui voy estoy revisando entre la consuta al servidor (no funciona) y el for que si funciona
    const filter = `filter[${this.filter}]=${this.selectedSignal()[0].id}`
    //llamo los documentos del elemento seleccionado
    this.crudS.getObject({ type: this.type, app: this.app, filter }).subscribe({
      next: (resp: any) => {
        resp = this.generalS.DJAtoObject({ respDJA: resp, node: true });
        this.loadingAppDocument.set(false);
        this.appDocuments.set([...resp]);
      },
      error: (err: any) => {
        this.loadingAppDocument.set(false);
        this.messageS.changeMessage(`Hay un error al cargar los documentos........`,
          err, []);
      }
    });
  }

  onNodeExpandDocuments(event: any) {

    const node = event.node;
    const url = event.node.data.relationships?.files?.links?.related;
    // [[[II ESC:024-16 DOC:docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md#escenario-16
    if (this.related || !url) return;
    // ]]]FI
    this.loadingAppDocument.set(true);

    this.crudS.getDetail({ url }).subscribe({
      next: (resp: any) => {
        node.children = this.generalS.DJAtoObject({ respDJA: resp, node: true });
        this.appDocuments.set([...this.appDocuments()]);
        this.loadingAppDocument.set(false);
      },
      error: (err: any) => {
        this.loadingAppDocument.set(false);
        this.messageS.changeMessage(`Hay un error al cargar los documentos.`,
          err, []);
      }
    });
  }

}
