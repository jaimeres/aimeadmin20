export type levelsOptions = { filter_id?: any[]; filter_level?: any[]; filter_app?: any[]; force?: boolean };

export type classifierOptions = { filter_id?: any[]; filter_level?: any[]; level_id?: any[]; force?: boolean };

export type saveOptions = {
  pos?: string;
  hide?: boolean;
  reset?: boolean;
  is_file?: boolean;
  node?: boolean;
  selected?: any;
  update_item?: boolean;
  data?: any;
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
