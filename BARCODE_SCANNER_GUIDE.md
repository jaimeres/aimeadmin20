# Guía de Implementación - Scanner de Códigos de Barras/QR

## 📱 Funcionalidad Implementada

Se ha agregado soporte para escanear códigos de barras y QR usando el plugin oficial **@capacitor/barcode-scanner v2.2.4** en los campos `input-text` del componente `custom-draw-form`.

### ✨ Características Principales

- ✅ **Botón adicional**: Se agrega junto al input, no lo reemplaza
- ✅ **Iconos personalizables**: Usa cualquier icono de PrimeIcons
- ✅ **Tooltip personalizable**: Mensaje descriptivo al pasar el mouse
- ✅ **Z-index optimizado**: Funciona correctamente sobre dialogs y modals
- ✅ **Compatibilidad hacia atrás**: Mantiene soporte para `new_icon_scanner`
- ✅ **Compatible con otros botones**: Funciona junto a new_icon, reload_icon, etc
- ✅ **12 formatos de códigos**: QR, EAN, UPC, Code128, Data Matrix, etc.
- ✅ **Asignación automática**: El valor escaneado se asigna al formulario
- ✅ **Eventos personalizables**: Emite eventos para lógica adicional

---

## 🔧 Configuración del Campo

El scanner se agrega como un botón adicional junto al input, similar a otros botones del sistema (new_icon, reload_icon, etc).

### Configuración Básica

```typescript
{
  field: 'product_code',
  type: 'input-text',
  label: 'Código de Producto',
  scanner: {
    active: true,  // Activa el botón scanner
    icon: 'pi pi-qrcode', // Icono personalizado (opcional, default: pi pi-qrcode)
    tooltip: 'Escanear código de barras', // Tooltip personalizado (opcional)
    hint: 17,  // 17 = Todos los formatos (ALL). Ver tabla de formatos abajo
    instructions: 'Apunta la cámara al código' // Instrucciones en el scanner
  }
}
```

**Características:**
- ✅ Input normal con botón de scanner al lado
- ✅ Permite escribir manualmente O escanear
- ✅ Icono personalizable
- ✅ Tooltip personalizable
- ✅ Compatible con otros botones (new_icon, reload_icon, etc)

### Modo Legacy (Compatibilidad hacia atrás)

```typescript
{
  field: 'serial_number',
  type: 'input-text',
  label: 'Número de Serie',
  new_icon_scanner: {
    active: true,
    icon: 'pi pi-camera', // Icono personalizado (opcional)
    tooltip: 'Escanear código'
  }
}
```

**Nota:** Se mantiene compatibilidad con `new_icon_scanner` para proyectos existentes.

---

## 📋 Formatos de Códigos Soportados

El plugin usa `CapacitorBarcodeScannerTypeHint` para especificar formatos. Puedes usar:

| Código | Formato | Descripción | Uso Común |
|--------|---------|-------------|-----------|
| **17** | **ALL** (todos) | Todos los formatos | Uso general |
| **0** | QR_CODE | Código QR 2D | Enlaces, datos estructurados |
| **10** | EAN_13 | European Article Number | Productos comerciales (13 dígitos) |
| **11** | EAN_8 | EAN corto | Productos pequeños (8 dígitos) |
| **14** | UPC_A | Universal Product Code | Productos USA/Canadá |
| **15** | UPC_E | UPC compacto | Productos pequeños USA |
| **5** | CODE_128 | Código 128 | Logística, envíos, inventario |
| **3** | CODE_39 | Código 39 | Industrial, identificación |
| **4** | CODE_93 | Código 93 | Logística avanzada |
| **2** | CODABAR | Codabar | Bibliotecas, bancos de sangre |
| **6** | DATA_MATRIX | Data Matrix 2D | Electrónica, componentes |
| **1** | AZTEC | Código Aztec 2D | Transporte, boletos |
| **12** | PDF_417 | PDF417 2D | Identificaciones, licencias |

### Especificar un Formato Específico

```typescript
scanner: {
  active: true,
  hint: 10  // Solo EAN_13
}
```

---

## 💻 Ejemplos de Uso

### Ejemplo 1: Scanner con Formato Específico (EAN-13)

```typescript
// En tu drawForm
grid: {
  1: {
    field: 'product_ean',
    type: 'input-text',
    label: 'Código EAN Producto',
    class: 'col-span-12',
    class_md: 'md:col-span-6',
    scanner: {
      active: true,
      icon: 'pi pi-qrcode',
      tooltip: 'Escanear EAN',
      hint: 10  // Solo EAN_13
    }
  }
}
```

### Ejemplo 2: Scanner con Icono Personalizado

```typescript
grid: {
  2: {
    field: 'serial_number',
    type: 'input-text',
    label: 'Número de Serie',
    class: 'col-span-12',
    class_md: 'md:col-span-6',
    scanner: {
      active: true,
      icon: 'pi pi-barcode',
      tooltip: 'Escanear código de barras',
      hint: 17  // Todos los formatos
    }
  }
}
```

### Ejemplo 3: Scanner QR para Enlaces

```typescript
grid: {
  3: {
    field: 'url_product',
    type: 'input-text',
    label: 'URL del Producto',
    scanner: {
      active: true,
      icon: 'pi pi-link',
      tooltip: 'Escanear código QR',
      hint: 0  // Solo QR_CODE
    }
  }
}
```

### Ejemplo 4: Campo con Scanner y Botón Adicional

