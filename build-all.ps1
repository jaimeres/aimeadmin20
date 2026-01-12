# Script para generar builds completos de la aplicacion Jukai en Windows
# Incluye build web, sincronizacion con Capacitor y builds de Android

$ErrorActionPreference = "Stop"

# Configurar JAVA_HOME si no está definido
if (-not $env:JAVA_HOME) {
    $javaPath = "C:\Program Files\Java\jdk-21"
    if (Test-Path $javaPath) {
        $env:JAVA_HOME = $javaPath
        $env:PATH = "$javaPath\bin;$env:PATH"
        Write-Host "JAVA_HOME configurado: $javaPath" -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: No se encuentra JDK 21 en $javaPath" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Iniciando build completo de Jukai App..." -ForegroundColor Cyan
Write-Host ""

# Funciones para imprimir mensajes
function Print-Step {
    param($Message)
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host "> $Message" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
}

function Print-Warning {
    param($Message)
    Write-Host "WARNING: $Message" -ForegroundColor Yellow
}

function Print-Error {
    param($Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

function Print-Success {
    param($Message)
    Write-Host "SUCCESS: $Message" -ForegroundColor Green
}

# Paso 1: Build Web de Produccion
Print-Step "1/5 Generando build de produccion Angular"
try {
    npm run build -- --configuration=production
    Print-Success "Build web completado exitosamente"
}
catch {
    Print-Error "Error en build web"
    exit 1
}

Write-Host ""

# Paso 2: Sincronizar con Capacitor
Print-Step "2/5 Sincronizando con Capacitor Android"
try {
    # Copiar archivos manualmente ya que cap sync no funciona
    Write-Host "Copiando archivos del build a Android..." -ForegroundColor Cyan
    Copy-Item -Path "dist\ultima-ng\browser\*" -Destination "android\app\src\main\assets\public\" -Recurse -Force
    Print-Success "Archivos copiados a Android"
}
catch {
    Print-Error "Error al copiar archivos a Android"
    exit 1
}

Write-Host ""

# Paso 3: Registrar plugin nativo de biometria
Print-Step "3/5 Registrando plugin nativo de biometria"
try {
    node scripts/register-plugin.js
    Print-Success "Plugin de biometria registrado"
}
catch {
    Print-Error "Error al registrar plugin de biometria"
    exit 1
}

Write-Host ""

# Paso 4: Build Android Debug
Print-Step "4/5 Generando APK de Debug"
try {
    Push-Location android
    .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Print-Error "Error al generar APK Debug (Exit code: $LASTEXITCODE)"
        exit 1
    }
    Pop-Location
    Print-Success "APK Debug generado"
}
catch {
    Pop-Location
    Print-Error "Error al generar APK Debug"
    exit 1
}

Write-Host ""

# Paso 5: Build Android Release
Print-Step "5/5 Generando APK de Release"
try {
    Push-Location android
    .\gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Print-Error "Error al generar APK Release (Exit code: $LASTEXITCODE)"
        exit 1
    }
    Pop-Location
    Print-Success "APK Release generado"
}
catch {
    Pop-Location
    Print-Error "Error al generar APK Release"
    exit 1
}

Write-Host ""

# Resumen final
Print-Step "BUILD COMPLETADO EXITOSAMENTE"
Write-Host ""
Write-Host "Archivos generados:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Build Web:"
Write-Host "     dist/ultima-ng/browser/"
Write-Host ""
Write-Host "  APK Debug:"
Write-Host "     android/app/build/outputs/apk/debug/app-debug.apk"
Write-Host ""
Write-Host "  APK Release:"
Write-Host "     android/app/build/outputs/apk/release/app-release-unsigned.apk"
Write-Host ""
Write-Host "Plugins nativos incluidos:" -ForegroundColor Cyan
Write-Host "   - SQLite (encriptado)"
Write-Host "   - Camara"
Write-Host "   - Geolocalizacion"
Write-Host "   - Device Info"
Write-Host "   - Preferences"
Write-Host "   - Browser"
Write-Host "   - Biometric Auth (custom)"
Write-Host ""
Print-Warning "El APK de Release esta sin firmar. Para firmar, ver BUILD_GUIDE.md"
Write-Host ""
Print-Success "Listo para instalar y testear!"
Write-Host ""
