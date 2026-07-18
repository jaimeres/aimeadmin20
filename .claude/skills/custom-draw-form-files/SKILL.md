---
name: custom-draw-form-files
description: >
  Comportamiento completo de los campos `type: 'files'` en custom-draw-form: controles
  de formulario, routing de base64 (appendFile), reconciliación de validators, validación
  por paso (stepper), casos especiales `key ≠ field` y tipo legacy `'document'`.
  Activar cuando se trabaje con campos files, cámara, subida de archivos, documentos
  en stepper o cuando appendFile / validateStepFields sean modificados.
---

# Skill: Campos `files` en custom-draw-form

## Resumen

Un campo `type: 'files'` en la configuración del servidor crea **hasta tres controles** en el
`FormGroup`. La validación, el routing de capturas y la reconciliación de validators deben
considerar los tres de forma coordinada.

---

## 1. Controles que crea `crud.class → addFieldsByPrefix`

| Control | Nombre | Valor inicial | `required` |
|---|---|---|---|
| **`*_files`** | `{prefix}files` p.ej. `inventory_movement_data_files` | `[]` | Solo si `server_upload.active` |
| **`*_documents`** | `{prefix}documents` p.ej. `inventory_movement_data_documents` | `[]` | Solo si `upload.active` |
| **`key` control** | Nombre explícito diferente a `field` p.ej. `inventory_movement_data_files_inicial` | Depende | Si el campo lo declara como `required` |

### Reglas de `required` en el form builder

```
fieldData.required && upload.active       → documentsValidators.push(Validators.required)
fieldData.required && serverUpload.active → filesValidators.push(Validators.required)
fieldData.required && !upload && !server  → filesValidators.push(Validators.required)
upload.required                           → documentsValidators.push(Validators.required)
serverUpload.required                     → filesValidators.push(Validators.required)
```

El control `*_documents` **no se crea** cuando `fieldPrefix === 'form_fields_data_'`
(Escenario 3 — campos dentro de form_data).

### Caso `key ≠ field`

Cuando la configuración del campo declara un `key` distinto al `field`:

```python
# Python server config
"inventory_movement_data_files_inicial": {   # ← dict-key / key del campo
    **files,
    "required": True,
    "field": "inventory_movement_data_files", # ← field (distinto al key)
}
```

Esto genera en el formulario:
- `inventory_movement_data_files` → control de relación JSON:API (servidor)
- `inventory_movement_data_documents` → control de cámara (sibling de `field`)
- `inventory_movement_data_files_inicial` → control independiente para captura específica de ese step

Los tres son **campos separados**, cada uno con sus propios validators, y deben tratarse
de forma independiente pero con **reconciliación mutua** (ver sección 4).

---

## 2. Tipo `'document'` (deprecated)

El tipo `'document'` es la forma antigua del campo `files`. Fue reemplazado por `'files'`.

| Característica | `'document'` (legacy) | `'files'` (actual) |
|---|---|---|
| Routing base64 | Al control `key` (propiedad explícita) | Al sibling `*_documents` (prioridad) |
| Sibling `*_documents` | No siempre existe | Siempre existe (si no es form_fields_data_) |
| Template stepper | `*ngSwitchCase="'document'"` → deprecated | `*ngSwitchCase="'files'"` |

En el HTML del stepper, ambos tipos deben usar el mismo `fileTemplate`:

```html
<!-- 'document' deprecated → mismo template -->
<div *ngSwitchCase="'document'" class="w-full">
  <ng-container *ngTemplateOutlet="fileTemplate; context: {fieldConfig: field.value}"></ng-container>
</div>
<div *ngSwitchCase="'files'" class="w-full">
  <ng-container *ngTemplateOutlet="fileTemplate; context: {fieldConfig: field.value}"></ng-container>
</div>
```

---

## 3. `appendFile` — Routing de base64

Orden de prioridad para decidir en qué control se guarda el base64 de la cámara:

```
Prioridad 1 (type 'files' | 'file' | 'document'):
  Si existe formGroup.get(field.replace(/files$/, 'documents'))
    → base64TargetField = '*_documents'

Prioridad 2 — fallback legacy (type 'document' sin sibling *_documents):
  Si fieldConfig.key existe && key ≠ field
    → base64TargetField = key

Prioridad 3 — fallback final:
  → base64TargetField = field
```

