#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PLUGINS_FILE = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'capacitor.plugins.json');
const CUSTOM_PLUGINS = [
  {
    "pkg": "device-attest-plugin",
    "classpath": "com.jukai.security.DeviceAttestPlugin"
  },
  {
    "pkg": "safe-camera-plugin",
    "classpath": "com.jukai.jukai.SafeCameraPlugin"
  }
];

console.log('🔧 Registrando plugins personalizados...');

try {
  // Leer el archivo de plugins
  const pluginsData = fs.readFileSync(PLUGINS_FILE, 'utf8');
  const plugins = JSON.parse(pluginsData);

  let added = 0;
  for (const custom of CUSTOM_PLUGINS) {
    const isRegistered = plugins.some(plugin => plugin.classpath === custom.classpath);
    if (!isRegistered) {
      plugins.push(custom);
      console.log(`✅ Plugin ${custom.pkg} registrado exitosamente`);
      added++;
    } else {
      console.log(`ℹ️  Plugin ${custom.pkg} ya está registrado`);
    }
  }

  if (added > 0) {
    fs.writeFileSync(PLUGINS_FILE, JSON.stringify(plugins, null, '\t'));
  }
} catch (error) {
  console.error('❌ Error registrando plugins:', error.message);
  process.exit(1);
}
