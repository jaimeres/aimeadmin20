import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../auth/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    const authServiceMock = {
      isBiometricAvailable: jasmine.createSpy('isBiometricAvailable').and.returnValue(of(false)),
      loginWithBiometrics: jasmine.createSpy('loginWithBiometrics').and.returnValue(of({})),
      biometricAuthS: {
        checkBiometricAvailability: jasmine
          .createSpy('checkBiometricAvailability')
          .and.returnValue(of({ available: false, status: 'NOT_SUPPORTED_ON_WEB' })),
      },
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
