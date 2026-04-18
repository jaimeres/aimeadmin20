import { provideHttpClient } from '@angular/common/http';
import { signal, Type } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../app/auth/services/auth.service';
import { ConfigService } from '../app/auth/services/config.service';
import { MessageService } from '../app/components/services/message.service';
import { GeneralService } from '../app/utils/services/general.service';
import { SharedDynamicDataService } from '../app/utils/services/shared-dynamic-data.service';

function createCrudModuleConfig() {
  return {
    cols: {},
    config_cols: {},
    draw: {
      dialog: {
        width: 'width-1200px-Custom',
        height: 'min-height-550px-custom',
      },
      general: {},
    },
    general: {
      load: {
        load_on_start: false,
        load_on_start_mobile: false,
        silent: true,
      },
      pagination: {
        rows: 20,
        rows_mobile: 10,
      },
    },
    fields: {},
  };
}

function createConfigMock(): Record<string, any> {
  const target: Record<string, any> = {};

  return new Proxy(target, {
    get(target, property: string | symbol) {
      if (typeof property !== 'string') {
        return Reflect.get(target, property);
      }

      if (!(property in target)) {
        target[property] = createCrudModuleConfig();
      }

      return target[property];
    },
    set(target, property: string | symbol, value) {
      if (typeof property === 'string') {
        target[property] = value;
      }
      return true;
    },
  });
}

export function createMessageServiceMock() {
  return {
    currentLogin: { subscribe: () => ({ unsubscribe: () => undefined }) },
    currentMessage: { subscribe: () => ({ unsubscribe: () => undefined }) },
    changeMessage: () => undefined,
    showBlocked: () => undefined,
    hideBlocked: () => undefined,
    showLoginDialog: () => undefined,
    add: () => undefined,
    clear: () => undefined,
  };
}

export function createGeneralServiceMock() {
  return {
    isMobile: () => false,
    isMobileScreen: () => false,
    baseDJA: (value: unknown) => value,
    DJAtoObject: ({ respDJA }: { respDJA: unknown }) => respDJA,
    getDeviceId: async () => null,
  };
}

export function createCrudServiceMock() {
  const config = createConfigMock();

  return {
    app: '',
    type: '',
    config,
    file: false,
    relationships: [],
    appType: {},
    customField: signal<Record<string, any>>({}),
    lastVisitedChanged$: { next: () => undefined },
    authS: { user: () => ({ name: 'Usuario Demo' }), config },
    drawForm: () => ({}),
    configGeneral: () => ({}),
    fieldsForm: () => [],
    buildFilterString: () => '',
  };
}

export async function configureCrudComponentTesting<T>(component: Type<T>, serviceToken: Type<unknown>) {
  await TestBed.configureTestingModule({
    imports: [component, ReactiveFormsModule],
    providers: [
      provideRouter([]),
      { provide: serviceToken, useValue: createCrudServiceMock() },
      { provide: MessageService, useValue: createMessageServiceMock() },
      { provide: GeneralService, useValue: createGeneralServiceMock() },
      { provide: SharedDynamicDataService, useValue: {} },
    ],
  })
    .overrideComponent(component, {
      set: {
        template: '',
      },
    })
    .compileComponents();
}

export function configureCrudServiceTesting<T>(serviceToken: Type<T>) {
  const config = createConfigMock();

  TestBed.configureTestingModule({
    providers: [
      serviceToken,
      provideHttpClient(),
      { provide: ConfigService, useValue: {} },
      { provide: GeneralService, useValue: createGeneralServiceMock() },
      { provide: AuthService, useValue: { user: () => ({ name: 'Usuario Demo' }), config } },
    ],
  });

  return TestBed.inject(serviceToken);
}
