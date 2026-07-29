---
name: bos-config-contract-audit
description: Audita contratos de configuración BOS de extremo a extremo entre cliente y servidor. Usar obligatoriamente cada vez que se lea, explique o modifique una configuración, un consumidor de configuración, un serializer/viewset que la aplique, un builder/normalizador del cliente o documentación de sus claves; detecta campos muertos, duplicados, heredados accidentalmente, renombrados o con semánticas divergentes.
---

# BOS Config Contract Audit

## Objetivo

Evitar que una clave parezca válida sólo porque existe en un diccionario. Cada
clave debe tener productor, transporte, consumidor y efecto comprobables en el
cliente y/o servidor.

## Flujo obligatorio

1. Localizar la fuente efectiva:
   - plantilla base y diccionarios desestructurados;
   - override local/personalizado;
   - configuración persistida en BD;
   - normalizadores que transforman la respuesta.
2. Inventariar cada clave tocada y buscarla por nombre y por estructura en ambos
   repositorios. Revisar también accesos indirectos (`get`, spreads, merges,
   loops genéricos, schemas y helpers).
3. Seguir el contrato completo:
   - servidor: configuración, schema, view/viewset, serializer create/update,
     respuesta y documentación;
   - cliente: servicio/normalizador, form builder, control, tabla, payload,
     rehidratación y pruebas.
4. Comparar root, child, columna y derived. Distinguir herencia intencional de
   valores vacíos inyectados por una plantilla.
5. Clasificar cada clave con una de estas etiquetas:
   - `activa`: leída y produce un efecto;
   - `sólo-servidor` o `sólo-cliente`;
   - `duplicada`: otra clave cubre la misma responsabilidad;
   - `mal ubicada`: tiene consumidor, pero en otro nivel del contrato;
   - `write-only`: se publica pero nadie la lee;
   - `read-only`: el código la acepta pero ninguna configuración efectiva la emite;
   - `muerta`: no tiene un recorrido activo;
   - `legado documentado`: sólo aparece en trazabilidad histórica.
6. Antes de editar, presentar cualquier choque colateral con evidencia y riesgo.
   No corregir hallazgos adicionales sin autorización explícita.
7. Después de editar, repetir la búsqueda de claves legacy y verificar create,
   update/PATCH, valores omitidos, defaults, relaciones, tablas y rehidratación.

## Reglas de decisión

- Una coincidencia textual no demuestra uso: identificar la rama ejecutable.
- Un spread de una plantilla cuenta como productor y puede impedir herencia.
- No llamar “fallback” a `default.edit`; el permiso y la activación del valor son
  responsabilidades independientes.
- No fusionar claves de igual nombre si su nivel cambia la semántica. Documentar
  explícitamente contratos como `child.filter` frente a
  `child.data_type.filter`.
- No hardcodear nombres de dominio para reparar un contrato genérico. Los casos
  particulares permanecen en serializers/configuraciones del recurso.
- Si una clave está muerta y el usuario autorizó limpieza, eliminar productor,
  consumidor legacy, schema, pruebas obsoletas y documentación vigente. Conservar
  la trazabilidad histórica claramente marcada.

## Entrega mínima

Entregar una matriz breve:

| Ruta de configuración | Productor | Consumidores | Estado | Riesgo/acción |
|---|---|---|---|---|

Indicar además:

- comportamiento previo preservado;
- claves eliminadas y motivo;
- conflictos encontrados pero no modificados;
- validaciones ejecutadas y límites de la auditoría.

## Rutas BOS

Leer [repositorios-y-busquedas.md](references/repositorios-y-busquedas.md) para
las rutas y búsquedas mínimas de cliente y servidor.
