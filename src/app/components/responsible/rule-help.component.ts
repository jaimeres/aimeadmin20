import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';

/**
 * Diálogo de ayuda para el editor de reglas de responsables.
 * Único punto donde vive la guía para usuarios; lo consumen tanto
 * `app-responsible` (regla) como `app-responsible-action` (acción).
 *
 * Uso:
 *   <app-rule-help [(visible)]="helpOpen" [mode]="'rule'"></app-rule-help>
 */
@Component({
  selector: 'app-rule-help',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogModule, TabsModule, ButtonModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [dismissableMask]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      header="Reglas de responsables — guía rápida"
      styleClass="rule-help-dialog"
      [style]="{ width: '92vw', maxWidth: '880px' }">

      <p-tabs [value]="mode === 'action' ? 1 : 0" scrollable>
        <p-tablist>
          <p-tab [value]="0"><i class="pi pi-info-circle mr-2"></i>Conceptos</p-tab>
          <p-tab [value]="1"><i class="pi pi-bolt mr-2"></i>Reglas</p-tab>
          <p-tab [value]="2"><i class="pi pi-users mr-2"></i>Acciones</p-tab>
          <p-tab [value]="3"><i class="pi pi-list mr-2"></i>Operadores</p-tab>
          <p-tab [value]="4"><i class="pi pi-shield mr-2"></i>Reglas de oro</p-tab>
          <p-tab [value]="5"><i class="pi pi-exclamation-triangle mr-2"></i>Errores</p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- 0. CONCEPTOS -->
          <p-tabpanel [value]="0">
            <h4>¿Para qué sirven?</h4>
            <p>
              Las reglas de responsables asignan <strong>automáticamente</strong>
              personas, clientes o proveedores a un mantenimiento, en lugar de capturarlos
              uno por uno. Tú defines: <em>"cuando suceda X, asigna a Y como responsable"</em>.
            </p>
            <p>Una regla tiene dos partes:</p>
            <ul>
              <li><strong>La regla</strong> (pestaña <em>Editar regla de responsable</em>): define <strong>CUÁNDO</strong> se activa.</li>
              <li><strong>Las acciones</strong> (pestaña <em>Alta de acción de regla</em>): definen <strong>QUIÉN</strong> se asigna cuando se activa.</li>
            </ul>
            <p>
              Una regla puede tener varias acciones (por ejemplo: una para asignar al
              supervisor y otra al técnico).
            </p>
          </p-tabpanel>

          <!-- 1. REGLAS -->
          <p-tabpanel [value]="1">
            <h4>Paso 1 — Crear la regla</h4>
            <p>Campos obligatorios:</p>
            <ul>
              <li><strong>Código</strong> y <strong>Nombre</strong>: identifican la regla.</li>
              <li><strong>Tipo de regla</strong>: por ahora solo está disponible <em>Mantenimiento</em>. No se puede cambiar después si la regla ya tiene acciones.</li>
              <li><strong>Prioridad</strong>: número entero. Menor número = mayor prioridad. Cuando dos reglas aplican al mismo mantenimiento, la de menor número se evalúa primero.</li>
              <li><strong>Activo</strong>: sí / no.</li>
            </ul>

            <h4>Paso 2 — Definir las Condiciones</h4>
            <p>Aquí decides <strong>cuándo</strong> se dispara la regla. Tienes dos modos:</p>
            <ul>
              <li><strong>Visual</strong> (recomendado): armas un árbol con cuadros y selectores. No necesitas saber JSON.</li>
              <li><strong>JSON</strong> (avanzado): editas el texto plano. Útil para copiar/pegar entre reglas.</li>
            </ul>
            <p>Tipos de nodo del árbol:</p>
            <ul>
              <li><strong>Simple</strong> — una sola condición: campo → operador → valor. Ej.: "Empresa del activo es Empresa Demo".</li>
              <li><strong>AND (todas)</strong> — todas las condiciones hijas deben cumplirse.</li>
              <li><strong>OR (al menos una)</strong> — basta con que una hija se cumpla.</li>
            </ul>
            <p class="rh-tip">
              <i class="pi pi-info-circle mr-1"></i>
              Si dejas las condiciones <strong>vacías</strong>, la regla aplica siempre.
            </p>
          </p-tabpanel>

          <!-- 2. ACCIONES -->
          <p-tabpanel [value]="2">
            <h4>Paso 3 — Crear las acciones</h4>
            <p>Cada acción contesta <em>"cuando la regla se cumple, ¿a quién asigno?"</em>.</p>
            <p>Campos obligatorios:</p>
            <ul>
              <li><strong>Regla</strong>: la regla a la que pertenece.</li>
              <li><strong>Responsable</strong>: el rol que se va a asignar (Supervisor, Técnico, etc.). El sistema sólo te muestra los responsables del tipo Mantenimiento.</li>
              <li><strong>Prioridad</strong> y <strong>Activo</strong>: igual que en la regla.</li>
            </ul>

            <p>El campo <strong>Acción</strong> define quiénes se asignan. Tiene dos secciones independientes (puedes usar una, otra o ambas):</p>

            <h5>A) Asignación fija</h5>
            <p>Eliges manualmente uno o varios:</p>
            <ul>
              <li><strong>Usuarios del sistema</strong> (users)</li>
              <li><strong>Clientes</strong> (customers)</li>
              <li><strong>Proveedores</strong> (suppliers)</li>
            </ul>
            <p>Esos quedan asignados <em>sí o sí</em> cuando la regla aplique.</p>

            <h5>B) Auto-usuarios (consulta dinámica)</h5>
            <p>
              En lugar de elegir personas a mano, defines <strong>filtros</strong> sobre
              los usuarios del sistema. Cada vez que la regla aplique, el sistema busca en
              ese momento los usuarios que cumplen y los asigna.
            </p>
            <p class="rh-example">
              <strong>Ejemplo:</strong> "asigna a todos los empleados del Departamento
              Mantenimiento cuya hora de entrada sea antes de las 08:00".
            </p>
            <p>
              Los filtros se combinan con <strong>AND</strong> (todos deben cumplirse).
              Cada filtro es: <em>campo → operador → valor</em>.
            </p>
            <p>
              <strong>Operador especial</strong> <em>igual a campo del contexto</em>:
              compara un dato del usuario contra un dato del activo. Por ejemplo
              "sucursales del usuario igual a sucursales del activo" asigna sólo a los
              usuarios que comparten sucursal con el activo del mantenimiento.
            </p>

            <h4>Paso 4 — Probar</h4>
            <ol>
              <li>Activa la regla.</li>
              <li>Crea o edita un mantenimiento que cumpla las condiciones.</li>
              <li>Verás aparecer los responsables automáticamente con origen <strong>"Regla"</strong>. Los que pongas a mano siguen apareciendo con origen <strong>"Manual"</strong>.</li>
            </ol>
          </p-tabpanel>

          <!-- 3. OPERADORES -->
          <p-tabpanel [value]="3">
            <h4>Operadores más comunes</h4>
            <p>Solo verás los operadores que aplican al campo elegido (los demás se ocultan).</p>
            <table class="rh-ops">
              <thead>
                <tr><th>Operador</th><th>Significado</th><th>Cómo se llena el valor</th></tr>
              </thead>
              <tbody>
                <tr><td>igual a</td><td>el campo es exactamente ese valor</td><td>un valor</td></tr>
                <tr><td>está en la lista</td><td>el campo es uno de los valores</td><td>varios valores</td></tr>
                <tr><td>intersecta con lista</td><td>hay al menos un elemento en común</td><td>varios valores</td></tr>
                <tr><td>el campo existe</td><td>tiene cualquier valor (no vacío)</td><td>sin valor</td></tr>
                <tr><td>mayor o igual / menor o igual</td><td>comparación numérica/fecha</td><td>un valor</td></tr>
                <tr><td>entre</td><td>rango cerrado</td><td>mín y máx</td></tr>
                <tr><td>igual a campo del contexto</td><td>compara contra otro dato del activo (p. ej. "empresa del usuario creador = empresa del activo")</td><td>otro campo del catálogo</td></tr>
              </tbody>
            </table>
          </p-tabpanel>

          <!-- 4. REGLAS DE ORO -->
          <p-tabpanel [value]="4">
            <h4>Reglas de oro</h4>
            <ul>
              <li>Si cambias las <strong>condiciones</strong> de una regla, <strong>NO se recalculan</strong> los responsables ya asignados a mantenimientos viejos. Solo aplica a partir del próximo evento.</li>
              <li>Si <strong>borras una acción</strong>, los responsables que esa acción había agregado se conservan en los mantenimientos existentes (no se borran retroactivamente).</li>
              <li>Una persona/proveedor/cliente <strong>no se duplica</strong>: si ya estaba asignado manualmente y la regla lo vuelve a agregar, se mantiene una sola fila (con el origen original).</li>
              <li>Antes de cambiar el <strong>Tipo de regla</strong>, debes borrar todas sus acciones. El sistema lo bloquea para evitar inconsistencias.</li>
              <li>Una regla con condiciones vacías aplica <strong>siempre</strong> — úsala con cuidado.</li>
            </ul>
          </p-tabpanel>

          <!-- 5. ERRORES -->
          <p-tabpanel [value]="5">
            <h4>Errores comunes</h4>
            <ul class="rh-errors">
              <li>
                <code>"El responsable es de tipo X pero la regla es de tipo MA"</code>
                <p>El responsable elegido pertenece a otro módulo. Elige uno cuyo nivel sea de Mantenimiento.</p>
              </li>
              <li>
                <code>"path no permitido"</code>
                <p>Estabas editando JSON crudo y usaste un campo que no está en el catálogo. Revisa el listado del modo Visual.</p>
              </li>
              <li>
                <code>"el campo X requiere valor de tipo lista"</code>
                <p>Operadores como <em>está en la lista</em> / <em>intersecta con lista</em> esperan varios valores, no uno solo.</p>
              </li>
            </ul>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <ng-template #footer>
        <p-button label="Cerrar" icon="pi pi-times" [text]="true" severity="secondary"
          (onClick)="close()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep .rule-help-dialog .p-dialog-content {
      padding: 0 1rem 1rem;
    }
    :host h4 { margin: 0.75rem 0 0.5rem; font-size: 1rem; }
    :host h5 { margin: 0.75rem 0 0.25rem; font-size: 0.9rem; }
    :host p, :host li { line-height: 1.45; font-size: 0.875rem; }
    :host ul, :host ol { padding-left: 1.25rem; margin: 0.25rem 0 0.75rem; }
    :host code {
      background: var(--surface-100);
      padding: 0.05rem 0.35rem;
      border-radius: 3px;
      font-size: 0.82rem;
    }
    :host .rh-tip,
    :host .rh-example {
      background: var(--surface-50);
      border-left: 3px solid var(--primary-color);
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      margin: 0.5rem 0;
    }
    :host table.rh-ops {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    :host table.rh-ops th,
    :host table.rh-ops td {
      border: 1px solid var(--surface-200);
      padding: 0.4rem 0.6rem;
      text-align: left;
      vertical-align: top;
    }
    :host table.rh-ops thead { background: var(--surface-100); }
    :host ul.rh-errors > li { margin-bottom: 0.6rem; }
    :host ul.rh-errors > li > p { margin: 0.15rem 0 0; color: var(--text-color-secondary); }
  `],
})
export class RuleHelpComponent {
  /** Pestaña inicial: 'rule' abre en "Reglas", 'action' abre en "Acciones". */
  @Input() mode: 'rule' | 'action' = 'rule';

  visible = false;

  open(): void { this.visible = true; }
  close(): void { this.visible = false; }
}
