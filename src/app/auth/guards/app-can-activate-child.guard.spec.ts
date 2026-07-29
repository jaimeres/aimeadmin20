// [[[II ESC:031-01 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-01
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';

import { appCanActivateGuardChild } from './app-can-activate-child.guard';
import { AuthService } from '../services/auth.service';
import { MessageService } from '../../components/services/message.service';

describe('appCanActivateGuardChild', () => {
  let authS: jasmine.SpyObj<AuthService>;
  let messageS: jasmine.SpyObj<MessageService>;

  // Con fuentes of() el guard es síncrono: subscribe emite, completa y ejecuta
  // finalize antes de retornar, así que se puede asertar después del subscribe.
  const runGuard = (route: any, url: string): boolean | undefined => {
    let result: boolean | undefined;
    const guard$ = TestBed.runInInjectionContext(() =>
      appCanActivateGuardChild(route as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)
    ) as Observable<boolean>;
    guard$.subscribe((value) => result = value);
    return result;
  };

  beforeEach(() => {
    authS = jasmine.createSpyObj('AuthService', ['tokenValidate', 'ensureConfigForUrl', 'redirectMP']);
    messageS = jasmine.createSpyObj('MessageService', ['showBlocked']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authS },
        { provide: MessageService, useValue: messageS },
      ],
    });
  });

  it('permite la navegación con token válido y configuración asegurada, apagando la máscara al final', () => {
    authS.tokenValidate.and.returnValue(of(true));
    authS.ensureConfigForUrl.and.returnValue(of(true));

    const result = runGuard({ data: {} }, '/assets/pumps-utilities');

    expect(result).toBeTrue();
    expect(messageS.showBlocked).toHaveBeenCalledWith(true);
    expect(authS.ensureConfigForUrl).toHaveBeenCalledWith('/assets/pumps-utilities', []);
    expect(authS.redirectMP).not.toHaveBeenCalled();
    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
  });

  it('redirige sin pedir configuración cuando el token no es válido', () => {
    authS.tokenValidate.and.returnValue(of(false));

    const result = runGuard({ data: {} }, '/assets/pumps-utilities');

    expect(result).toBeFalse();
    expect(authS.ensureConfigForUrl).not.toHaveBeenCalled();
    expect(authS.redirectMP).toHaveBeenCalled();
    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
  });

  it('bloquea la activación cuando la configuración no puede asegurarse', () => {
    authS.tokenValidate.and.returnValue(of(true));
    authS.ensureConfigForUrl.and.returnValue(of(false));

    const result = runGuard({ data: {} }, '/assets/pumps-utilities');

    expect(result).toBeFalse();
    expect(authS.redirectMP).toHaveBeenCalled();
    expect(messageS.showBlocked).toHaveBeenCalledWith(false);
  });

  it('pasa los configModules declarados en la ruta como compatibilidad opcional', () => {
    authS.tokenValidate.and.returnValue(of(true));
    authS.ensureConfigForUrl.and.returnValue(of(true));

    runGuard({ data: { configModules: ['asset'] } }, '/assets/pumps-utilities');

    expect(authS.ensureConfigForUrl).toHaveBeenCalledWith('/assets/pumps-utilities', ['asset']);
  });
});
// ]]]FI
