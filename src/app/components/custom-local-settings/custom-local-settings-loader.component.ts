import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormGroup } from '@angular/forms';

import {
  DEFAULT_LOCAL_SETTINGS_CONFIGURATION,
  LocalSettingsPlatformConfiguration,
} from '../../utils/local-settings-configuration';
import { CustomLocalSettingsComponent } from './custom-local-settings.component';

// [[[II ESC:031-07 DOC:docs/documents/2026-07-18-031-optimizacion-navegacion-activos.md#escenario-07
@Component({
  selector: 'app-custom-local-settings',
  standalone: true,
  imports: [CustomLocalSettingsComponent],
  templateUrl: './custom-local-settings-loader.component.html',
  // El bloque @loading solo existe mientras se descarga el chunk diferido; se
  // escribe aqui para no cargar estilos ni componentes extra en el bundle previo.
  styles: [`
    .local-settings-loading {
      align-items: center;
      background: color-mix(in srgb, var(--surface-ground) 82%, transparent);
      color: var(--text-color-secondary);
      display: flex;
      gap: .6rem;
      inset: 0;
      justify-content: center;
      position: fixed;
      z-index: 1101;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomLocalSettingsLoaderComponent {
  @Input() visible = false;
  @Input() field: any = {};
  @Input() formGroup: FormGroup | undefined;
  @Input() sectionConfiguration: LocalSettingsPlatformConfiguration = {
    ...DEFAULT_LOCAL_SETTINGS_CONFIGURATION.web,
  };

  @Output() visibleAction = new EventEmitter<boolean>();
  @Output() saveAction = new EventEmitter<void>();
}
// ]]]FI
