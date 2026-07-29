# 2026-07-29-033 — Perfil AWS dedicado para despliegue CloudFront

Fecha: 2026-07-29  
Tipo: Cambio funcional

## Resumen

El script `inactivar_automaticamente_cloudfront.sh` debe ejecutar todas sus
llamadas AWS con el perfil dedicado `deployclient`, en lugar de depender del
perfil AWS por defecto del equipo.

## Escenario 01: Ejecutar el despliegue con `deployclient`

Se define y exporta `AWS_PROFILE=deployclient` antes de verificar credenciales.
Así las llamadas a STS, S3 y CloudFront del script heredan el mismo perfil.

## Decisiones

- No se incluyen credenciales ni secretos en el repositorio.
- El perfil debe existir en `~/.aws/credentials` o en la configuración AWS
  equivalente del usuario que ejecuta el script.
- Se conserva el flujo previo de respaldo S3, carga del build e invalidación de
  `/index.html`.

## Validaciones

- Revisión estática del script para confirmar que todas las llamadas usan la
  variable de entorno exportada por AWS CLI.
- La política IAM asociada al perfil debe permitir únicamente las acciones
  definidas en `deploy-client-policy.json`.

## Archivos modificados

- `inactivar_automaticamente_cloudfront.sh`
- `docs/documents/2026-07-29-033-perfil-deployclient-cloudfront.md`

## Pendientes

- Ejecutar `aws sts get-caller-identity --profile deployclient` y confirmar que
  devuelve el usuario IAM dedicado antes del despliegue.
