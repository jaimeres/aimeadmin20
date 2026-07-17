import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Activate } from './activate';
import { AuthService } from '../../auth/services/auth.service';

describe('Activate', () => {
  let component: Activate;
  let fixture: ComponentFixture<Activate>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['activate']);
    authService.activate.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [Activate],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ uid: 'uid-token', token: 'activation-token' }),
            },
          },
        },
        { provide: AuthService, useValue: authService },
      ],
    })
      .overrideComponent(Activate, {
        set: {
          imports: [],
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Activate);
    component = fixture.componentInstance;
  });

  // [[[II ESC:029-02 DOC:docs/documents/2026-07-11-029-registro-usuario-auth.md#escenario-02
  it('activates the account with uid and token from the route', () => {
    fixture.detectChanges();

    expect(authService.activate).toHaveBeenCalledWith({
      uid: 'uid-token',
      token: 'activation-token',
    });
    expect(component.activationStatus()).toBe('success');
  });
  // ]]]FI
});
