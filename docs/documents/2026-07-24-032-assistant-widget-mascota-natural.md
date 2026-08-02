# AssistantWidget: mascota limpia, estados naturales y rendimiento

- Fecha: 2026-07-24
- Consecutivo: 032
- Tipo: Cambio funcional

## Resumen solicitado

Mejorar la presentación del `AssistantWidget` tomando como referencia una mascota limpia con movimiento natural de ojos, eliminar el fondo azul y el texto del recurso Jukai, hacer perceptibles todos los estados disponibles y revisar el rendimiento. Antes de sustituir imágenes se pidió conservar un respaldo de los recursos existentes.

## Alcance

- Sustituir la base opaca por el icono oficial Jukai sin texto y con transparencia real.
- Renderizar por defecto una mascota ligera con una imagen base y expresiones CSS.
- Mover los ojos de forma suave hacia el cursor o el campo donde se escribe, con parpadeo y movimiento ambiental.
- Corregir las transiciones que impedían activar o abandonar varios estados.
- Mantener compatibilidad con `animationPath` para imágenes y Lottie personalizados.
- Corregir el registro y la limpieza de listeners globales.
- Reducir trabajo en detección de actividad mediante throttling, signals, `OnPush` y formulario reactivo.

## Escenario 01: Mascota natural y estados completos

### Comportamiento previo

- `assistant_logo_original.png` tenía un fondo azul claro opaco.
- Existían doce estados declarados, pero `setMood` bloqueaba `talk` y `think` con el chat abierto.
- La prioridad acumulada impedía regresar de estados como `confused`, `talk` o `think` a `idle`.
- `speed` no tenía un disparador.
- El seguimiento visual estaba deshabilitado por defecto y los cambios de Lottie producían miradas discretas, no continuas.
- Los listeners de arrastre se agregaban y eliminaban con resultados distintos de `bind`, por lo que no se liberaban.

### Decisiones

1. Se reutilizó `icononly_transparent.png`, ya incluido en los recursos oficiales suministrados, porque ya elimina el texto y conserva la identidad exacta. No se regeneró el logotipo con IA.
2. El recurso se recortó, normalizó a `512x512` y guardó como PNG RGBA en la ruta que consumen las animaciones existentes.
3. La mascota predeterminada usa una sola imagen y capas CSS para ojos, pupilas, insignias y expresiones.
4. `animationPath` sigue aceptando un string o el mapa completo de estados. Cuando se proporciona explícitamente se conserva el renderer de imagen/Lottie anterior.
5. El seguimiento de cursor queda habilitado por defecto, limitado a una actualización cada 90 ms. La posición de la pupila cambia con `transform`, sin recargar archivos.
6. Las acciones rápidas activan `speed`; la espera alterna `waiting` y `confused`; las miradas cubren las cuatro direcciones; chat, respuesta, error e inactividad conservan `talk`, `think`, `notify` y `yawning`.
7. El panel conserva envío, historial, atajo de teclado, arrastre, tips, endpoint y contexto.

### Validaciones aplicadas

- Se verificó canal alfa con mínimo `0` y máximo `1`.
- Se compararon hashes entre cada imagen original y su copia de respaldo antes de reemplazar el recurso.
- Se mantuvieron los doce valores de `AssistantMood`.
- Se agregó limpieza con las mismas referencias de listener usadas durante el registro.
- Se respetó `prefers-reduced-motion`.
- Se revisaron visualmente los doce estados en una cuadrícula renderizada con Chrome.
- `npx ng build --configuration production`: correcto. El estilo del componente queda en `3.84 kB`, por debajo del límite de error de `4 kB`.

## Escenario 02: Cobertura de regresión

Se agregaron pruebas para:

1. Renderer limpio predeterminado.
2. Transición `idle → talk → idle`.
3. Exposición de los doce estados.
4. Compatibilidad con una ruta de imagen personalizada.
5. Rechazo de mensajes vacíos mediante el control reactivo.

## Escenario 03: Expresión de espanto ante una eliminación

### Solicitud

Mostrar una expresión de espanto cuando el usuario vaya a eliminar un elemento, siempre que la detección no sea costosa para el rendimiento.

### Decisiones

1. Se mantiene un único listener delegado de `click`: reemplaza al listener de actividad previo, por lo que no aumenta la cantidad de listeners globales permanentes.
2. El listener se ejecuta en fase de captura para mostrar la expresión antes de que se procese la eliminación.
3. Solo se inspecciona el control accionable más cercano y sus metadatos inmediatos. Se reconocen textos como `Eliminar`, `Borrar`, `Delete`, `Trash`, `Remove` y `Quitar`, además de iconos comunes `pi-trash`, `fa-trash` y `bi-trash`.
4. No se agregan `MutationObserver`, polling, búsquedas completas del DOM ni nuevos recursos gráficos.
5. La expresión `frightened` usa ojos con pupilas pequeñas y una insignia `!!` durante 2.2 segundos. Después vuelve a `think`, `talk` o `idle` según el contexto previo.
6. `AssistantMood` y el mapa Lottie de doce estados permanecen compatibles. Si existe una configuración Lottie personalizada, `frightened` reutiliza visualmente `notify` como fallback.

### Pruebas

- Se comprueba que los trece estados visuales, incluida la nueva expresión, sean publicables.
- Se simula un clic sobre un control con icono `pi-trash` y se valida `frightened` con la etiqueta `¡Cuidado!`.

## Escenario 04: Acciones visibles durante el trabajo del agente

### Solicitud

