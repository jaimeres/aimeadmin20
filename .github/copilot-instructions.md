# BOS No Regressions

Esta regla es global para GitHub Copilot en este repositorio. No depende de skills.

## Regla obligatoria de coherencia con la arquitectura actual

Toda propuesta de modificación, creación, corrección, integración,
configuración, documentación o cualquier otro tipo de cambio debe formularse
dentro del marco de la arquitectura actual del proyecto.

Antes de proponer o implementar, GitHub Copilot debe localizar y verificar los
componentes, capas, contratos, patrones y responsabilidades existentes. La
ausencia de una implementación idéntica no autoriza a inventar una arquitectura
paralela: primero debe intentar una extensión coherente con el diseño vigente y
justificarla contra el código real.

Si por una limitación técnica, incompatibilidad comprobada o inexistencia de un
mecanismo aplicable la propuesta debe salir del diseño actual, Copilot debe
declarar antes de implementarla: el vacío arquitectónico y dónde se verificó;
los motivos concretos; la propuesta exacta; su impacto, riesgos, compatibilidad
y alternativas; y si reemplaza, amplía o crea una responsabilidad
arquitectónica. Toda desviación material requiere confirmación explícita del
usuario y no debe presentarse como una continuación ordinaria del proyecto.

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

Cuando el usuario pida corregir una condicion o bloque especifico, Copilot debe modificar unicamente esa unidad minima.
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

## Regla de Referencias Verificables

Copilot no debe mencionar una referencia (documento, escenario, commit, seccion, simbolo, regla o resumen) solo por numero o nombre corto, por ejemplo "el resumen del 039" o "el escenario 4". Siempre debe indicar como llegar a ella.

Toda referencia debe incluir:

- Codigo: ruta de archivo y linea (archivo.ts:123 o archivo.ts:45-51).
- Documentacion: ruta de archivo y ancla (docs/documents/YYYY-MM-DD-NNN-slug.md#escenario-NN).
- Enlace markdown clicable cuando el canal lo soporte.

Motivo: el proyecto tiene cientos o miles de lineas de codigo y de documentacion humana. Copilot ya reviso y localizo la referencia; si no entrega la ruta exacta, el humano tiene que repetir esa busqueda y en la practica se pierde. Esto aplica en cualquier respuesta donde Copilot este desarrollando, revisando o explicando el proyecto, no solo en documentos formales de trazabilidad.

### Referencias de estado, concurrencia y reglas de flujo

La regla también cubre cada pendiente, hallazgo, decisión o garantía. Toda
referencia a una parte concreta del código debe usar un enlace Markdown clicable
que apunte directamente a una ubicación real, existente y absoluta del archivo,
incluida su línea. No usar plantillas, rutas de ejemplo, marcadores ni rutas
relativas. Si el punto involucra varias ubicaciones o proyectos, incluir un
enlace absoluto por cada una; un símbolo sin enlace no es suficiente.

### Auditoría obligatoria de referencias antes de responder

Recorrer el resultado completo antes de enviarlo, incluidas tablas, listas,
paréntesis y texto en línea. Cada referencia concreta debe ser un enlace Markdown
clicable a una ubicación real, existente y absoluta, incluida su línea. No dejar
un identificador o ubicación como texto suelto porque otra referencia cercana
tenga enlace. Si no se verificó la ubicación, declararla pendiente en vez de
afirmarla. Cargar `bos-reference-links` cuando haya referencias.

## Cierre

En la respuesta final, mencionar cualquier comportamiento previo preservado, cualquier regresion autorizada y las verificaciones ejecutadas.
