# BOS No Regressions

Esta regla es global para Codex en este repositorio. No depende de skills.

## Regla Principal

No introducir regresiones funcionales por interpretacion implicita.

La ruta del API es /home/jaime/Escritorio/d/aimeServidor2 y se puede acceder en modo lectura cuando sea necesario para revisar comportamiento, contratos o reglas relacionadas.

Antes de cambiar comportamiento existente:

1. Identificar el comportamiento previo leyendo el codigo y, si existe, la documentacion de trazabilidad.
2. Comparar la solicitud del usuario contra ese comportamiento.
3. Si la solicitud es ambigua y el cambio puede romper compatibilidad previa, detenerse y preguntar.
4. Solo aceptar una regresion cuando el usuario la pida de forma explicita o confirme la pregunta.
5. Si se autoriza una regresion, documentar la decision y el motivo en la trazabilidad correspondiente.

## Regla de Alcance Minimo sobre Correcciones Puntuales

Cuando el usuario pida corregir una condicion o bloque especifico, Codex debe modificar unicamente esa unidad minima.
No debe introducir helpers, constantes, abstracciones, reestructuraciones, cambios de indentacion amplia ni tocar ramas vecinas salvo que sea estrictamente necesario para corregir el bug descrito.

Si durante la revision aparecen posibles problemas adicionales, optimizaciones, riesgos o mejoras, deben reportarse como observaciones y no corregirse sin confirmacion explicita del usuario.

En reglas de negocio existentes, una correccion minima no debe cambiar efectos secundarios previos, como autocompletado de fechas, validaciones de transicion, prioridades de status, fallbacks, permisos o trazabilidad, salvo que el usuario lo pida de forma explicita.

## Senales de Posible Regresion

Preguntar antes de cambiar si el ajuste:

- Convierte un autocompletado previo en error de validacion.
- Cambia defaults, estados smart, fechas automaticas o resoluciones por configuracion.
- Hace obligatorio algo que antes era opcional.
- Deja de conservar datos existentes en PATCH.
- Cambia permisos, filtros multi-tenant, reglas de negocio o bloqueos de cierre.
- Sustituye un fallback existente por rechazo duro.
- Cambia el orden de prioridad entre dato enviado por usuario, dato calculado y dato por defecto.

## Pregunta Obligatoria

Cuando haya ambiguedad, hacer una pregunta breve y concreta antes de editar:

```text
Esto puede cambiar el comportamiento previo: antes <comportamiento anterior>, con este ajuste pasaria <nuevo comportamiento>. Confirmas que quieres esa regresion?
```

## Revision Proactiva de Conflictos

Antes de modificar, revisar configuracion, contratos cliente/servidor, overrides y
reglas existentes que puedan chocar con la solicitud. Los hallazgos colaterales no
autorizan cambios: deben reportarse con evidencia y riesgo, y esperar confirmacion.

## Aplicacion en Codigo

- Reutilizar helpers existentes antes de crear reglas nuevas.
- Mantener ramas previas salvo que el usuario pida reemplazarlas.
- Preferir extender comportamiento con condiciones acotadas.
- No eliminar autocompletados, tolerancias, defaults o fallbacks sin confirmacion explicita.
- Verificar create y update cuando el cambio toque serializers o estados.
- Verificar el mismo evento y eventos posteriores: datos enviados en la misma peticion, datos ya guardados y defaults.

## Cierre

En la respuesta final, mencionar cualquier comportamiento previo preservado, cualquier regresion autorizada y las verificaciones ejecutadas.