Hacer perceptibles los cambios de estado con lentes al pensar, una lupa al buscar, un cuerpo al trabajar rápidamente y una postura cansada al acercarse el estado de sueño. Tras revisar la primera versión en video, se pidió sustituir el cuerpo de líneas por un robot reconocible, con algo colgante y una marcha simulada. La cabeza debe seguir siendo el botón y el coste de rendimiento debe mantenerse bajo.

### Comportamiento previo

- El `signal` de estado sí cambiaba, pero varios estados reutilizaban la misma cabeza y solo mostraban una insignia pequeña.
- Durante una petición solo se veía `think` hasta recibir la respuesta; el contrato HTTP no informa herramientas o etapas internas del agente.
- `speed` y `yawning` no tenían cuerpo ni accesorios propios.

### Decisiones

1. Se agregó un subcomponente standalone `OnPush` dedicado únicamente al dibujo SVG. Al estar en reposo no renderiza ningún SVG.
2. Una petición pendiente inicia con lentes en `think`; a los 900 ms muestra la lupa en `searching` y, si continúa pendiente otros 1.5 segundos, muestra el cuerpo rápido en `working`.
3. `speed` reutiliza el cuerpo rápido y `yawning` muestra el cuerpo con balanceo cansado. El cuerpo definitivo tiene torso sólido, panel frontal, hombros, manos, piernas, botas y un bolso lateral colgante.
4. Las animaciones usan únicamente `transform` y `opacity`, respetan `prefers-reduced-motion` y no agregan imágenes, solicitudes de red, polling, listeners ni temporizadores recurrentes.
5. `AssistantMood` conserva sus doce estados públicos. `searching` y `working` son expresiones locales; los mapas Lottie personalizados reutilizan `think` y `speed` como fallback.
6. `searching` representa visualmente el tiempo de espera: no afirma que el agente haya invocado una herramienta de búsqueda, porque la respuesta actual no publica eventos de progreso.
7. Un único `computed` selecciona el modo visual: lentes, lupa o cuerpo. Nunca se renderizan simultáneamente. Todos los SVG tienen `pointer-events: none`, por lo que la cabeza conserva la única zona interactiva.
8. La marcha alterna brazos y piernas, desplaza ligeramente el torso y hace oscilar el bolso. El estado cansado conserva el cuerpo, pero desactiva la marcha y aplica un balanceo lento.

### Rendimiento y validaciones

- Solo existe un temporizador de etapa activo durante la petición y se limpia al responder o destruir el componente.
- El SCSS principal queda en `3.89 kB`, debajo del límite de error de `4 kB`; el estilo del subcomponente queda en `2.58 kB`, debajo de su límite de error de `4 kB`.
- `npx ng build --configuration production`: correcto.
- Specs aislados del widget y del subcomponente: `9 SUCCESS`.
- Se revisaron visualmente reposo, lentes, lupa, cuerpo robot caminando con bolso y cuerpo cansado con la imagen transparente vigente.

### Caracterización remota analizada, no implementada

Es viable recibir desde el servidor una caracterización por evento, pero no debe descargarse HTML, CSS, JavaScript, SVG o Lottie arbitrario. La alternativa segura es un manifiesto autenticado que entregue un identificador de tema, vigencia y referencias a recursos rasterizados previamente aprobados. El cliente debe aplicar allowlist de orígenes y tipos, límites de tamaño, HTTPS, fallback local, caché versionada y una prioridad determinista entre eventos como Día de Muertos, Independencia de México, Navidad y Año Nuevo.

## Comportamiento previo preservado

- Contrato de `animationPath`.
- Flags de inactividad, escritura, lentitud y cursor.
- Endpoint, contexto y tips configurables.
- Arrastre dentro de los límites de la ventana.
- Envío con botón o `Ctrl/Cmd + Enter`.
- Mensajes de respuesta vacía y función deshabilitada.
- Retorno automático a `idle` después de responder si el panel se cerró durante la solicitud.

## Archivos modificados

- `public/assets/assistant/assistant_logo_original.png`
- `src/app/components/assistant-widget/assistant-widget.component.ts`
- `src/app/components/assistant-widget/assistant-widget.component.html`
- `src/app/components/assistant-widget/assistant-widget.component.scss`
- `src/app/components/assistant-widget/assistant-widget.component.spec.ts`
- `src/app/components/assistant-widget/assistant-mascot-action/assistant-mascot-action.component.ts`
- `src/app/components/assistant-widget/assistant-mascot-action/assistant-mascot-action.component.html`
- `src/app/components/assistant-widget/assistant-mascot-action/assistant-mascot-action.component.scss`
- `src/app/components/assistant-widget/assistant-mascot-action/assistant-mascot-action.component.spec.ts`
- `docs/documents/2026-07-24-032-assistant-widget-mascota-natural.md`

## Respaldo

Las imágenes existentes se copiaron antes de cualquier sustitución a:

`backups/assistant-widget/2026-07-24-before-clean-mascot/`

## Pruebas necesarias

- Specs enfocados del widget y sus acciones visuales: `9 SUCCESS`.
- Compilación de producción: correcta.
- Revisión visual de los estados previos, transparencia y nuevas acciones: correcta.
- La ejecución normal del runner completo sigue encontrando incidencias preexistentes ajenas al widget: rutas de fuentes globales no resueltas y referencias ausentes a `testing/crud-test.helpers`. El spec del widget se ejecutó de forma aislada sin modificar la configuración final del repositorio.

## Pendientes

- La caracterización remota segura requiere definir y aprobar el contrato de manifiesto, almacenamiento, allowlist y precedencia de eventos antes de implementarla.
