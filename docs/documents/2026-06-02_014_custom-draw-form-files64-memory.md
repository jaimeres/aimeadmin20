# Custom Draw Form: reduccion de memoria en archivos y files64Signal

## Datos

- Fecha: 2026-06-02
- Consecutivo: 014
- Tipo: Cambio funcional

## Resumen

Se redujo la duplicacion de base64 en `custom-draw-form.component.ts` para campos `files`, camara, galeria, video, SafeCamera, Capacitor Camera, `files64Signal`, cache de formulario y `server_upload`, manteniendo el contrato visual y los endpoints existentes.

## Alcance

- Normalizar la identidad de archivos capturados por `field`, `key`, `file_name`, tamano, timestamp y hash simple.
- Mantener en `files64Signal` objetos de preview livianos con URL temporal cuando el origen es base64.
- Mantener en el `FormControl` de envio el base64 completo solo cuando el flujo lo requiere.
- Mantener controles locales separados por `key` con placeholders livianos cuando difieren del control de envio.
- Sanitizar el cache para no persistir base64 completo en campos con `server_upload.active === true`.
- Evitar duplicados al restaurar `files64Signal` desde cache.

<a id="escenario-01"></a>
## Escenario 01: Normalizar preview, envio y cache

`appendFile` ahora resuelve dos destinos: `sendField`, que conserva el objeto enviable para el backend, y `localField`, que conserva la separacion local del formulario cuando hay `key` por step o por campo. Si ambos difieren, el control local recibe una referencia liviana y el base64 completo queda solo en el control de envio.

El preview usa URL temporal generada desde el data URL para que `files64Signal` no mantenga otra copia base64 completa. Las URLs temporales se revocan al remover archivos, limpiar multimedia o destruir el componente.

El autoguardado y `_saveFormCacheNow` usan un payload filtrado y saneado. Cuando `server_upload.active === true`, los registros con base64 se guardan sin el contenido base64 completo.

<a id="escenario-02"></a>
## Escenario 02: Restaurar sin duplicar files64Signal

`restoreFiles64FromCache` reconstruye previews solo desde controles que contienen el archivo enviable real (`send_field`/`field`), ignora placeholders locales y registros cuyo base64 fue omitido por cache, y deduplica por identidad del archivo antes de poblar `files64Signal`.

Los borradores cargados desde cache se limpian antes de `patchValue` para evitar que placeholders sin base64 queden como si fueran archivos enviables.

<a id="escenario-03"></a>
## Escenario 03: Subida directa server_upload

`server_upload` sigue subiendo inmediatamente al endpoint actual y guarda en el formulario solo la relacion `{ id, type }`. En `files64Signal` se mantiene la entrada de preview/URL retornada por servidor, sin base64. Despues de agregar o remover relaciones se dispara guardado inmediato de cache.

## Decisiones tomadas

- No se cambiaron endpoints ni nombres de controles.
- No se elimino soporte base64; sigue existiendo en el `FormControl` de envio cuando el flujo de formulario lo necesita.
- Los controles locales separados por `key` se conservan porque forman parte del comportamiento esperado de steps/campos independientes.
- El hash es simple y barato: usa longitud y muestras del string para evitar recorrer/copiar mas de lo necesario.
- La deduplicacion no se aplica a arrays genericos del cache; solo a arrays que parecen registros de archivo.

## Validaciones aplicadas

- `npm run build` exitoso. Se mantienen warnings propios del proyecto sobre budgets, CommonJS y stylesheet no localizado.

## Notas importantes

- Si un campo tiene `server_upload.active === true` y se omite base64 del cache, al restaurar no se reinyecta un placeholder enviable. El usuario debe volver a capturar/subir si no existia relacion de servidor.
- `files64Action` sigue emitiendo el estado de preview para compatibilidad con el padre, pero el envio moderno sigue saliendo del `FormControl`.

## Archivos modificados

- `src/app/components/custom-draw-form/custom-draw-form.component.ts`
- `docs/documents/2026-06-02_014_custom-draw-form-files64-memory.md`

## Pendientes

- Validar manualmente en Android con camara SafeCamera, galeria base64 y `server_upload`.

## Pruebas sugeridas

- Capturar una foto con `upload.active=true` y confirmar que el backend recibe `*_documents` con base64.
- Capturar en un step con `key != field` y confirmar que el key local valida sin duplicar base64.
- Restaurar un borrador con imagen y confirmar que la preview aparece una sola vez.
- Usar `server_upload.active=true`, cerrar/reabrir y confirmar que el cache no contiene base64 completo.
