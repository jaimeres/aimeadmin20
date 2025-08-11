import { Injectable } from '@angular/core';
import { CRUDService } from '../../utils/services/crud.service';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService extends CRUDService {

  constructor() {
    super();
    this.customField.update(current => {
      return {
        'request-detail': {
          ...current,
          request_type: 'Tipo de solicitud',
          request_status: 'Estado de solicitud',
          rejection_comments: 'Comentarios de rechazo',
          group: 'Grupo',
          company: 'Empresa',
          subsidiary: 'Sucursal',
          warehouse: 'Almacén',
          section: 'Sección',
          rack: 'Rack',
          search_name: 'Búscar artículos',
          type_request: 'Tipo de solicitud',
          request: 'Solicitud',
          product: 'Producto',
          requested: 'Solicitado',
          delivered: 'Entregado',
          price: 'Precio',
          currency: 'Moneda',
          asset: 'Activo',
          supplier: 'Proveedor',

          folio: 'Folio',
          form: 'Forma',
          executed_budget: 'Ejercido',
          committed_budget: 'Comprometido',
          slots: 'Ubicación',
          is_manual: 'Manual',
          is_manual_false: 'Automático',
          is_manual_true: 'Manual',
          name: 'Descripción',
          product_variant: 'Variante de producto',
          comment: 'Comentarios',
          alternate_equivalent_product: 'Producto alternativo',

          persons: 'Personas',

          request_data_code: 'Código',
          request_data_folio: 'Folio',
          request_data_request_type: 'Tipo de solicitud',
          request_data_subsidiary: 'Sucursal',
          request_data_description: 'Descripción',
          request_data_delivery_date: 'Fecha entrega',
          request_data_maximum_delivery_date: 'Máxima de entrega',
          request_data_validate_maximum_delivery_date: 'Validar máxima de entrega',
          request_data_validate_maximum_delivery_date_false: 'No validar fecha',
          request_data_validate_maximum_delivery_date_true: 'Validar fecha',

          user_code: 'Código solicitado',
          user_name: 'Descripción solicitado',
          user_requested: 'Cantidad solicitada',
          user_price: 'Precio solicitado',
          user_delivery_date: 'Entrega solicitada',
          user_maximum_delivery_date: 'Máxima de entrega solicitada',
          user_validate_maximum_delivery_date: 'Validar máxima de entrega solicitada',
          user_validate_maximum_delivery_date_false: 'No validar fecha solicitada',
          user_validate_maximum_delivery_date_true: 'Validar fecha solicitada',
          user_form: 'Formulario solicitado',
          user_product: 'Producto solicitado',
          user_product_variant: 'Variante solicitada',
          user_alternate_equivalent_product: 'Producto solicitado',
          user_currency: 'Moneda solicitada',
          user_asset: 'Activo solicitado',
          user_supplier: 'Proveedor solicitado',
          user_subsidiary: 'Sucursal solicitada',
          user_warehouse: 'Almacén solicitado',
          user_section: 'Sección solicitada',
          user_rack: 'Rack solicitado',
          user_slots: 'Ubicación solicitada',

        },
        'warehouse-output': {
          'person': 'Persona',
        }
      }
    }




    );
  }
}