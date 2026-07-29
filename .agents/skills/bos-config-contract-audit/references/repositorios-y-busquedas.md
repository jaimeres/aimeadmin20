# Repositorios y búsquedas mínimas

## Rutas

- Cliente: `/home/jaime/Escritorio/d/aimeAdmin20`
- Servidor: `/home/jaime/Escritorio/d/aimeServidor2`

## Búsquedas

Ejecutar desde ambos repositorios, ajustando la clave:

```bash
rg -n "clave|ruta\.anidada" src apps docs .agents
rg -n "children|derived|default|data_type|filter" src apps docs
```

Buscar además:

- desestructuración: `**child_*`, spreads y merges;
- lecturas indirectas: `.get(...)`, indexación, `Object.entries/values`;
- create y update/PATCH;
- normalización de JSON:API, payload y rehidratación;
- schemas/validadores y documentación vigente;
- configuración personalizada y fuente persistida en BD.

No considerar “muerta” una clave hasta revisar las dos rutas y los consumidores
genéricos.
