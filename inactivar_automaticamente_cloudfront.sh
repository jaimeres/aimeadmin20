#!/bin/bash

# ---------------- VERIFICACIONES PREVIAS ----------------
# [[[II ESC:033-01 DOC:docs/documents/2026-07-29-033-perfil-deployclient-cloudfront.md#escenario-01 CONFIG: Todas las llamadas AWS del despliegue deben usar el perfil dedicado deployclient.
AWS_PROFILE="deployclient"
export AWS_PROFILE
# ]]]FI

echo "Verificando herramientas y credenciales AWS..."

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI no está instalado"
    echo "Instalar con: sudo apt install awscli"
    exit 1
fi

echo "✓ AWS CLI instalado: $(aws --version)"

# Verificar credenciales
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: Credenciales AWS no configuradas o inválidas"
    echo "Configurar con: aws configure"
    exit 1
fi

echo "✓ Credenciales AWS configuradas"
echo "Usuario: $(aws sts get-caller-identity --query 'Arn' --output text)"

# ---------------- CONFIGURACIÓN ----------------
SOURCE_BUCKET="erp.jukaime.com"
BACKUP_BUCKET="respaldo.erp.jukaime.com"
DISTRIBUTION_ID="EK8T66IGB5BSN"
ANGULAR_BUILD_PATH="dist/ultima-ng/browser"

# ---------------- TIMESTAMP ----------------
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_PATH="s3://${BACKUP_BUCKET}/respaldo/${TIMESTAMP}/"

echo "-----------------------------------------"
echo "Moviendo archivos de la raíz a: ${BACKUP_PATH}"

# Obtener lista de archivos en el bucket (excluyendo directorios)
aws s3 ls "s3://${SOURCE_BUCKET}/" | grep -v "PRE" | while read -r line; do
    # Extraer solo el nombre del archivo (última columna)
    filename=$(echo "$line" | awk '{print $4}')
    if [ -n "$filename" ]; then
        echo "Moviendo $filename a backup..."
        aws s3 mv "s3://${SOURCE_BUCKET}/${filename}" "${BACKUP_PATH}${filename}"
    fi
done

echo "-----------------------------------------"
echo "Subiendo nuevo build de Angular..."
aws s3 cp "$ANGULAR_BUILD_PATH" "s3://${SOURCE_BUCKET}" --recursive

echo "-----------------------------------------"
echo "Invalidando /index.html en CloudFront..."
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths /index.html

echo "-----------------------------------------"
echo "Despliegue completado con respaldo en: ${BACKUP_PATH}"
echo "Presiona Enter para continuar..."
read -r
