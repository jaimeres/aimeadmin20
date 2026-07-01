<!-- [[[II ESC:026-01 DOC:docs/documents/2026-07-01-026-compras-punto-partida.md#escenario-01 -->
# Compras punto de partida

## Fecha

2026-07-01

## Consecutivo

026

## Tipo

Cambio funcional

## Resumen fiel de lo pedido

El usuario pidio un punto de partida para la app de compras, verificando en el servidor los modelos y endpoints existentes. Aunque el modulo esta deshabilitado en servidor, el frontend debe quedar listo para funcionar cuando se habilite.

## Alcance del cambio

Se reviso el servidor en `/home/jaime/Escritorio/d/aimeServidor2` en modo lectura. En frontend se activo el menu base de compras y se alinearon pantallas existentes con los endpoints reales encontrados en el API.

## Escenario 01: Activar punto de partida de compras

Se confirmaron modelos, serializers y viewsets existentes para:

1. `request` y `request-detail`.
2. `supplier-request` y `supplier-request-detail`.
3. `delivery-note` y `delivery-note-detail`.
4. `bill`.
5. `supplier-product`.

En servidor se encontro que `aimeerp/urls.py` incluye `v1/purchases/`, pero `apps.purchases` esta comentada en `INSTALLED_APPS` y `apps/purchases/routers.py` mantiene comentados los registros del router. Por eso el frontend queda preparado contra los nombres reales de endpoint, sin cambiar el servidor desde este workspace.

## Decisiones tomadas

1. Publicar en el menu solo las rutas con contrato de servidor verificado: solicitudes, pedidos, ofertas/precios, remisiones y facturas.
2. No publicar subastas, pagos ni factura directa porque no se encontro endpoint real correspondiente.
3. Corregir las pantallas que apuntaban a endpoints plurales o placeholders para usar los recursos reales: `supplier-product`, `delivery-note` y `bill`.
4. Conservar placeholders previos para no romper rutas existentes no publicadas.

## Validaciones aplicadas

1. Lectura de `apps/purchases/models`, `serializers`, `views` y `routers.py` en el servidor.
2. Lectura de `aimeerp/settings/base.py` y `aimeerp/urls.py` para confirmar el estado deshabilitado.
3. Comparacion con `src/app/purchases` y `src/app/layout/components/app.menu.ts`.

## Notas importantes

No se introdujo una regresion funcional de reglas de negocio. No se cambiaron defaults, validaciones, permisos, estados ni serializadores. El cambio es de cableado frontend y exposicion de menu.

Para funcionamiento completo del API aun falta habilitar `apps.purchases` en servidor y registrar los viewsets en `apps/purchases/routers.py`.

## Archivos modificados

1. `src/app/layout/components/app.menu.ts`
2. `src/app/purchases/services/purchase.service.ts`
3. `src/app/purchases/offers-prices/offers-prices.component.ts`
4. `src/app/purchases/delivery-notes/delivery-notes.component.ts`
5. `src/app/purchases/bills/bills.component.ts`
6. `docs/documents/2026-07-01-026-compras-punto-partida.md`

## Pendientes

1. Confirmar si el servidor debe habilitar compras ahora o si se mantiene apagado hasta nueva indicacion.
2. Agregar vistas frontend para detalles (`supplier-request-detail`, `delivery-note-detail`) si se requiere captura completa del flujo.
3. Definir comportamiento para subastas, pagos y factura directa cuando existan contratos de API.

## Pruebas sugeridas

1. Compilar el frontend.
2. Abrir el menu y navegar a `/purchases/requests`, `/purchases/supplier-request`, `/purchases/offers-prices`, `/purchases/delivery-notes` y `/purchases/bills`.
3. Con el backend habilitado, validar OPTIONS y listado para `purchases/request-detail`, `purchases/supplier-request`, `purchases/supplier-product`, `purchases/delivery-note` y `purchases/bill`.
<!-- ]]]FI -->
