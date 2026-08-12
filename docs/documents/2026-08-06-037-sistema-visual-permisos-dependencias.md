# Propuesta: sistema visual de permisos y dependencias de formularios

## Datos

- Fecha: 2026-08-06.
- Consecutivo: 037.
- Tipo: propuesta técnica con fases 1 y 2 implementadas e integración CRUD de usuarios.
- Proyecto principal: cliente `aimeAdmin20`.
- Proyecto relacionado: servidor `aimeServidor2`.

## Escenario 01: base operativa del editor estricto de permisos

<!-- [[[II ESC:037-01 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-01 -->

Se implementó la primera fase en administración de usuarios. La interfaz usa
exclusivamente componentes PrimeNG 20. El editor de permisos usa composición de
servicios porque no administra por sí mismo un recurso CRUD; la pantalla que lo
contiene se integró posteriormente al CRUD estándar en el escenario 03.

La fuente de verdad continúa siendo
[`PermissionsMixin.mixin_permissions`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/mixin/permissionmixin.py:133).
El cliente construye su schema en tiempo de ejecución únicamente con las hojas
recibidas y validadas por
[`parsePermissionTreeResponse()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/schemas/permissions.schema.ts:54).
Cada hoja debe contener exactamente un valor booleano, una etiqueta, el campo
de almacenamiento y una posición válida. Una ruta adicional o una rama que
pretenda introducir otro nivel se rechaza; al guardar,
[`projectPermissionTree()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/schemas/permissions.schema.ts:108)
proyecta los valores editados sobre el árbol originalmente declarado. Por ello,
el cliente no puede crear una ruta no publicada por el mixin.

La carga propia de cadenas y árbol ahora es atómica mediante
[`PermissionsService.refresh()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/services/permissions.service.ts:94),
y la persistencia de otro usuario aplica nuevamente la proyección estricta en
[`PermissionsService.saveForUser()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/services/permissions.service.ts:164).
El guard reintenta cargar el árbol antes de negar una ruta semántica cuando aún
no existe información local, en
[`evaluateAfterLoad()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/guards/permission.guard.ts:28).

La interfaz usa búsqueda, pestañas, árbol, toggles, confirmación de operaciones
masivas y revisión previa al guardado en
[`PermissionsTreeComponent`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/components/permissions-tree/permissions-tree.component.ts:73).
Las acciones granulares se muestran bajo su acción padre; otorgar una granular
activa el padre y retirar el padre desactiva sus granulares. Las etiquetas se
muestran tal como llegan del servidor, por lo que se conservan los nombres en
español. En esta fase se eligió selección directa en vez de arrastrar y soltar:
para un árbol disperso es más rápido, funciona en teclado y móvil y reduce
asignaciones accidentales.

La integración está en la administración real de usuarios de
[`UserList`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/pages/usermanagement/userlist.ts:21).
Consultar requiere los permisos de listado declarados por la ruta y editar
requiere `users.user-permissions.update`; el servidor continúa siendo quien
autoriza definitivamente cada lectura o escritura.

No se agregó ni modificó configuración. Se revisaron los builders
`app-custom-local-settings` y `app-child-form-fields-builder` como referencias
de interacción PrimeNG, pero la fase 1 consume solamente el contrato de permisos.
El catálogo de dependencias de dropdowns, choices y campos hijos permanece para
las fases 2 y 3, pues requiere resolver la configuración efectiva del usuario
objetivo y no debe inferirse desde la configuración del administrador.

Validación realizada:

- 7 pruebas focalizadas exitosas: schema estricto, carga atómica, proyección al
  guardar, agrupación granular y dependencia padre-hijo.
- `npm run build` exitoso.
- La suite completa ejecutó 218 pruebas: 163 exitosas y 55 fallidas por fixtures
  preexistentes sin proveedores Angular o mocks antiguos de `CRUD`; ninguna falla
  pertenece a los archivos de esta fase. Esos hallazgos no se corrigieron por ser
  unidades funcionales distintas.

<!-- ]]]FI -->

## Escenario 02: catálogo derivado por usuario

<!-- [[[II ESC:037-02 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-02 -->

Se implementó el catálogo de solo lectura para el usuario objetivo. El endpoint
es `GET /v1/permissions/<user_id>/catalog/`, exige el mismo permiso administrativo
de listado que la consulta del árbol, rechaza usuarios de otro tenant salvo un
superusuario real y responde como `permission-catalog`.

El generador del servidor combina sin persistir:

1. El árbol enriquecido derivado exclusivamente de `mixin_permissions`.
2. Los recursos y campos de la configuración del tenant.
3. Una personalización del usuario solamente cuando está acotada de forma
   inequívoca a aplicación/recurso y el contrato vigente permite anularla.
4. Campos raíz y `children.fields.static|dynamic|derived`.
5. Fuentes locales, acceso completo, `ref_select` explícito y compatibilidad
   implícita legado.
6. El índice inverso permiso → formularios/campos consumidores.

Las configuraciones de sucursal, empresa y grupo dependen del registro concreto
que se esté editando. El catálogo general no elige una sucursal arbitraria: informa
el número de contextos disponibles y muestra una advertencia. Esta limitación es
expresa y evita presentar como efectiva una configuración contextual incorrecta.

Cuando `option_label` necesita varios atributos y `mixin_ref_label` no los declara,
el catálogo prefiere `list`; si el recurso no tiene `list` asignable, muestra una
advertencia. Choices y opciones locales quedan clasificadas como locales, sin
permisos remotos falsos.

En el cliente se agregó `PermissionCatalogService`, un schema estricto y una
pantalla PrimeNG 20 de inspección con búsqueda, filtro por aplicación, dependencias
por campo e impacto inverso por permiso. Vive bajo usuarios en:

```text
/profile/user/<uuid>/permission-catalog
```

La pestaña de permisos del diálogo de edición ofrece **Ver catálogo y dependencias**
para abrirla. La pantalla es de consulta; la planificación y asignación automática
por formulario permanecen para la fase 3.

Validación de la fase:

- 3 pruebas de servidor exitosas: descubrimiento, configuración real, ruta,
  contrato de respuesta y reutilización del control administrativo de listado;
- schema y servicio cliente cubiertos junto con las pruebas de fase 1: 10 pruebas
  focalizadas exitosas;
- `manage.py check` sin incidencias;
- build de producción del cliente exitoso.

<!-- ]]]FI -->

## Escenario 03: CRUD estándar de usuarios con permisos en edición

<!-- [[[II ESC:037-03 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-03 -->

La administración de usuarios usa ahora el estándar del cliente: la página
[`UserList`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/pages/usermanagement/userlist.ts:21)
hereda de [`CRUD`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/utils/crud.class.ts:18),
configura el recurso `users/local-user`, el tipo `user` y el módulo `U`, y conserva
la tabla, botonera, selección, alta, edición, eliminación, importación y ajustes
locales del sistema. El servicio específico
[`UserManagementService`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/pages/usermanagement/user.service.ts:8)
solo delimita el recurso; no duplica responsabilidades de `CRUDService`.

El formulario vive en un diálogo PrimeNG 20 y mantiene **General** como pestaña
de alta y edición. Cuando se edita un usuario y el administrador posee
`users.user-permissions.list`, se agrega **Permisos** dentro del mismo diálogo en
[`userlist.html`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/pages/usermanagement/userlist.html:80).
La pestaña no aparece en creación porque todavía no existe un identificador al
cual asignar bits. Modificar permisos exige además
`users.user-permissions.update`; sin ese permiso el árbol queda en consulta.

El guardado general y el guardado de permisos permanecen separados. El pie del
CRUD solo aparece en **General** y el editor exige revisar sus cambios antes de
persistirlos. Esto evita que «Guardar usuario» sugiera que también confirmó los
cambios de permisos o viceversa. El catálogo detallado continúa accesible desde
la propia pestaña.

La ruta de listado exige únicamente `users.user.list`, porque el CRUD de usuarios
no debe desaparecer para un administrador que carezca del permiso adicional de
consultar permisos. La ruta histórica `/profile/create` redirige al listado, donde
el alta se abre con el botón estándar **Nuevo**.

El componente embebido invalida su clave de carga al cerrar el diálogo en
[`PermissionsTreeComponent`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/components/permissions-tree/permissions-tree.component.ts:150),
de modo que una reapertura consulta el estado actual y no conserva un árbol
obsoleto de la apertura anterior.

No se modificó `crud.class`, ni se introdujo otra jerarquía de permisos. La fuente
de verdad de rutas y posiciones continúa siendo `mixin_permissions`, validada por
el schema estricto del cliente antes de mostrarse o guardarse.

La auditoría extremo a extremo detectó y corrigió en el servidor la limitación
previa del formulario general: `users.user` ya declara layout, columnas y campos,
y el metadata publica los controles requeridos por alta y edición. Las
configuraciones de tenants previamente persistidas todavía deben recibir el nodo
`users.user` actualizado mediante el procedimiento operativo de configuración;
no se aplica una migración automática sobre sus personalizaciones.

Validación realizada:

- compilación Angular y generación completa de bundles exitosas;
- 2 pruebas focalizadas del árbol de permisos exitosas;
- solo permanecen advertencias preexistentes de presupuesto, dependencias CommonJS
  y una hoja de estilos no localizada;
- el contrato servidor se cubrió en el escenario 04 del documento de usuario local.

<!-- ]]]FI -->

## Escenario 04: Los permisos secundarios no son includes del CRUD

<!-- [[[II ESC:037-04 DOC:docs/documents/2026-08-06-037-sistema-visual-permisos-dependencias.md#escenario-04 -->

Los bloques `secondary_permissions`, `secondary_permissions_data` y
`permissions_tree` no son columnas ni rutas JSON:API del CRUD general. También
`person_data` y `employee_data` son contratos anidados del formulario, no los
nombres de las relaciones incluibles. `UserList` los excluye expresamente de la
generación de columnas, incluidos los aliases legacy que puedan permanecer en
metadata o configuración almacenada.

La exclusión corrige la solicitud inválida `include=secondary_permissions` sin
ocultar los permisos al administrador. La pestaña **Permisos** no consume el
detalle JSON:API de usuario: consulta los endpoints dedicados de `strings` y
`tree`, que mantienen las cadenas raíz y secundarias bajo el control granular de
`user-permissions.list` y `user-permissions.update`.

El servidor dejó de publicar los contratos de escritura de permisos en el
metadata de General y registró sus campos ocultos de usuario en `cols`. Con ello,
la configuración nueva y los aliases legacy quedan cubiertos sin agregar una
segunda fuente de verdad para rutas o posiciones.

<!-- ]]]FI -->

## Resumen

Diseñar un editor de permisos intuitivo que permita asignar por formulario o
tarea, soporte arrastrar y soltar y explique todas las dependencias indirectas.
Un formulario puede contener dropdowns, autocompletes, choices, listas, tablas
o campos hijos que consumen recursos dispersos. El administrador debe saber qué
permiso mínimo necesita cada campo y qué se afecta al retirar un permiso.

La existencia y posición de cada permiso continuará teniendo como única fuente
de verdad
[`PermissionsMixin.mixin_permissions`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/mixin/permissionmixin.py:133).
El cliente no podrá inventar permisos, acciones ni posiciones.

## Decisión: composición del editor dentro del CRUD de usuarios

El componente reutilizable del árbol de permisos **no debe heredar de**
[`CRUD`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/utils/crud.class.ts:18),
pero la administración del recurso usuario sí hereda de esa clase.

Esa clase administra navegación, posición activa, formularios, selección,
guardado, archivos y estado de páginas CRUD. Son responsabilidades correctas para
[`UserList`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/pages/usermanagement/userlist.ts:21),
pero ajenas a [`PermissionsTreeComponent`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/components/permissions-tree/permissions-tree.component.ts:73).

Se usará composición:

- [`PermissionsService`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/services/permissions.service.ts:42)
  para leer, evaluar y guardar permisos.
- [`AuthService.ensureConfigModules()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/services/auth.service.ts:711)
  cuando sea necesario cargar configuración del usuario autenticado.
- [`CRUDService.getAppType()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/utils/services/crud.service.ts:340)
  para reutilizar la resolución vigente de `data_type.type`.
- Un servicio nuevo, acotado, para catálogo y dependencias.

Por ello se usa herencia únicamente en la página dueña del CRUD y composición para
el editor embebido. No fue necesario modificar ni extraer lógica de `crud.class`.

## Estado actual verificado

### Árbol y persistencia

El servidor transforma cadenas binarias en un árbol aplicación → recurso → acción
mediante
[`decode_strings_nested_by_app()`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/permissions_codec.py:154).
Las hojas granulares se publican como rutas estables, por ejemplo
`update.start_date`.

[`enrich_tree_with_labels()`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/permissions_codec.py:215)
agrega etiqueta, cadena de almacenamiento y posición. El cliente no necesita
hardcodear bits.

La lectura y escritura están en
[`UserPermissionsView`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/views/__init__.py:236),
y la escritura exige permiso administrativo en
[`UserPermissionsView._check_perm()`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/views/__init__.py:259).

### Cliente existente

Ya existe
[`PermissionsTreeComponent`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/components/permissions-tree/permissions-tree.component.ts:73)
con búsqueda, pestañas, activación individual y operaciones masivas.
Su plantilla permite otorgar o retirar una aplicación completa en
[`permissions-tree.component.html`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/components/permissions-tree/permissions-tree.component.html:71),
pero no representa formularios, campos consumidores ni dependencias.

El selector `app-permissions-tree` está integrado como pestaña de edición en
[`UserList`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/pages/usermanagement/userlist.ts:21).
El catálogo de formularios, campos consumidores y dependencias quedó disponible
en la fase 2; la planificación y asignación por formulario continúa pendiente
para la fase 3.

La carga de otro usuario espera conjuntamente cadenas y árbol en
[`PermissionsService.loadForUser()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/services/permissions.service.ts:147).
La carga propia espera conjuntamente ambas respuestas en
[`PermissionsService.refresh()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/services/permissions.service.ts:94);
no publica un estado parcial de permisos.

### Dropdowns y acceso mínimo

Los tipos desplegables están centralizados en
[`DROPDOWN_TYPES_PAYLOAD`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/utils/dropdown-types.const.ts:14).
El autocomplete no se precarga porque consulta remotamente durante la escritura,
como distingue
[`DROPDOWN_TYPES_PRELOAD`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/utils/dropdown-types.const.ts:25).

La configuración decide la fuente: si `data_type.type` resuelve un recurso,
consulta al servidor; si no, usa opciones locales. El contrato está en
[`configurations/base.py`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/configurations/base.py:48)
y su plantilla dropdown en
[`configurations/base.py`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/configurations/base.py:500).

El servidor ya diferencia acceso completo, referencia reducida o ninguno en
[`AIME_apply_sparse_included()`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/viewsets.py:973)
y
[`AIME_apply_sparse_retrieve_related()`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/viewsets.py:1065).

Los atributos visibles en modo reducido se resuelven con
[`PermissionsMixin.AIME_resolve_ref_label()`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/mixin/permissionmixin.py:114).
Actualmente
[`PermissionsMixin.mixin_ref_label`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/mixin/permissionmixin.py:108)
está vacío y se usa el primer atributo del fallback. Por ello `ref_select` no
siempre será suficiente si un control concatena atributos o usa relaciones.

## Objetivos

1. Asignar permisos por tarea o formulario, no por posición binaria.
2. Mostrar todos los campos que necesitan permisos mínimos.
3. Resolver dependencias dispersas entre aplicaciones.
4. Elegir el acceso mínimo suficiente.
5. Explicar el impacto antes de retirar permisos compartidos.
6. Conservar una vista técnica para CRUD, campos especiales, alcances y acciones
   secundarias.
7. Mantener al servidor como autoridad definitiva.

## No objetivos

- Reordenar bits mediante drag-and-drop.
- Declarar permisos nuevos desde el cliente.
- Sustituir comprobaciones del servidor.
- Persistir la razón histórica por la que se concedió cada bit.
- Exigir permisos remotos para choices u opciones locales.
- Eliminar en esta unidad el comportamiento compatible de `ref_select`.

## Arquitectura propuesta

### Catálogo del usuario objetivo

Se propone un endpoint conceptual:

```text
GET /v1/permissions/<user_id>/catalog/
```

Debe combinar:

1. Permisos declarados en `mixin_permissions`.
2. Etiquetas y metadatos del árbol actual.
3. Configuración efectiva del **usuario objetivo**.
4. Recursos consumidos por cada campo.
5. Modos de acceso que satisfacen cada consumo.

No se debe analizar solamente la configuración cargada por el administrador,
porque puede ser diferente de la del usuario editado. El servidor debe reutilizar
el resolvedor vigente de configuración efectiva, sin duplicar su merge.

Contrato conceptual:

```json
{
  "data": {
    "type": "permission-catalog",
    "id": "<user-id>",
    "attributes": {
      "permissions": {
        "assets": {
          "maintenance": {
            "update": {
              "value": true,
              "label": "Modificar mantenimiento",
              "field_permissions": "permissions2",
              "position": 49,
              "kind": "crud"
            },
            "update.start_date": {
              "value": false,
              "label": "Modificar fecha inicio",
              "field_permissions": "assets_per",
              "position": 17,
              "kind": "field"
            }
          }
        }
      },
      "forms": {
        "purchases.request.create": {
          "label": "Crear solicitud",
          "direct_permission": "purchases.request.create",
          "fields": [
            {
              "path": "product",
              "label": "Producto",
              "control_type": "auto-complete",
              "source_resource": "product",
              "access": {
                "alternatives": [
                  "products.product.list",
                  "products.product.ref_select"
                ],
                "preferred": "products.product.ref_select"
              },
              "required": true
            }
          ]
        }
      },
      "consumers_by_permission": {
        "products.product.ref_select": [
          {"form": "purchases.request.create", "field": "product"}
        ]
      }
    }
  }
}
```

Estas claves describen un contrato propuesto; no serán activas hasta implementar
endpoint, serializer y pruebas.

### Servicio del cliente

Crear `PermissionCatalogService` con responsabilidades limitadas:

- Cargar el catálogo del usuario objetivo.
- Normalizar formularios, campos y permisos.
- Construir índices de búsqueda.
- Resolver dependencias directas y transitivas.
- Calcular el conjunto mínimo.
- Construir permiso → formularios/campos afectados.
- Preparar un plan antes de guardar.

No duplicará lectura de strings ni persistencia; eso permanece en
`PermissionsService`.

### Plan local

```typescript
interface PermissionChangePlan {
  baseline: Set<string>;
  proposed: Set<string>;
  added: PermissionChange[];
  removed: PermissionChange[];
  satisfiedDependencies: PermissionDependency[];
  brokenDependencies: PermissionImpact[];
  warnings: PermissionWarning[];
}
```

El plan no se persiste. Se recalcula desde el árbol recibido y la selección
actual, por lo que no crea otra fuente de verdad.

## Descubrimiento de dependencias

El analizador recorrerá recursivamente:

- Campos raíz.
- Dropdown, dropdown-choice, autocomplete, tree-select y listbox.
- Multi-select, multi-choice y select-button.
- Columnas de tablas declarativas.
- `children.fields.static`, `dynamic` y `derived`.
- `form_fields` y `child_form_fields` efectivos.
- Campos personalizados del usuario.

Para cada control se resolverá `data_type.type` usando
`CRUDService.getAppType()`. Si no resuelve recurso y tiene options o choices,
se clasificará como “sin permiso adicional”.

No se creará otro normalizador de guiones y guiones bajos.

## Regla de acceso mínimo

| Consumo | Acceso mínimo |
|---|---|
| Choices u options locales | Ninguno |
| Solo id, type y etiqueta permitida | `ref_select` |
| El usuario ya tiene `list` | Dependencia satisfecha |
| Etiquetas autorizadas por `mixin_ref_label` | `ref_select` |
| Atributos no autorizados en modo reducido | `list` |
| Relaciones, includes o derivados ampliados | `list` |
| Recurso sin permiso declarado | Error de catálogo; no inventar |
| Recurso sin bit expreso pero permitido por compatibilidad | “Implícito legado” |

Una dependencia será una alternativa lógica:

```text
product.list OR product.ref_select
```

Si ninguno existe, se propondrá `ref_select` cuando alcance; si el control
necesita información completa, se propondrá `list`.

## Interfaz

### Modo predeterminado: por formulario

```text
┌──────────────────────┬──────────────────────────────┬─────────────────────────┐
│ Formularios          │ Necesidades del formulario  │ Plan de permisos        │
│ Buscar...            │ Crear solicitud             │ ✓ Crear solicitud       │
│ Activos              │ Producto       mínimo ✓     │ ✓ Seleccionar producto  │
│  Mantenimiento       │ Moneda         mínimo ✓     │ ✓ Seleccionar moneda    │
│ Compras              │ Activo         mínimo ✓     │ ✓ Seleccionar activo    │
│  Solicitud           │ Prioridad      local         │ 1 directo + 3 mínimos  │
│  Pedido              │                              │ [Revisar y guardar]     │
│ [arrastrar →]        │                              │                         │
└──────────────────────┴──────────────────────────────┴─────────────────────────┘
```

Permitirá buscar por aplicación, formulario, acción, campo o recurso; arrastrar
un formulario o acción; usar un botón `Agregar`; expandir consumidores; y ver
por qué se incluyó cada permiso.

### Modo avanzado

Reutilizará y extenderá `PermissionsTreeComponent`:

```text
Modificar mantenimiento
├── Modificar fecha de inicio
```

Categorías:

- CRUD.
- Campo especial.
- Alcance.
- Referencia mínima para dropdown.
- Auditoría o acción secundaria.

Las posiciones solo aparecerán en “Detalles técnicos”.

### Arrastrar y soltar

PrimeNG Tree instalado soporta nodos arrastrables, destinos y validación del drop,
según
[`primeng/tree/index.d.ts`](/home/jaime/Escritorio/d/aimeAdmin20/node_modules/primeng/tree/index.d.ts:271).

Reglas:

- Arrastrar asigna o retira; nunca cambia posiciones.
- Se puede arrastrar aplicación, formulario, acción o permiso.
- El destino valida el drop antes de modificar el plan.
- Arrastrar un formulario propone dependencias.
- Retirar abre el impacto si existen consumidores.
- Botones y teclado ofrecen el mismo flujo.
- En móvil se usa un asistente, sin depender del gesto.

### Confirmación al agregar

```text
Crear solicitud requiere:

Directo
✓ Crear solicitudes

Mínimos para campos
✓ Producto — campo “Producto”
✓ Moneda   — campo “Moneda”
✓ Activo   — campo “Activo relacionado”

Sin permiso adicional
• Tipo de solicitud — choices locales
• Prioridad — options locales
```

Los obligatorios y mínimos quedan seleccionados por defecto; los ampliados son
optativos.

### Retirada e impacto

```text
Seleccionar producto en combo es utilizado por:

• Crear solicitud — Producto
• Modificar solicitud — Producto
• Crear pedido — Producto y producto alternativo
• Agregar partida de remisión — Producto
```

Opciones:

1. Conservar.
2. Retirar solo la operación seleccionada.
3. Retirar aceptando todos los campos afectados.

No se retirará automáticamente una dependencia todavía requerida por otra
operación concedida.

### Resumen previo

```text
Resumen

+ 3 permisos directos
+ 8 mínimos para campos
- 1 permiso

Advertencias
• Quitar “Seleccionar moneda” afecta 3 formularios.
• “Proveedor” requiere acceso completo porque muestra datos fiscales.
```

## Clasificación visual

- **Obligatoria:** el servidor la exige para la acción.
- **Mínima de interfaz:** necesaria para cargar un control remoto.
- **Opcional ampliada:** entrega información adicional.
- **Satisfecha:** cubierta por un permiso más amplio.
- **Implícita legado:** funciona por compatibilidad, sin bit asignable.
- **Inválida:** recurso o permiso no declarado.

Guardar una operación sin un mínimo exigirá confirmación:

```text
El usuario podrá abrir “Crear solicitud”, pero “Producto” no podrá cargar
opciones con la configuración efectiva actual.
```

## Permisos granulares

Un permiso como `update.start_date` no sustituye `update`. Se mostrará debajo
del padre y se evaluarán ambos:

```text
maintenance.update AND maintenance.update.start_date
```

El cliente ya admite acciones con puntos en
[`PermissionsService.has()`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/services/permissions.service.ts:194).
El catálogo debe declarar la relación padre para no mostrar el permiso granular
como suficiente por sí solo.

## Seguridad

1. La interfaz no construirá strings binarias manualmente.
2. Identificará hojas mediante rutas semánticas.
3. El servidor traducirá rutas a bits desde `mixin_permissions`.
4. Toda escritura conservará el permiso administrativo existente.
5. Una ruta desconocida nunca obtendrá una posición calculada por el cliente.
6. Guards, menús y controles son UX, no autorización definitiva.
7. Los endpoints conservarán sus validaciones actuales.

## Perfiles futuros

Después de estabilizar el catálogo podrán existir perfiles como “Auxiliar de
compras”, “Responsable de mantenimiento”, “Solo consulta” o “Copiar desde otro
usuario”. Guardarán rutas semánticas, no cadenas completas. El servidor validará
las rutas al aplicarlas. Quedan fuera de la primera entrega.

## Matriz del contrato

| Estructura | Productor | Consumidor | Estado | Acción |
|---|---|---|---|---|
| `mixin_permissions` | Servidor | Codec y permisos | Activa | Única autoridad |
| `mixin_permission_labels` | Servidor | Árbol | Activa | Ampliar metadatos |
| `data_type.type` | Configuración | Formulario cliente | Activa | Descubrir fuentes |
| `options`/choices | Configuración | Formulario cliente | Activa | Sin permiso remoto |
| `children.fields.*` | Configuración/overrides | Cliente y servidor | Activa | Recorrer los tres modos |
| `mixin_ref_label` | Servidor | Respuesta reducida | Activa con fallback | Auditar etiquetas |
| Árbol enriquecido | Servidor | `PermissionsService` | Activa | Reutilizar |
| Catálogo formulario–dependencia | Servidor | `PermissionCatalogService` | Activa | Contrato derivado de solo lectura |
| Editor visual | Cliente | Usuarios | Activa fase 1 | Mantener modo técnico |

## Fases

### Fase 1: base operativa

Implementada en el [escenario 01](#escenario-01):

1. Componente integrado en usuarios.
2. Carga concurrente propia corregida.
3. Granulares agrupados debajo del padre.
4. Resumen de diferencias previo al guardado.
5. Operaciones masivas conservadas con confirmación.
6. Schema estricto y proyección de rutas declaradas agregados.

### Fase 2: catálogo

Implementada en el [escenario 02](#escenario-02):

1. Endpoint creado para el usuario objetivo.
2. Configuración tenant/usuario resuelta sin mezclar contextos de registro.
3. Campos raíz e hijos static, dynamic y derived recorridos.
4. Fuentes locales, reducidas, completas y legado clasificadas.
5. `PermissionCatalogService` creado por composición.
6. Índice inverso construido.
7. URL de inspección agregada bajo usuarios.

### Fase 3: experiencia por formulario

1. Crear vista de tres paneles.
2. Buscar por formulario, acción, campo y recurso.
3. Implementar plan y dependencias automáticas.
4. Mostrar impacto al retirar.
5. Adaptar a móvil.

### Fase 4: drag-and-drop

1. Habilitar scopes de origen y destino.
2. Validar cada drop.
3. Conservar botones y teclado.
4. Probar asignaciones masivas y dependencias compartidas.

### Fase 5: `ref_select` explícito

1. Inventariar recursos remotos.
2. Detectar fallback legado.
3. Verificar etiquetas, filtros, includes y relaciones.
4. Declarar posiciones donde correspondan.
5. Migrar datos sin cambiar comportamiento.
6. Retirar fallback solo después de migración y pruebas.

Esta fase requiere diseño de posiciones y migración; no debe mezclarse con la
interfaz inicial.

## Pruebas

### Contrato y servicio

- Carga atómica de strings y árbol.
- Catálogo del usuario objetivo.
- Rechazo o exclusión segura de rutas no declaradas.
- Preservación de bits no enviados.
- Resolución snake_case/kebab-case con el helper vigente.

### Descubrimiento

- Dropdown con `ref_select`.
- Dropdown satisfecho por `list`.
- Choices locales sin permiso.
- Autocomplete remoto.
- Tree-select y multiselect.
- Children static, dynamic y derived.
- Tabla con varias columnas remotas.
- Campos que comparten un permiso.
- Etiqueta compuesta que requiere `list`.
- Recurso inexistente.

### Interfaz

- Clic y arrastre generan el mismo plan.
- Una operación agrega mínimos.
- Retirada compartida muestra consumidores.
- Granular aparece debajo del padre.
- Resumen coincide con lo enviado.
- Navegación por teclado y móvil.
- Error de guardado conserva el plan.

### Seguridad

- Sin permiso administrativo no se guarda.
- Una ruta manipulada no crea ni cambia bits.
- El servidor sigue denegando aunque el cliente muestre un control.
- Sin `list`, `ref_select` solo expone atributos autorizados.

## Criterios de aceptación

1. Se puede seleccionar “Crear solicitud” sin conocer bits.
2. Se muestran todos sus controles remotos.
3. Choices locales no generan dependencias falsas.
4. `list` satisface una necesidad de `ref_select`.
5. Retirar muestra formularios y campos afectados.
6. Arrastre y botón producen el mismo resultado.
7. Nunca se calculan posiciones desde el cliente.
8. Los granulares requieren su padre.
9. El editor usa composición; únicamente la página dueña del CRUD de usuarios
   hereda de `CRUD`.
10. No cambia el comportamiento actual del servidor.

## Riesgos y mitigaciones

### Configuración diferente entre administrador y usuario

Construir el catálogo en el servidor con la configuración efectiva del objetivo.

### `ref_select` implícito

Mostrar “implícito legado” y migrar recurso por recurso posteriormente.

### Etiquetas con varios atributos

Comparar `option_label`, búsqueda, includes y children contra
`mixin_ref_label`; elevar a `list` solo cuando sea indispensable.

### Asignación masiva accidental

Exigir vista previa y confirmación reforzada para módulos o aplicaciones.

### Dependencias duplicadas o circulares

Usar claves estables, conjunto de visitados y deduplicación por ruta, conservando
todos los consumidores como razones visibles.

## Comportamiento que se debe preservar

- No reordenar posiciones.
- Mantener cadenas como representación persistida.
- Mantener `mixin_permissions` como única fuente.
- `list` conserva acceso completo.
- `ref_select` conserva acceso reducido.
- Choices locales no hacen llamadas remotas.
- El servidor decide la autorización.
- Una edición parcial conserva lo no enviado.

## Archivos de fase 1 y previstos

La lista es orientativa y se confirmará por fase:

- [`permissions-tree.component.ts`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/components/permissions-tree/permissions-tree.component.ts:73).
- [`permissions-tree.component.html`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/components/permissions-tree/permissions-tree.component.html:1).
- [`permissions.service.ts`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/services/permissions.service.ts:94).
- [`permissions.schema.ts`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/auth/schemas/permissions.schema.ts:1).
- [`userlist.ts`](/home/jaime/Escritorio/d/aimeAdmin20/src/app/pages/usermanagement/userlist.ts:24).
- Servicio y componentes nuevos acotados para catálogo, plan e impacto.
- Endpoint/serializer junto a
  [`UserPermissionsView`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/views/__init__.py:236).
- Metadatos derivados de
  [`PermissionsMixin.mixin_permissions`](/home/jaime/Escritorio/d/aimeServidor2/apps/utils/mixin/permissionmixin.py:133).

No se modifica `crud.class.ts`. La página de usuarios es la única subclase de
`CRUD`; los componentes y servicios de permisos continúan por composición.

## Validación

- Se recorrió el contrato desde `mixin_permissions` hasta codec, endpoint,
  servicio y componente.
- Se verificó el acceso reducido.
- Se verificaron fuentes remotas y locales.
- Se verificó el resolvedor de tipos.
- Se verificó el soporte de drag-and-drop instalado.
- La fase 1 cuenta con 7 pruebas focalizadas exitosas y build de producción
  exitoso. La suite global conserva 55 fallos preexistentes ajenos a esta unidad.

## Pendientes para fases posteriores

1. Definir el resolvedor del servidor para configuración efectiva del objetivo.
2. Inventariar recursos remotos sin `ref_select` expreso.
3. Auditar `option_label`, filtros, includes y children ampliados.
4. Dejar perfiles reutilizables para una unidad posterior al catálogo.