Después de escribir el base64 en el control destino, se **limpian los validators** del
control `*_files` si el destino fue `*_documents`:

```typescript
if (base64TargetField !== payload.field) {
  filesCtrl.clearValidators();
  filesCtrl.updateValueAndValidity({ emitEvent: false });
}
```

`_pushServerFileToForm` realiza el proceso simétrico: escribe en `*_files` y limpia
validators de `*_documents`.

---

## 4. Reconciliación mutua de validators (regla central)

**Cualquiera de los tres controles que tenga valor satisface la obligación del campo.**
Cuando uno tiene valor, los validators de los otros se limpian.

```
hasValue = (v) => v != null && (Array.isArray(v) ? v.length > 0 : !!v)

hasDocsValue  → clear *_files + clear key control
hasFilesValue → clear *_documents + clear key control
hasKeyValue   → clear *_documents + clear *_files
```

**Importante:** los controles se inicializan con `[]` (array vacío). `[]` es **truthy** en JS,
por lo que la detección de "tiene valor" **debe comparar longitud**, no solo presencia:

```typescript
// ❌ INCORRECTO: [] es truthy → dispara reconciliación incorrectamente
if (docsCtrl?.value && filesCtrl) { ... }

// ✅ CORRECTO
const hasValue = (v: any) => v != null && (Array.isArray(v) ? v.length > 0 : !!v);
if (hasValue(docsCtrl?.value)) { ... }
```

---

## 5. `validateStepFields` — Validación por paso (stepper)

Al avanzar al siguiente step ("Siguiente"), se deben validar los campos del step actual.
Para campos `type: 'files'`:

1. Calcular `docsCandidate = fieldName.replace(/files$/, 'documents')`
2. Obtener `docsCtrl`, `filesCtrl` y `keyCtrl` (si `keyName ≠ fieldName`)
3. Aplicar **reconciliación mutua** (sección 4)
4. Validar explícitamente `docsCtrl` (portador del `required` cuando `upload.active=true`)
5. Validar explícitamente `keyCtrl` si existe como control independiente
6. El bloque genérico al final del loop valida `fieldName` y `keyName` (idempotente)

### Por qué se valida `docsCtrl` explícitamente

El `field` del step config apunta a `*_files` (que puede no tener `required`). El `required`
real lo tiene `*_documents`. Si solo se valida `fieldName` nunca se detecta la ausencia
de captura → el step pasa sin imagen.

### Por qué se valida `keyCtrl` explícitamente

Cuando `key ≠ field`, el key control es un campo independiente con su propio `required`.
No sigue el patrón `replace(/files$/, 'documents')`, por lo que no cae en la lógica del
sibling. Se valida directamente tras la reconciliación.

### Código de referencia

