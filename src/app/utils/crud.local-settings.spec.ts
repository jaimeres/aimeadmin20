// [[[II ESC:031-06 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-06
import { signal } from '@angular/core';

import { CRUD } from './crud.class';

describe('CRUD.localSettings', () => {
  const buildCrud = (active: boolean): any => {
    const crud = Object.create(CRUD.prototype) as any;
    crud.localSettingsDialogVisible = false;
    crud.localSettingsConfiguration = () => ({ active });
    crud.messageS = { changeMessage: jasmine.createSpy('changeMessage') };
    crud.pos = () => 'resource';
    crud.module = {};
    crud.fieldConfig = signal({});
    crud.configGeneral = signal({
      resource: { configuration: { web: { active: true } } },
    });
    crud.drawForm = signal({ resource: { dialog: { width: 'width-900px-custom' } } });
    crud.configForm = { patchValue: jasmine.createSpy('patchValue') };
    crud.selectedColumns = () => [];
    return crud;
  };

  it('does not open or initialize the dialog when active is false', () => {
    const crud = buildCrud(false);

    crud.localSettings();

    expect(crud.localSettingsDialogVisible).toBeFalse();
    expect(crud.configForm.patchValue).not.toHaveBeenCalled();
    expect(crud.messageS.changeMessage).toHaveBeenCalled();
  });

  it('opens and initializes the dialog when active is true', () => {
    const crud = buildCrud(true);

    crud.localSettings();

    expect(crud.localSettingsDialogVisible).toBeTrue();
    expect(crud.configForm.patchValue).toHaveBeenCalledWith({ columns: [] });
    expect(crud.messageS.changeMessage).not.toHaveBeenCalled();
    expect(crud.fieldConfig().general).toBe(crud.configGeneral().resource);
    expect(crud.fieldConfig().draw).toBe(crud.drawForm().resource);
  });
});
// ]]]FI
