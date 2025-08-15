import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root'
})
export class AssetService extends CRUDService {

  constructor() {
    super();
    this.customField.update(current => {
      return {
        'maintenance': {
          ...current,

          asset: 'Activo',
          start_date: 'Inicio',
          end_date: 'Fin',
          file_status: 'Estado documento',
          evidence: 'Evidencia',
          is_authorizable: 'Autorizable',
          responsible_persons: 'Responsables',
          responsible_customers: 'Clientes',
          responsible_suppliers: 'Proveedores',
          users_authorize: 'Usuarios autorizan',

          requester_type: 'Tipo solicitante',
          requester: 'Solicitante',
          scheduled_date: 'Programado',
          required_date: 'Requerido',
          expiration_date: 'Vencimiento',
          status: 'Estado',
          service_type: 'Tipo servicio',
          code: 'Código',
          priority: 'Prioridad',
          form: 'Formulario',
          responsibles: 'Responsable',
          assigned_to: 'Asignado a',
          service_location: 'Ubicación',
          spare_parts_status: 'Refacciones',
          used_tools: 'Herramientas',
          responsible_type: 'Tipo responsable',
          maintenance_document: 'Evidencia',
          maintenance_document_data_file_type: 'Tipo documento',
          file_type: 'Tipo documento',
        },
        'asset': {
          ...current,
          model: 'Modelo',
          brand: 'Marca',
          color: 'Color',
          serial_number: 'Número serie',
          economic_number: 'Económico',
          cost_center: 'Centro costo',
          phone_number: 'Teléfono',
          is_leasing: 'Propiedad',
          is_leasing_true: 'Arrendado',
          is_leasing_false: 'Propia',

          asset: 'Activo',
          file_type: 'Tipo documento',
          file: 'Documento',
          files: 'Documentos',
          start_date: 'Inicio',
          end_date: 'Fin',
          file_status: 'Estado documento',

          service_type: 'Tipo servicio',
          code: 'Código',
          priority: 'Prioridad',
          form: 'Formulario',
          responsibles: 'Responsable',
          assigned_to: 'Asignado a',
          service_location: 'Ubicación',
          spare_parts_status: 'Refacciones',

          vin: 'VIN',
          motor_number: 'Número motor',
          fuel_capacity: 'Combustible',
          rear_plate: 'Placa trasera',
          front_plate: 'Placa delantera',
          last_maintenance: 'Mantenimiento',
          capacity: 'Capacidad',
          imei: 'IMEI',
          iccid: 'ICCID',
          mac_address: 'Dirección MAC',
          // fk y falta la tabla other
          address: 'Dirección',
          capacity_type: 'Tipo capacidad',
          asset_type: 'Tipo activo',

          year: 'Año',

          users: 'Usuarios',
          asset_types: 'Tipos activo',
          assets: 'Activos',
          suppliers: 'Proveedores',
          customers: 'Clientes',
          classifier: 'Clasificador',
          classifier_level: 'Nivel clasificador',
          level: 'Nivel',
          all_classifiers: 'Clasificadores',
          all_classifiers_true: 'Todos los clasificadores',
          all_classifiers_false: 'No todos los clasificadores',
          subsidiary: 'Sucursales'
        },
        'asset-type': {
          ...current,

          requester_type: 'Tipo solicitante',
          requester: 'Solicitante',
          scheduled_date: 'Programado',
          required_date: 'Requerido',
          expiration_date: 'Vencimiento',
          status: 'Estado',
          service_type: 'Tipo servicio',
          code: 'Código',
          priority: 'Prioridad',
          form: 'Formulario',
          responsibles: 'Responsable',
          assigned_to: 'Asignado a',
          service_location: 'Ubicación',
          spare_parts_status: 'Refacciones',


          asset_types: 'Tipos activo',
          assets: 'Activos',

        },
        'capacity-type': {
          ...current,

          asset: 'Activo',
          file_type: 'Tipo documento',
          file: 'Documento',
          files: 'Documentos',
          start_date: 'Inicio',
          end_date: 'Fin',
          file_status: 'Estado documento',

          requester_type: 'Tipo solicitante',
          requester: 'Solicitante',
          scheduled_date: 'Programado',
          required_date: 'Requerido',
          expiration_date: 'Vencimiento',
          status: 'Estado',
          service_type: 'Tipo servicio',
          code: 'Código',
          priority: 'Prioridad',
          form: 'Formulario',
          responsibles: 'Responsable',
          assigned_to: 'Asignado a',
          service_location: 'Ubicación',
          spare_parts_status: 'Refacciones',

          users: 'Usuarios',
          asset_types: 'Tipos activo',

        },
        'asset-document-asset': {
          ...current,
        },
        'asset-document': {
          ...current,
          'start_date': 'Fecha inicio',
          'end_date': 'Fecha fin',
          'asset': 'Activo',
          'file_type': 'Tipo documento',
        },

        'accessory': {
          ...current,
        }
      }
    })
  }
}
