import { Injectable } from '@angular/core';
import { CRUDService } from 'src/app/utils/services/crud.service';

@Injectable({
  providedIn: 'root'
})

export class TaskService extends CRUDService {

  constructor() {
    super();
    this.customField.update(current => {
      return {
        'task': {
          ...current,
          'priority': 'Prioridad',
          'status': 'Estado',
          'notification': 'Notificación',
          'notification_type': 'Tipo de notificación',
          'longitude': 'Longitud',
          'latitude': 'Latitud',
          'frequency': 'Frecuencia',
          'repeat_every': 'Repetir cada',
          'days_of_week': 'Días de la semana',
          'day_of_month': 'Día del mes',
          'week_of_month': 'Semana del mes',
          'day_of_week_in_month': 'Día de la semana en el mes',
          'month_of_year': 'Mes del año',
          'start_date': 'Fecha de inicio',
          'end_date': 'Fecha de fin',
          'repeat_count': 'Repetir conteo',
          'no_end_date': 'Sin fecha de fin',
          'action_app': 'Aplicación de acción',
          'module': 'Módulo',
          'allows_finish': 'Permite finalizar',
          'due_date': 'Fecha de vencimiento',
          'scheduled_date': 'Fecha programada',
          'is_detail_required': 'Detalle requerido',
          'responsible_persons': 'Personas responsables',
          'responsible_suppliers': 'Proveedores responsables',
          'responsible_customers': 'Clientes responsables',
          'addresses': 'Direcciones',

          "REGION": "REGION",
          "PLAZA": "PLAZA",
          "FECHA": "FECHA",
          "EQUIPO": "EQUIPO",
          "TIPO_BOMBA": "TIPO DE BOMBA",
          "NUMERO ECONOMICO": "NUMERO ECONOMICO",
          "PLACA DELANTERA": "PLACA DELANTERA",
          "PLACA TRASERA": "PLACA TRASERA",
          "HOROMETRO": "HOROMETRO",
          "KILOMETRAJE": "KILOMETRAJE",



        }
      }
    });
  }

}
