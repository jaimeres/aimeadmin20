import { Component, OnInit, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { CRUD } from 'src/app/utils/crud.class';
import { ConfirmationService, PRIME_MODULES } from 'src/app/shared/primeng.index';
import { SelectModule } from 'primeng/select';
import { TaskService, } from '../services/task.service';
import { LOCAL_BASE } from '../../shared/components.index';
import { Validators } from '@angular/forms';

@Component({
  selector: 'app-task',
  imports: [
    SelectModule,
    ...PRIME_MODULES,
    ...LOCAL_BASE,
  ],
  providers: [ConfirmationService],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss',
  standalone: true,
})
export class TaskComponent extends CRUD implements OnInit {

  public override openNewMenu = signal<MenuItem[]>([{
    label: 'Tarea',
    command: () => this.openNew({ pos: 'task' })
  },
  ]);

  // consultas
  public override getMenu = signal<MenuItem[]>([{
    label: 'Tarea',
    command: () => this.getAll({ pos: 'task' })
  },
  ]);

  constructor(crudS: TaskService) {
    super(crudS, 'task');
  }

  ngOnInit(): void {

    //Inicializa los valores por defecto para completar las funciones crud del servicio
    this.typeDefault = 'task';
    this.app[this.typeDefault] = 'tasks/task';
    this.fields[this.typeDefault] = 'is_detail_required,child_form_fields,';
    this.module[this.typeDefault] = 'TA';

    this.app['task-detail'] = 'tasks/task-detail';
    this.module['task-detail'] = 'TAD';

    this.app['task-detail'] = 'tasks/task-detail';
    this.module['task-detail'] = 'TAD';

    this.initCRUD();
  }


  /* styleDetailClassDialog = signal<string>('width-650px-custom min-height-550px-custom');
   headerDetailDialog = signal<string>('Detalles de la Tarea');
   childFormFields = signal<any>({});
 
   openTasksDetail1() {
 
     const tasksDetailSelect = this.selected()[0];
     if (!tasksDetailSelect) {
       this.messageS.changeMessage('Seleccione una tarea que requiera detalle.', null, {}, 'info');
       return;
     }
 
     if (!tasksDetailSelect.is_detail_required) {
       this.messageS.changeMessage('La tarea seleccionada no requiere detalle.', null, {}, 'info');
       return;
     }
 
     const pos: any = 'task-detail';
 
     this.headerDetailDialog.set(`${tasksDetailSelect.name || 'etalles de la Tarea'}`);
 
     if (!this.formTempo[pos]) {
       this.showBlocked();
       this.crudS.options('tasks/task-detail').subscribe({
         next: (resp: any) => {
           this.optionsFields[pos] = resp.data.actions.POST;
           this.formTempo[pos] = this.generateJSONform(this.optionsFields[pos], pos);
 
           //recorre tasksDetailSelect.child_form_fields y asigna los valores al formTempo
           if (tasksDetailSelect.child_form_fields) {
             const childFields = tasksDetailSelect.child_form_fields;
 
             // Verifica si el primer elemento es 'grid' o 'nested'
             const firstKey = Object.keys(childFields)[0];
             let fieldsContainer = childFields;
 
             if (firstKey === 'grid' || firstKey === 'nested') {
               fieldsContainer = childFields[firstKey];
             }
 
             // Recorre todos los objetos y agrega controles dinámicamente
             Object.keys(fieldsContainer).forEach(key => {
               const fieldData = fieldsContainer[key];
 
               // Toma directamente el field del diccionario
               if (fieldData && fieldData.field) {
 
                 const active = fieldData?.default?.active || false;
                 const value = fieldData?.default?.value || null;
                 let defaultValue = value;
                 const edit = fieldData?.default?.edit || false;
                 if (active && edit) {
                   if (value == 'device') {
                     defaultValue = new Date();
                   }
                 }
                 const disabled = fieldData.readonly || false;
                 const validators: any[] = [];
 
                 // Agrega validadores si es requerido
                 if (fieldData.required) {
                   validators.push(Validators.required);
                   //max_length
                   if (fieldData.max_length) {
                     validators.push(Validators.maxLength(fieldData.max_length));
                   }
                   if (fieldData.min_length) {
                     validators.push(Validators.minLength(fieldData.min_length));
                   }
                 }
 
                 // Agrega directamente al FormGroup principal
                 this.isCreate = true;
                 (this.formTempo[pos] as any).addControl(
                   fieldData.field,
                   this.fb.control(
                     { value: defaultValue, disabled: disabled },
                     { nonNullable: true, validators: validators }
                   )
                 );
               }
             });
           }
 
           (this.formTempo[pos] as any).get('task').setValue(tasksDetailSelect?.id)
           this.form.set(this.formTempo);
           this.showBlocked(false);
           this.formDialogVisible[pos] = true;
 
         }
       });
     } else {
       this.formDialogVisible[pos] = true;
     }
 
     this.childFormFields.set(tasksDetailSelect.child_form_fields || {});
 
   }*/
}



/*

4. type de debe contener uno de los siguientes valores: input-text, select-button, dropdown, tree-select, input-number, auto-complete, toggle-button, json, textarea, signature, table, date, time, multi-select(para files)

 genera el eschema de name2, short_name y is_active con las siguientes caracteristicas marca explicitamente con simboslos ######### lo que se esta agregando al cascaron,
 de como que pueda ver como lo estas agregando y en que partes
genera un schema de la libreria jsonschema  donde todos los campos son obligatorios pero algunos puede venir vacios
1. Los boleanos tiene que traer valor
2. class, class_md, description.name, description.height, description.slice, description.border, description.caracter_slice pueden venir vacios
3. default.value puede venir vacio o null
4. type de debe ser input-text
5. cols.label, label y field no debe ser nulo ni vacio
6. no se debe permitir ningun otro campo adicional que no este en el schema
7. max_length y min_length deben ser enteros y obligatorios

{
  'required': False, 
  'class': 'col-span-6', 
  'class_md': 'md:col-span-2', 
  'hide': False, 
  'type': 'input-text', 
  'autofocus': False, 
  'default': {
    'active': False, 
    'value': '', 
    'edit': True
  }, 
  'readonly': False, 
  'max_length': 0,
  'min_length': 0, 
  'description': {
    'active': False, 
    'name': '', 
    'height': '60px', 
    'slice': '100', 
    'caracter_slice': '...', 
    'border': ''
    }, 
    'cols': {
      'hide': True, 
      'label': 'Nombre secundario', 
      'sortable': True, 
      'locked': False
    }
}


genera un schema de la libreria jsonschema  donde todos los campos son obligatorios pero algunos puede venir vacios
1. Los boleanos tiene que traer valor
2. class, class_md, description.name, description.height, description.slice, description.border, description.caracter_slice pueden venir vacios
3. default.value no puede venir vacio o ser null
4. type de debe ser toggle-button
5. cols.label, cols.label_false, cols.label_true, label, label_false, label_true y field no debe ser nulo ni vacio
6. no se debe permitir ningun otro campo adicional que no este en el schema
7. max_length y min_length deben ser enteros y obligatorios

{
  'required': False, 
  'class': 'col-span-6', 
  'class_md': 'md:col-span-3',
  'field': '', 
  'label_false': '', 
  'label_true': '', 
  'hide': False, 
  'autofocus': False, 
  'type': 'toggle-button', 
  'default': {'active': False, 'value': True, 'edit': True}, 
  'readonly': False, 
  'description': {'active': False, 'name': '', 'height': '60px', 'slice': '100', 'caracter_slice': '...', 'border': ''},
  'cols': {'hide': True, 'label': 'Situación', 'sortable': True, 'locked': False}
}


schema_base = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",

    # Bloquea claves no previstas en la raíz
    "additionalProperties": False,

    # =====================================================================
    # ######### [ADD-root-properties] Campos fijos en la raíz ##############
    # =====================================================================
    "properties": {
        # Campos tipo input-text
        "name": {
            "allOf": [
                {"$ref": "#/$defs/field_node"},
                {"$ref": "#/$defs/fixed_fields/name"}        # ######### valida default_field + random_name para 'name'
            ]
        },
        "name2": {
            "allOf": [
                {"$ref": "#/$defs/field_node"},
                {"$ref": "#/$defs/fixed_fields/name2"}       # ######### valida default_field para 'name2'
            ]
        },
        "short_name": {
            "allOf": [
                {"$ref": "#/$defs/field_node"},
                {"$ref": "#/$defs/fixed_fields/short_name"}  # ######### valida default_field para 'short_name'
            ]
        },

        # Campo tipo toggle-button
        "is_active": {"$ref": "#/$defs/field_node"}          # #########
    },

    # =====================================================================
    # ######### [ADD-root-required] Todos los fijos son obligatorios ########
    # =====================================================================
    "required": [
        "name",         # #########
        "name2",        # #########
        "short_name",   # #########
        "is_active"     # #########
    ],

    # Prefijos dinámicos permitidos (clave puede ser un campo o un diccionario de campos)
    "patternProperties": {
        r"^(form_fields_data_|child_form_fields_data_|parent_form_data)": {
            "anyOf": [
                {"$ref": "#/$defs/field_node"},
                {"$ref": "#/$defs/field_dict"}
            ]
        }
    },

    # =====================================================================
    # ######### [ADD-root-uniqueness] SOLO UNO con default_field=true #######
    # =====================================================================
    # Exactamente uno entre name, name2, short_name debe tener default_field = true
    "allOf": [
        {
            "oneOf": [
                {   # Caso A
                    "properties": {
                        "name":       {"properties": {"default_field": {"const": True}},  "required": ["default_field"]},
                        "name2":      {"properties": {"default_field": {"const": False}}, "required": ["default_field"]},
                        "short_name": {"properties": {"default_field": {"const": False}}, "required": ["default_field"]}
                    },
                    "required": ["name", "name2", "short_name"]
                },
                {   # Caso B
                    "properties": {
                        "name":       {"properties": {"default_field": {"const": False}}, "required": ["default_field"]},
                        "name2":      {"properties": {"default_field": {"const": True}},  "required": ["default_field"]},
                        "short_name": {"properties": {"default_field": {"const": False}}, "required": ["default_field"]}
                    },
                    "required": ["name", "name2", "short_name"]
                },
                {   # Caso C
                    "properties": {
                        "name":       {"properties": {"default_field": {"const": False}}, "required": ["default_field"]},
                        "name2":      {"properties": {"default_field": {"const": False}}, "required": ["default_field"]},
                        "short_name": {"properties": {"default_field": {"const": True}},  "required": ["default_field"]}
                    },
                    "required": ["name", "name2", "short_name"]
                }
            ]
        }
    ],

    "$defs": {
        # Diccionario contenedor de campos (para claves dinámicas)
        "field_dict": {
            "type": "object",
            "additionalProperties": {"$ref": "#/$defs/field_node"}
        },

        # Nodo base de campo (hace switch por 'type')
        "field_node": {
            "type": "object",
            # No ponemos additionalProperties aquí; se bloquea en cada tipo con 'unevaluatedProperties'
            "properties": {
                "type": {
                    "type": "string",
                    # Para este esquema incluimos solo los tipos que realmente usamos aquí
                    "enum": [
                        "input-text",     # #########
                        "toggle-button"   # #########
                    ]
                }
            },
            "required": ["type"],
            "allOf": [
                {"$ref": "#/$defs/type_switch"}
            ]
        },

        # Router por tipo
        "type_switch": {
            "oneOf": [
                {
                    "if": {"properties": {"type": {"const": "input-text"}}, "required": ["type"]},
                    "then": {"$ref": "#/$defs/types/input-text"}     # #########
                },
                {
                    "if": {"properties": {"type": {"const": "toggle-button"}}, "required": ["type"]},
                    "then": {"$ref": "#/$defs/types/toggle-button"}  # #########
                }
            ]
        },

        "types": {
            # =================================================================
            # ######### [ADD-type-input-text] Definición TIPO: input-text ######
            # =================================================================
            "input-text": {
                "type": "object",
                "properties": {
                    # 1) Booleans (no null)
                    "required":  {"type": "boolean"},
                    "hide":      {"type": "boolean"},
                    "autofocus": {"type": "boolean"},
                    "readonly":  {"type": "boolean"},

                    # 2) Strings que pueden venir vacíos ("")
                    "class":    {"type": "string", "minLength": 0},
                    "class_md": {"type": "string", "minLength": 0},

                    # 4) type fijo
                    "type": {"const": "input-text"},

                    # 3) default.value puede ser "" o null
                    "default": {
                        "type": "object",
                        "properties": {
                            "active": {"type": "boolean"},
                            "value":  {"type": ["string", "null"], "minLength": 0},
                            "edit":   {"type": "boolean"}
                        },
                        "required": ["active", "value", "edit"],
                        "additionalProperties": False
                    },

                    # 7) Enteros y obligatorios
                    "max_length": {"type": "integer", "minimum": 0},
                    "min_length": {"type": "integer", "minimum": 0},

                    # 5) label y field no nulos/ni vacíos
                    "field": {"type": "string", "minLength": 1},  # #########
                    "label": {"type": "string", "minLength": 1},  # #########

                    # 2) description.* pueden venir vacíos
                    "description": {
                        "type": "object",
                        "properties": {
                            "active":         {"type": "boolean"},
                            "name":           {"type": "string", "minLength": 0},
                            "height":         {"type": "string", "minLength": 0},
                            "slice":          {"type": "string", "minLength": 0},
                            "caracter_slice": {"type": "string", "minLength": 0},
                            "border":         {"type": "string", "minLength": 0}
                        },
                        "required": ["active", "name", "height", "slice", "caracter_slice", "border"],
                        "additionalProperties": False
                    },

                    # 5) cols.label no nulo/ni vacío
                    "cols": {
                        "type": "object",
                        "properties": {
                            "hide":     {"type": "boolean"},
                            "label":    {"type": "string", "minLength": 1},
                            "sortable": {"type": "boolean"},
                            "locked":   {"type": "boolean"}
                        },
                        "required": ["hide", "label", "sortable", "locked"],
                        "additionalProperties": False
                    }
                },
                "required": [
                    "required",
                    "class",
                    "class_md",
                    "hide",
                    "type",
                    "autofocus",
                    "default",
                    "readonly",
                    "max_length",
                    "min_length",
                    "field",     # #########
                    "label",     # #########
                    "description",
                    "cols"
                ],
                # 6) Bloquea extras dentro del campo
                "unevaluatedProperties": False
            },

            # =================================================================
            # ######### [ADD-type-toggle-button] TIPO: toggle-button  ##########
            # =================================================================
            "toggle-button": {
                "type": "object",
                "properties": {
                    # 1) Booleans
                    "required":  {"type": "boolean"},
                    "hide":      {"type": "boolean"},
                    "autofocus": {"type": "boolean"},
                    "readonly":  {"type": "boolean"},

                    # 2) Strings que pueden venir vacíos
                    "class":    {"type": "string", "minLength": 0},
                    "class_md": {"type": "string", "minLength": 0},

                    # 4) type fijo
                    "type": {"const": "toggle-button"},

                    # 3) default.value: boolean (no vacío ni null)
                    "default": {
                        "type": "object",
                        "properties": {
                            "active": {"type": "boolean"},
                            "value":  {"type": "boolean"},  # #########
                            "edit":   {"type": "boolean"}
                        },
                        "required": ["active", "value", "edit"],
                        "additionalProperties": False
                    },

                    # 7) Enteros y obligatorios
                    "max_length": {"type": "integer", "minimum": 0},  # #########
                    "min_length": {"type": "integer", "minimum": 0},  # #########

                    # 5) Identificación/etiquetas no vacías
                    "field":       {"type": "string", "minLength": 1},  # #########
                    "label":       {"type": "string", "minLength": 1},  # #########
                    "label_false": {"type": "string", "minLength": 1},  # #########
                    "label_true":  {"type": "string", "minLength": 1},  # #########

                    # 2) description.* pueden venir vacíos
                    "description": {
                        "type": "object",
                        "properties": {
                            "active":         {"type": "boolean"},
                            "name":           {"type": "string", "minLength": 0},
                            "height":         {"type": "string", "minLength": 0},
                            "slice":          {"type": "string", "minLength": 0},
                            "caracter_slice": {"type": "string", "minLength": 0},
                            "border":         {"type": "string", "minLength": 0}
                        },
                        "required": ["active", "name", "height", "slice", "caracter_slice", "border"],
                        "additionalProperties": False
                    },

                    # 5) cols.* requeridos y no vacíos
                    "cols": {
                        "type": "object",
                        "properties": {
                            "hide":        {"type": "boolean"},
                            "label":       {"type": "string", "minLength": 1},  # #########
                            "label_false": {"type": "string", "minLength": 1},  # #########
                            "label_true":  {"type": "string", "minLength": 1},  # #########
                            "sortable":    {"type": "boolean"},
                            "locked":      {"type": "boolean"}
                        },
                        "required": ["hide", "label", "label_false", "label_true", "sortable", "locked"],
                        "additionalProperties": False
                    }
                },
                "required": [
                    "required",
                    "class",
                    "class_md",
                    "hide",
                    "type",
                    "autofocus",
                    "default",
                    "readonly",
                    "max_length",   # #########
                    "min_length",   # #########
                    "field",        # #########
                    "label",        # #########
                    "label_false",  # #########
                    "label_true",   # #########
                    "description",
                    "cols"
                ],
                "unevaluatedProperties": False
            }
        },

        # =================================================================
        # ######### [ADD-fixed_fields] Reglas ESPECIALES por campo fijo #####
        # =================================================================
        "fixed_fields": {
            # 'name' con default_field obligatorio y random_name con forma fija
            "name": {
                "type": "object",
                "properties": {
                    "default_field": {"type": "boolean"},   # #########
                    "random_name": {                         # #########
                        "type": "object",
                        "properties": {
                            "compressed_random_name2": {"type": "boolean"},
                            "maximum_characters_random": {"type": "integer"}
                        },
                        "required": ["compressed_random_name2", "maximum_characters_random"],
                        "additionalProperties": False
                    }
                },
                "required": ["default_field", "random_name"],  # #########
                "additionalProperties": False
            },

            # 'name2' con default_field obligatorio
            "name2": {
                "type": "object",
                "properties": {
                    "default_field": {"type": "boolean"}    # #########
                },
                "required": ["default_field"],              # #########
                "additionalProperties": False
            },

            # 'short_name' con default_field obligatorio
            "short_name": {
                "type": "object",
                "properties": {
                    "default_field": {"type": "boolean"}    # #########
                },
                "required": ["default_field"],              # #########
                "additionalProperties": False
            }
        }
    }
}


Booleans no nulos: todos los booleanos están como {"type":"boolean"} en cada tipo.
Cadenas vacías permitidas en: class, class_md, description.{name,height,slice,border,caracter_slice} (minLength 0)
default.value:
input-text → ["string","null"] (permite "" o null).
toggle-button → boolean (no "" ni null).
type: const "input-text" o const "toggle-button" según el tipo.
cols.label (y otros labels): minLength: 1 (no nulos/ni vacíos).
label y field (a nivel campo): minLength: 1 en ambos tipos.
max_length / min_length: enteros y obligatorios, minimum: 0.
Sin extras dentro de cada campo: unevaluatedProperties: False en cada tipo.
Sin extras en la raíz: additionalProperties: False.
Unicidad de default_field=true entre name, name2, short_name: bloque "[ADD-root-uniqueness]" en allOf.


*/