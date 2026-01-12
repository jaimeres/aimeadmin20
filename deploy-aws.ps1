# Script de deployment a AWS S3 y CloudFront
# Versión PowerShell

# ---------------- VERIFICACIONES PREVIAS ----------------
Write-Host "Verificando herramientas y credenciales AWS..." -ForegroundColor Cyan

# Verificar AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI instalado: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS CLI no está instalado" -ForegroundColor Red
    Write-Host "Descargar desde: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Verificar credenciales
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host "✓ Credenciales AWS configuradas" -ForegroundColor Green
    Write-Host "Usuario: $($identity.Arn)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Credenciales AWS no configuradas o inválidas" -ForegroundColor Red
    Write-Host "Configurar con: aws configure" -ForegroundColor Yellow
    exit 1
}

# ---------------- CONFIGURACIÓN ----------------
$SOURCE_BUCKET = "erp.jukaime.com"
$BACKUP_BUCKET = "respaldo.erp.jukaime.com"
$DISTRIBUTION_ID = "EK8T66IGB5BSN"
$ANGULAR_BUILD_PATH = "dist/ultima-ng/browser"

# Verificar que existe el build
if (-not (Test-Path $ANGULAR_BUILD_PATH)) {
    Write-Host "ERROR: No se encuentra el build en: $ANGULAR_BUILD_PATH" -ForegroundColor Red
    Write-Host "Ejecuta primero: npm run build" -ForegroundColor Yellow
    exit 1
}

# ---------------- TIMESTAMP ----------------
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$BACKUP_PATH = "s3://${BACKUP_BUCKET}/respaldo/${TIMESTAMP}/"

Write-Host "-----------------------------------------" -ForegroundColor Cyan
Write-Host "Moviendo archivos de la raíz a: $BACKUP_PATH" -ForegroundColor Yellow

# Obtener lista de archivos en el bucket (excluyendo directorios)
$files = aws s3 ls "s3://${SOURCE_BUCKET}/" | Where-Object { $_ -notmatch "PRE" }

foreach ($line in $files) {
    # Extraer solo el nombre del archivo (última columna)
    $parts = $line.Trim() -split '\s+', 4
    if ($parts.Count -ge 4) {
        $filename = $parts[3]
        if ($filename) {
            Write-Host "Moviendo $filename a backup..." -ForegroundColor Gray
            aws s3 mv "s3://${SOURCE_BUCKET}/${filename}" "${BACKUP_PATH}${filename}"
        }
    }
}

Write-Host "-----------------------------------------" -ForegroundColor Cyan
Write-Host "Subiendo nuevo build de Angular..." -ForegroundColor Yellow
aws s3 cp $ANGULAR_BUILD_PATH "s3://${SOURCE_BUCKET}" --recursive

Write-Host "-----------------------------------------" -ForegroundColor Cyan
Write-Host "Invalidando /index.html en CloudFront..." -ForegroundColor Yellow
$invalidation = aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths /index.html | ConvertFrom-Json

Write-Host "-----------------------------------------" -ForegroundColor Green
Write-Host "Despliegue completado exitosamente" -ForegroundColor Green
Write-Host "Respaldo guardado en: $BACKUP_PATH" -ForegroundColor Gray
$url = "https://" + $SOURCE_BUCKET
Write-Host "URL: $url" -ForegroundColor Cyan
