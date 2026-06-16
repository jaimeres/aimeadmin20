import { Type } from '@angular/core';

/**
 * Registro centralizado de módulos que pueden ser invocados desde tareas.
 * Cada clave es el código de módulo que viene en action_app (ej: "RE", "GR").
 * El valor es una función que importa dinámicamente el componente correspondiente.
 *
 * Para agregar un nuevo módulo, solo hay que añadir una entrada aquí:
 *   'CODIGO': () => import('../ruta/al/componente').then(m => m.NombreComponent),
 */
export type TaskModuleEntry = () => Promise<Type<any>>;

export const TASK_MODULE_REGISTRY: Record<string, TaskModuleEntry> = {
  'RE': () => import('../purchases/request/request.component').then(m => m.RequestComponent),
  'GR': () => import('../catalogues/company/company.component').then(m => m.CompanyComponent),
  //WarehouseMovementComponent
  'EP': () => import('../warehouses/warehouse-movement/warehouse-movement.component').then(m => m.WarehouseMovementComponent),

  // [[[II ESC:024-09 Codigo reservado para abrir la tarea-detalle (General + Datos)
  // dentro de cualquier modulo consumidor cuando la tarea trae is_detail_required=true.
  // Ver docs/documents/2026-06-15_024_open-tasks-detail-render-child-form.md ]]]FI
  'TASK_DETAIL': () => import('../tasks/task-detail/task-detail.component').then(m => m.TaskDetailComponent),
};