```typescript
grid: {
  4: {
    field: 'product_reference',
    type: 'input-text',
    label: 'Referencia Producto',
    scanner: {
      active: true,
      icon: 'pi pi-qrcode'
    },
    new_icon: true  // Botón adicional para otra acción
  }
}
```

---

## 🎯 Manejo de Eventos

### Event Output: `onScanCodeAction`

El componente emite un evento cuando se escanea (o falla):

```typescript
// En tu componente padre
onScanCode(event: any) {
  if (event.success) {
    console.log('✅ Código escaneado:', event.content);
    console.log('📋 Formato:', event.format);
    console.log('🔤 Campo:', event.field);
    
    // El valor ya está asignado automáticamente al formulario
    // Puedes agregar lógica adicional aquí
    
    if (event.format === 'EAN_13') {
      // Buscar producto por EAN
      this.buscarProductoPorEAN(event.content);
    }
  } else {
    console.error('❌ Error:', event.error);
    // Mostrar mensaje de error al usuario
  }
}
```

### Estructura del Evento

```typescript
{
  success: boolean,           // true si se escaneó exitosamente
  content?: string,           // Contenido del código
  format?: string,            // Formato detectado (EAN_13, QR_CODE, etc.)
  field: string,              // Nombre del campo
  fieldConfig: any,           // Configuración completa del campo
  error?: any                 // Error si falló
}
```

---

## 📱 Instalación de Dependencias

### 1. Instalar el Plugin de Capacitor

```bash
npm install @capacitor/barcode-scanner@2.2.4
npx cap sync android
```

### 2. Configurar Permisos en Android

Editar `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />

<!-- Características opcionales pero recomendadas -->
<uses-feature android:name="android.hardware.camera" />
<uses-feature android:name="android.hardware.camera.autofocus" />
```

### 3. Rebuild de la App

```bash
npm run build:all
# o
./build-all.sh
```

---

## 🎨 Personalización de Estilos

Los estilos del scanner están en `custom-draw-form.component.scss`:

```scss
// Overlay del scanner
body.scanner-active {
  --background: transparent;
  --ion-background-color: transparent;
}

// Cuadro de enfoque
.scanner-square {
  width: 250px;
  height: 250px;
  border: 2px solid #00ff00;
}

// Instrucciones
.scanner-instructions {
  color: white;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.7);
}
```

---

## 🔒 Permisos y Seguridad

### Verificación Automática de Permisos

El componente verifica automáticamente permisos de cámara:

```typescript
const status = await BarcodeScanner.checkPermission({ force: true });
```

- Si no tiene permisos, emite evento de error
- El usuario debe otorgar permisos manualmente

### Manejo de Errores

```typescript
onScanCode(event: any) {
  if (!event.success) {
    switch(event.error) {
      case 'Permisos de cámara denegados':
        this.showMessage('Por favor, otorga permisos de cámara en configuración');
        break;
      case 'Scanner cancelado':
        // Usuario presionó atrás
        break;
      default:
        this.showMessage('Error al escanear: ' + event.error);
    }
  }
}
```

---

## 📊 Casos de Uso Comunes

### 1. Inventario de Productos

```typescript
{
  field: 'product_barcode',
  label: 'Escanear Producto',
  scanner: {
    active: true,
    formats: ['EAN_13', 'UPC_A']
  }
}
```

### 2. Control de Acceso (QR)

```typescript
{
  field: 'access_qr',
  label: 'Escanear QR de Acceso',
  scanner: {
    active: true,
    severity: 'success',
    formats: ['QR_CODE']
  }
}
```

### 3. Rastreo de Envíos

```typescript
{
  field: 'tracking_code',
  label: 'Código de Rastreo',
  new_icon_scanner: {
    active: true,
    tooltip: 'Escanear guía'
  }
}
```

### 4. Validación de Documentos

```typescript
{
  field: 'document_code',
  label: 'Código de Documento',
  scanner: {
    active: true,
    formats: ['PDF_417', 'QR_CODE']
  }
}
```

---

## 🐛 Troubleshooting

### El scanner no abre

1. Verificar permisos de cámara
2. Verificar que el plugin esté instalado: `npm list @capacitor-community/barcode-scanner`
3. Verificar logs en consola

### No detecta códigos

1. Verificar formato del código vs formatos configurados
2. Mejorar iluminación
3. Limpiar lente de la cámara
4. Verificar que el código no esté dañado

### Error "Cannot read property 'startScan'"

- El plugin no está sincronizado: `npx cap sync android`

---

## ✅ Checklist de Implementación

- [ ] Plugin instalado: `@capacitor-community/barcode-scanner`
- [ ] Permisos de cámara en AndroidManifest.xml
- [ ] Campo configurado con `scanner.active: true` o `new_icon_scanner.active: true`
- [ ] Event handler `onScanCode` implementado
- [ ] App rebuildeada después de instalar plugin
- [ ] Testeado en dispositivo físico (emulador no soporta cámara real)

---

## 📚 Recursos

- [Documentación Oficial del Plugin](https://github.com/capacitor-community/barcode-scanner)
- [Capacitor Camera Docs](https://capacitorjs.com/docs/apis/camera)
- [Tipos de Códigos de Barras](https://en.wikipedia.org/wiki/Barcode)

---

**Última actualización**: 12 de enero de 2026  
**Implementado en**: custom-draw-form.component  
**Estado**: ✅ Funcional - Solo campos `input-text` en sección LIBRE
