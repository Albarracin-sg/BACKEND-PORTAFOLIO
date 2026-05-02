# 🔒 Seguridad y Dependencias

## 1. Validación de Datos
- Todas las entradas deben ser validadas mediante DTOs con `class-validator` o esquemas de `Zod`.
- No se permiten objetos planos (`any`) en las interfaces de comunicación.

## 2. Gestión de Secrets
- **PROHIBIDO** commitear archivos `.env` o hardcodear keys.
- Usar variables de entorno validadas en el bootstrap de la app.

## 3. Actualización de Dependencias
- Usamos **Dependabot** para monitorear vulnerabilidades.
- Los PRs de seguridad de Dependabot tienen prioridad máxima y deben ser revisados en menos de 24hs.
- Las actualizaciones menores se gestionan semanalmente.