```typescript
validateStepFields(stepNumber: number): boolean {
  // ...
  for (const fieldConfig of stepFields) {
    const fieldName = (fieldConfig as any).field;
    const keyName   = (fieldConfig as any).key;
    const fieldType = (fieldConfig as any).type;
    const fieldHide = (fieldConfig as any).hide;

    if (!fieldName && !keyName) continue;
    if (fieldHide) continue; // Campos ocultos no bloquean navegación

    if ((fieldType === 'files' || fieldType === 'file' || fieldType === 'document') && fieldName) {
      const docsCandidate = fieldName.replace(/files$/, 'documents');
      if (docsCandidate !== fieldName) {
        const docsCtrl  = formGroup.get(docsCandidate);
        const filesCtrl = formGroup.get(fieldName);
        const keyCtrl   = (keyName && keyName !== fieldName) ? formGroup.get(keyName) : null;
        const hasValue  = (v: any) => v != null && (Array.isArray(v) ? v.length > 0 : !!v);

        const hasDocsValue  = hasValue(docsCtrl?.value);
        const hasFilesValue = hasValue(filesCtrl?.value);
        const hasKeyValue   = keyCtrl ? hasValue(keyCtrl.value) : false;

        // Reconciliación mutua
        if (hasDocsValue) {
          filesCtrl?.clearValidators(); filesCtrl?.updateValueAndValidity({ emitEvent: false });
          keyCtrl?.clearValidators();   keyCtrl?.updateValueAndValidity({ emitEvent: false });
        } else if (hasFilesValue) {
          docsCtrl?.clearValidators(); docsCtrl?.updateValueAndValidity({ emitEvent: false });
          keyCtrl?.clearValidators();  keyCtrl?.updateValueAndValidity({ emitEvent: false });
        } else if (hasKeyValue) {
          docsCtrl?.clearValidators();  docsCtrl?.updateValueAndValidity({ emitEvent: false });
          filesCtrl?.clearValidators(); filesCtrl?.updateValueAndValidity({ emitEvent: false });
        }

        // Validar docsCtrl y keyCtrl explícitamente
        if (docsCtrl) {
          docsCtrl.markAsTouched(); docsCtrl.markAsDirty(); docsCtrl.updateValueAndValidity();
          if (docsCtrl.invalid) { allValid = false; }
        }
        if (keyCtrl) {
          keyCtrl.markAsTouched(); keyCtrl.markAsDirty(); keyCtrl.updateValueAndValidity();
          if (keyCtrl.invalid) { allValid = false; }
        }
      }
    }

    // Validar fieldName y keyName genéricamente (cubre otros tipos y es idempotente)
    if (fieldName) { /* markAsTouched + updateValueAndValidity + check invalid */ }
    if (keyName && keyName !== fieldName) { /* ídem */ }
  }
  return allValid;
}
```

---

## 6. Escenarios completos

### Escenario A: solo cámara (`upload.active=true`, `server_upload.active=false`)

| Control | `required` | Escritura | Estado al enviar |
|---|---|---|---|
| `*_files` | No | (vacío) | valid (sin required) |
| `*_documents` | **Sí** | Camera → `[{type, file_name, file, ...}]` | valid (valor presente) |
| `key ctrl` | Depende | (vacío) | validators cleared si docs tiene valor |

### Escenario B: solo servidor (`upload.active=false`, `server_upload.active=true`)

| Control | `required` | Escritura | Estado al enviar |
|---|---|---|---|
| `*_files` | **Sí** | `_pushServerFileToForm` → `[{id, type}]` | valid (valor presente) |
| `*_documents` | No | (vacío) | validators cleared por `_pushServerFileToForm` |
| `key ctrl` | Depende | (vacío) | validators cleared si files tiene valor |

### Escenario C: ambos activos (`upload.active=true`, `server_upload.active=true`)

Ambos controles son required. El primero en tener valor limpia el required del otro.

### Escenario D: `key ≠ field` (stepper multi-step, mismo field, distintos steps)

Cada step con `key` diferente es un control independiente. La reconciliación mutua
garantiza que si cualquiera de los tres tiene valor, los otros pueden estar vacíos.

---

## 7. Archivo de referencia clave

| Archivo | Función |
|---|---|
| `src/app/utils/crud.class.ts` | Form builder: `addFieldsByPrefix` (línea ~970), `generateJSONform` (línea ~1915), `_pushServerFileToForm` (línea ~2909), `formErrors` (línea ~3304) |
| `src/app/components/custom-draw-form/custom-draw-form.component.ts` | `appendFile` (~2370), `validateStepFields` (~1154), `canNavigateToStep` (~3141), `getFileMenuItems` (~2758) |
| `src/app/components/custom-draw-form/custom-draw-form.component.html` | `fileTemplate` (~615), `*ngSwitchCase="'files'"` en stepper (~978) |

---

## 8. Anti-patrones conocidos

| Anti-patrón | Por qué falla |
|---|---|
| `if (ctrl?.value)` para detectar contenido de un `files` control | `[]` es truthy → reconciliación incorrecta → step pasa sin imagen |
| Validar solo `fieldName` en stepper, omitir `*_documents` | `fieldName` no tiene required, `*_documents` sí → Bug 1 |
| Limpiar solo `*_files` validators en appendFile, no verificar `key` ctrl | Si `key` ctrl tiene required y existe en formGroup, falla en submit → Bug 2 |
| Usar `*ngSwitchCase="'document'"` sin redirigir a `fileTemplate` | Render incorrecto → cámara no disponible |
