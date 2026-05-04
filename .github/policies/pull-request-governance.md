# Gobernanza de Pull Requests

## 1. Filosofía
Este repositorio se gestiona bajo el modelo de **Gobernanza Visual**. Al no contar con protecciones de rama por hardware (versión paga), confiamos en la disciplina del equipo y en la visibilidad de los estados del CI.

## 2. Requisitos para el Merge
- **Tests en Verde:** Ningún PR puede ser mergeado si los checks de GitHub Actions están en rojo.
- **Review Humano:** Al menos un desarrollador de `CODEOWNERS` debe dar el OK.
- **Screaming Architecture:** El código debe seguir la estructura modular definida.

## 3. Proceso
1. El bot comenta el "Contrato de Revisión" al abrir el PR.
2. El autor marca los checkboxes a medida que los cumple.
3. El revisor valida técnica y arquitectónicamente.
4. Si todo está en verde y aprobado, el autor realiza el Merge.
