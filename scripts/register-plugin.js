#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PLUGINS_FILE = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'capacitor.plugins.json');
const DEVICE_ATTEST_PLUGIN = {
  "pkg": "device-attest-plugin",
  "classpath": "com.jukai.security.DeviceAttestPlugin"
};

console.log('🔧 Registrando plugin DeviceAttestPlugin...');

try {
  // Leer el archivo de plugins
  const pluginsData = fs.readFileSync(PLUGINS_FILE, 'utf8');
  const plugins = JSON.parse(pluginsData);

  // Verificar si el plugin ya está registrado
  const isRegistered = plugins.some(plugin => plugin.classpath === DEVICE_ATTEST_PLUGIN.classpath);

  if (!isRegistered) {
    // Agregar nuestro plugin
    plugins.push(DEVICE_ATTEST_PLUGIN);

    // Guardar el archivo actualizado
    fs.writeFileSync(PLUGINS_FILE, JSON.stringify(plugins, null, '\t'));
    console.log('✅ Plugin DeviceAttestPlugin registrado exitosamente');
  } else {
    console.log('ℹ️  Plugin DeviceAttestPlugin ya está registrado');
  }
} catch (error) {
  console.error('❌ Error registrando plugin:', error.message);
  process.exit(1);
}
