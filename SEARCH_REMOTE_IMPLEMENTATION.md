# Implementación de Búsqueda Local/Remota

## 📋 Resumen de Cambios

Se implementó un sistema de búsqueda optimizado que permite al usuario elegir entre:
- **Búsqueda LOCAL** (🖥️): Solo busca en los ~10-20 items visibles en la página actual
- **Búsqueda REMOTA** (☁️): Envía la búsqueda al servidor para buscar en toda la base de datos

## ✅ Archivos Modificados

### 1. `crud.class.ts` - Lógica simplificada
- ✅ Removido `allItemsLocal` (ya no se necesita)
- ✅ Búsqueda local solo en `this.items()` (página actual)
- ✅ Búsqueda remota consulta al servidor
- ✅ Comentarios actualizados para reflejar la realidad: datos siempre paginados

### 2. `custom-table.component.ts` - Control de búsqueda
- ✅ Agregado `@Output() searchRemoteToggle`
- ✅ Agregado `searchRemoteEnabled` signal (false por defecto)
- ✅ Agregado `showSearchWarning` signal para mostrar leyenda
- ✅ Función `toggleSearchRemote()` para cambiar modo de búsqueda

### 3. `custom-table.component.html` - UI mejorada
- ✅ Botón de toggle con icono (🖥️ desktop / ☁️ cloud)
- ✅ Leyenda naranja cuando búsqueda local está activa
- ✅ Tooltip explicativo en el botón

## 🔧 Cómo Conectar en Componente Padre

### Opción 1: Binding directo en HTML

```html
<app-custom-table
  [value]="items()"
  [columns]="cols()"
  [selected]="selected()"
  [totalRecords]="totalRecords()[pos()]"
  (searchRemoteToggle)="onSearchRemoteToggle($event)"
  (lazyLoadAction)="onLazyLoad({event: $event, pos: pos()})"
  ...
>
</app-custom-table>
```

### Opción 2: Función en TypeScript del componente padre

```typescript
// En tu componente que usa custom-table
onSearchRemoteToggle(isRemote: boolean) {
  this.searchRemote = isRemote;
  console.log('Búsqueda remota:', isRemote ? 'HABILITADA' : 'DESHABILITADA');
}
```

### Opción 3: Si heredas de CRUD class

Si tu componente hereda de `CRUD`, el `searchRemote` ya existe:

```typescript
// En tu componente que hereda de CRUD
onSearchRemoteToggle(isRemote: boolean) {
  this.searchRemote = isRemote;
  // No necesitas más, onLazyLoad ya usa this.searchRemote
}
```

## 🎯 Flujo Completo

### Búsqueda LOCAL (searchRemote = false) - Por defecto
1. Usuario hace clic en botón 🖥️ (desktop) 
2. Se muestra leyenda naranja: "⚠️ Búsqueda solo en página visible"
3. Usuario escribe en buscador
4. `onLazyLoad` filtra solo los items en `this.items()` (~10-20 items)
5. Resultados instantáneos, sin llamada al servidor

### Búsqueda REMOTA (searchRemote = true)
1. Usuario hace clic en botón para activar ☁️ (cloud, verde)
2. Leyenda naranja desaparece
3. Usuario escribe en buscador (mínimo 5 caracteres)
4. `onLazyLoad` envía query al servidor
5. Servidor busca en toda la BD y retorna resultados paginados

## 🎨 Estilos y Comportamiento

### Botón de Toggle
- **Local (deshabilitado)**: 🖥️ icono desktop, gris (outlined secondary)
- **Remoto (habilitado)**: ☁️ icono cloud, verde (outlined success)
- **Tooltip**: Explica el modo actual

### Leyenda de Advertencia
- **Color**: Naranja (`#f97316`)
- **Icono**: ℹ️ `pi-info-circle`
- **Texto**: "Búsqueda solo en página visible"
- **Visibilidad**: Solo cuando `searchRemote = false`

## 📊 Ventajas del Enfoque

✅ **Optimización**: Búsqueda local instantánea para páginas pequeñas  
✅ **Control del usuario**: Decide cuándo necesita búsqueda completa  
✅ **Menor carga**: Evita consultas innecesarias al servidor  
✅ **Transparencia**: Leyenda informa al usuario qué tipo de búsqueda está usando  
✅ **Simplicidad**: Sin caché local complejo, datos siempre sincronizados con servidor  

## 🐛 Notas Importantes

1. **Validación de 5 caracteres**: Solo para búsqueda remota
2. **Datos paginados**: `this.items()` SIEMPRE contiene solo la página actual (del servidor)
3. **Inicialización**: `searchRemote` comienza en `undefined`, se inicializa en `false` en primera llamada
4. **Reactividad**: Usa signals de Angular para UI reactiva

## 🔄 Próximos Pasos Sugeridos

- [ ] Persistir preferencia del usuario en localStorage
- [ ] Agregar animación al cambiar de modo
- [ ] Estadísticas de uso (cuántas búsquedas locales vs remotas)
- [ ] Shortcut de teclado (Ctrl+F para toggle)
