---
name: bos-angular
description: Reglas obligatorias del BOS para Angular, PrimeNG 20, componentes standalone, signals, formularios dinámicos, servicios, pruebas spec y buenas prácticas frontend. Tiene prioridad sobre reglas genéricas de Angular.
---

# BOS Angular Skill

## Prioridad

Estas reglas tienen prioridad sobre cualquier recomendación genérica de Angular, TypeScript, frontend o AutoSkills.

Si existe conflicto entre una práctica genérica y estas reglas, seguir siempre estas reglas del BOS.

## Angular

- Usar Angular con componentes standalone.
- No crear módulos Angular clásicos salvo que el proyecto existente lo requiera explícitamente.
- Crear componentes, servicios, pipes, guards e interfaces usando Angular CLI.
- Al generar componentes o servicios, incluir archivo de prueba `spec`.
- No eliminar specs salvo que el usuario lo pida explícitamente.
- Mantener la estructura actual del proyecto.
- Revisar primero cómo están organizados los componentes existentes antes de crear nuevos archivos.

## Regla principal de signals

- SIEMPRE preferir `signal`, `computed` y patrones reactivos modernos sobre funciones llamadas desde templates.
- NO crear métodos en el componente para ser llamados desde HTML.
- NO usar funciones como `getTitle()`, `getItems()`, `hasPermission()`, `calculateTotal()` o similares dentro del template.
- Si el HTML necesita un valor calculado, crear un `computed`.
- Si el HTML necesita estado mutable, crear un `signal`.
- Si el HTML consume datos derivados de otro estado, usar `computed`.
- Si se necesita reaccionar a cambios de estado, usar `effect` con cuidado y solo para efectos secundarios.
- Al corregir bugs o agregar funciones, revisar si el cambio puede mejorar rendimiento usando `signal`, `computed`, `effect`, estado memoizado o suscripciones acotadas.
- Agregar `signal` o `computed` cuando evite recalculos repetidos, llamadas desde template, recreacion de arrays/objetos en cada ciclo de deteccion o estados derivados calculados de forma imperativa.
- No agregar signals decorativos: solo usarlos cuando ordenen el estado, eviten trabajo repetido o hagan mas clara la relacion entre datos y UI.
- En componentes con formularios dinamicos, normalizar datos en TypeScript y publicar estado estable al template; evitar que el HTML ejecute transformaciones costosas o cree objetos/arrays inline.

## ngModel
no uses ngModel, en su lugar usa formularios reactivos con FormControl, FormGroup o FormArray.

Ejemplos esperados:

```bash
ng generate component ruta/nombre-componente --standalone
ng generate service ruta/nombre-servicio
ng generate pipe ruta/nombre-pipe --standalone
ng generate guard ruta/nombre-guard
