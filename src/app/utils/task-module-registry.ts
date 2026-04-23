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

};
