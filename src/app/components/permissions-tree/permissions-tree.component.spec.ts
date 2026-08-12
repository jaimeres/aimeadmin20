import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PermissionsService } from '../../auth/services/permissions.service';
import { MessageService } from '../services/message.service';
import { PermissionsTreeComponent } from './permissions-tree.component';

// [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01
describe('PermissionsTreeComponent', () => {
  const tree: any = {
    assets: {
      maintenance: {
        update: { value: false, label: 'Modificar mantenimiento', field_permissions: 'permissions2', position: 49 },
        'update.start_date': { value: false, label: 'Modificar fecha inicio', field_permissions: 'assets_per', position: 17 },
        'update.status.code.T': { value: false, label: 'Cambiar estado a Terminado', field_permissions: 'assets_per', position: 31 },
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionsTreeComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: PermissionsService,
          useValue: {
            refresh: () => of({ strings: {}, tree: structuredClone(tree) }),
            loadForUser: () => of({ strings: {}, tree: structuredClone(tree) }),
            saveForUser: () => of({}),
            setAll: () => undefined,
            strings: () => ({}),
          },
        },
        { provide: MessageService, useValue: { changeMessage: () => undefined } },
      ],
    }).compileComponents();
  });

  it('groups a granular permission under its declared parent action', () => {
    const fixture = TestBed.createComponent(PermissionsTreeComponent);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();

    const resource = fixture.componentInstance.treeNodesByApp()['assets'][0];
    const update = resource.children?.find((node) => node.key === 'assets.maintenance.update');
    const startDate = update?.children?.find((node) => node.key === 'assets.maintenance.update.start_date');

    expect(update?.label).toBe('Modificar mantenimiento');
    expect(startDate?.label).toBe('Modificar fecha inicio');

    const status = update?.children?.find((node) => node.key === 'assets.maintenance.update.status');
    const code = status?.children?.find((node) => node.key === 'assets.maintenance.update.status.code');
    const finished = code?.children?.find((node) => node.key === 'assets.maintenance.update.status.code.T');
    expect(finished?.label).toBe('Cambiar estado a Terminado');
  });

  it('enables the parent when granting a granular permission and disables children with the parent', () => {
    const fixture = TestBed.createComponent(PermissionsTreeComponent);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    let resource = component.treeNodesByApp()['assets'][0];
    let update = resource.children?.find((node) => node.key === 'assets.maintenance.update')!;
    let startDate = update.children?.find((node) => node.key === 'assets.maintenance.update.start_date')!;
    component.toggleLeaf(startDate);

    expect(component.localTree()['assets']['maintenance']['update'].value).toBeTrue();
    expect(component.localTree()['assets']['maintenance']['update.start_date'].value).toBeTrue();

    resource = component.treeNodesByApp()['assets'][0];
    update = resource.children?.find((node) => node.key === 'assets.maintenance.update')!;
    component.toggleLeaf(update);

    expect(component.localTree()['assets']['maintenance']['update'].value).toBeFalse();
    expect(component.localTree()['assets']['maintenance']['update.start_date'].value).toBeFalse();
  });
});
// ]]]FI
