@echo off
REM ---------------- CONFIGURACIÓN ----------------
set SOURCE_BUCKET=erp.jukaime.com
set BACKUP_BUCKET=respaldo.erp.jukaime.com
set DISTRIBUTION_ID=EK8T66IGB5BSN
set ANGULAR_BUILD_PATH=dist\harmony-ng

REM ---------------- TIMESTAMP ----------------
for /f %%i in ('powershell -command "Get-Date -Format yyyyMMdd-HHmmss"') do set TIMESTAMP=%%i
set BACKUP_PATH=s3://%BACKUP_BUCKET%/respaldo/%TIMESTAMP%/

echo -----------------------------------------
echo Moviendo archivos de la raíz a: %BACKUP_PATH%

for /f "tokens=*" %%i in ('aws s3 ls s3://%SOURCE_BUCKET%/ ^| find /v "PRE"') do (
    for /f "tokens=4" %%a in ("%%i") do (
        echo Moviendo %%a a backup...
        aws s3 mv s3://%SOURCE_BUCKET%/%%a %BACKUP_PATH%%%a
    )
)

echo -----------------------------------------
echo Subiendo nuevo build de Angular...
aws s3 cp %ANGULAR_BUILD_PATH% s3://%SOURCE_BUCKET% --recursive

echo -----------------------------------------
echo Invalidando /index.html en CloudFront...
aws cloudfront create-invalidation --distribution-id %DISTRIBUTION_ID% --paths /index.html

echo -----------------------------------------
echo Despliegue completado con respaldo en: %BACKUP_PATH%
pause