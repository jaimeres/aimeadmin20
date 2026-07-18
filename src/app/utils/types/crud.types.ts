export type levelsOptions = { filter_id?: any[]; filter_level?: any[]; filter_app?: any[]; force?: boolean };

export type classifierOptions = { filter_id?: any[]; filter_level?: any[]; level_id?: any[]; force?: boolean };

export type saveOptions = {
  pos?: string;
  hide?: boolean;
  reset?: boolean;
  is_file?: boolean;
  node?: boolean;
  selected?: any;
  update_item?: any;
  data?: any;
  custom_user?: any;
  // [[[II Fuerza la rama de creación (POST) sin depender del signal global
  // isCreate(); necesario para el alta de un detalle vía "pos transitorio" desde
  // la tabla derivada, sin contaminar el estado del diálogo visible. ]]]FI
  force_create?: boolean;
  local_table?: {
    field: string;
    mode?: 'prepend' | 'append' | 'replace' | 'row';
    // pos destino donde vive el FormArray de la tabla (el form VISIBLE), cuando
    // el guardado corre sobre un pos transitorio distinto. Si se omite, se usa
    // el pos del guardado.
    pos?: string;
    // Índice de fila a reemplazar cuando mode === 'row'.
    row_index?: number;
  };
  // [[[II Contexto de fila de tabla derivada: cuando se envía, save() construye un
  // "pos transitorio" (pos + 'trans'), clona el contexto del detalle y valida +
  // guarda la fila reutilizando el mismo motor (formErrors/validateRelationships/
  // submitForm) sin tocar el formulario visible. ]]]FI
  table_row?: {
    base_pos: string;
    field: string;
    row_index: number;
    row_data: any;
    source_row?: any;
    columns: any[];
    mode: 'create' | 'edit';
  };
};

export type resetFormOptions = { selected?: any; pos?: string };

export type getAllOptions = { pos?: string | null; node?: boolean; filter?: string; sort?: string; force?: boolean };

export type getAllSecundaryOptions = { pos?: string; node?: boolean; filter?: string; sort?: string; force?: boolean; include?: string; fields?: string; app?: string; type?: string };

export type getStatusOptions = { module?: string; id?: string; ids_task?: any; force?: boolean };
export type getTaskOptions = { module?: string; ids_task?: any; force?: boolean };
export type getDJAtoObject = {
  resp: any; // o el tipo real si lo sabes
  additionalFieldsIncluded?: any;
  customField?: any;
  fieldsBool?: any;
  moreFields?: any;
  node?: boolean;
  additionalFieldsAppCols?: any[];
  pos?: any;
};
