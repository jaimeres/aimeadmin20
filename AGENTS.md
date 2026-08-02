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

## Regla de Referencias Verificables

Codex no debe mencionar una referencia (documento, escenario, commit, seccion, simbolo, regla o resumen) solo por numero o nombre corto, por ejemplo "el resumen del 039" o "el escenario 4". Siempre debe indicar como llegar a ella.

Toda referencia debe incluir:

- Codigo: ruta de archivo y linea (archivo.ts:123 o archivo.ts:45-51).
- Documentacion: ruta de archivo y ancla (docs/documents/YYYY-MM-DD-NNN-slug.md#escenario-NN).
- Enlace markdown clicable cuando el canal lo soporte.

Motivo: el proyecto tiene cientos o miles de lineas de codigo y de documentacion humana. Codex ya reviso y localizo la referencia; si no entrega la ruta exacta, el humano tiene que repetir esa busqueda y en la practica se pierde. Esto aplica en cualquier respuesta donde Codex este desarrollando, revisando o explicando el proyecto, no solo en documentos formales de trazabilidad.

### Referencias de estado, concurrencia y reglas de flujo

La regla anterior también aplica a cada punto de una lista de pendientes,
hallazgos, correcciones, decisiones o garantías. Toda referencia a una parte
concreta del código —variable, función, clase, campo, clave de configuración,
endpoint, condición, estado, prueba o bloque— debe acompañarse de un enlace
Markdown clicable a la ubicación exacta donde se declara o aplica.

El enlace debe apuntar directamente a una ubicación real, existente y absoluta
del archivo, incluida su línea. No usar plantillas, rutas de ejemplo, marcadores
ni rutas relativas. Si un mismo punto involucra más de una ubicación o más de un
proyecto, incluir un enlace absoluto independiente por cada ubicación relevante.

### Auditoría obligatoria de referencias antes de responder

Cuando la respuesta contenga referencias, el agente debe recorrer el resultado
completo antes de enviarlo. Cada referencia concreta debe ser un enlace Markdown
clicable a una ubicación real, existente y absoluta, incluida su línea; aplica
también dentro de tablas, listas, paréntesis y texto en línea. No puede quedar el
mismo identificador, ubicación o elemento de código como texto suelto porque otra
referencia cercana tenga enlace. Si un dato no fue localizado, debe declararse
pendiente de verificación, no afirmarse como hecho. Cargar y cumplir el skill
`bos-reference-links` en respuestas con referencias.

## Regla de dudas explícitas y alcance de los tres proyectos

Cuando un agente tenga una duda, ambigüedad, conflicto entre instrucciones o
necesite una decisión del usuario, debe plantearla de la forma más explícita
posible, sin importar el medio por el que surja: diálogo, prompt, comentario,
documentación, plan, herramienta o mensaje de otro agente.

La pregunta debe indicar el dato o decisión exacta que falta; el contexto
verificable que genera la duda (ruta, regla o comportamiento); las alternativas
reales y el efecto de cada una; la alternativa recomendada si hay evidencia; y
la acción bloqueada o el comportamiento que podría cambiar.

No se permiten preguntas vagas como: “¿qué hago?”, “¿lo cambio?” o “¿puedes
aclarar?”. Deben convertirse en preguntas accionables. Ejemplo:

```text
En src/app/purchases/request/request.component.ts:141 el formulario usa la
configuración de request-detail. ¿Debo conservar ese contrato (recomendado,
preserva la configuración actual) o sustituirlo por delivery-note? La segunda
opción cambia qué campos se renderizan y puede romper solicitudes existentes.
```

La expresión “los tres proyectos” se refiere exclusivamente a estos
repositorios bajo `/home/jaime/Escritorio/d/`:

- `/home/jaime/Escritorio/d/aimeServidor2`
- `/home/jaime/Escritorio/d/aimeAdmin20`
- `/home/jaime/Escritorio/d/jukaiagen`

Si se menciona un proyecto distinto o el alcance no coincide con esta lista,
el agente debe solicitar una aclaración explícita antes de actuar.

## Cierre

En la respuesta final, mencionar cualquier comportamiento previo preservado, cualquier regresion autorizada y las verificaciones ejecutadas.
