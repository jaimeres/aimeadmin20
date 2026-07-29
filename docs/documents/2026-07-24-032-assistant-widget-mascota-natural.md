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
- `docs/documents/2026-07-24-032-assistant-widget-mascota-natural.md`

## Respaldo

Las imágenes existentes se copiaron antes de cualquier sustitución a:

`backups/assistant-widget/2026-07-24-before-clean-mascot/`

## Pruebas necesarias

- Spec enfocado del componente: `6 SUCCESS`, incluida la expresión ante eliminación.
- Compilación de producción: correcta.
- Revisión visual de los doce estados y transparencia: correcta.
- La ejecución normal del runner completo sigue encontrando incidencias preexistentes ajenas al widget: rutas de fuentes globales no resueltas y referencias ausentes a `testing/crud-test.helpers`. El spec del widget se ejecutó de forma aislada sin modificar la configuración final del repositorio.

## Pendientes

Ninguno identificado dentro del alcance.
