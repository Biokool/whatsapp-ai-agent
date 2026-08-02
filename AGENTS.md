# AGENTS.md — Reglas Persistentes del Proyecto

## Identidad del Proyecto

**Nombre:** WhatsApp AI Agent Kit (Biokool)
**Tipo:** Plataforma de agentes de IA para WhatsApp
**Stack:** Next.js 16, React 19, Baileys 7.0, Supabase (PostgreSQL + pgvector), RAG
**Estado:** Fase 05 — RAG + Knowledge Completada

---

## Reglas No Negociables

1. **NO cargar el Master Document completo** — Solo la fase actual y dependencias
2. **NO avanzar sin aprobación humana** — Cada fase requiere gate
3. **NO repetir validaciones** — Reusar checkpoints existentes
4. **NO hardcodear** — Configuración separada de código
5. **NO crear sin verificar** — SEARCH → INSPECT → REUSE → CREATE

---

## Eficiencia de Tokens

```text
CARGAR SIEMPRE:
  AGENTS.md (reglas)
  AI-BOS-STATE.md (estado actual)

CARGAR SOLO CUANDO SE EJECUTA FASE:
  Fase actual del Master Document
  Dependencias directas de la fase
  Código afectado por la fase

NUNCA CARGAR:
  Master Document completo
  Todas las fases
  Documentación no relacionada
  Código no afectado
```

---

## Flujo de Ejecución

```text
1. Leer AGENTS.md (siempre)
2. Leer AI-BOS-STATE.md (siempre)
3. Verificar versión del Master
4. Identificar fase actual
5. Cargar SOLO esa fase
6. Ejecutar
7. Validar
8. Checkpoint
9. Actualizar estado
10. DETENERSE
```

---

## Comandos Disponibles

| Comando               | Acción                              |
| --------------------- | ----------------------------------- |
| `/setup`              | Instalación guiada del kit          |
| `/personaliza`        | Personalización del agente          |
| `/deploy`             | Despliegue a producción             |
| `ejecuta fase X`      | Ejecutar fase específica del AI-BOS |
| `estado del proyecto` | Ver progreso actual                 |

---

## Arquitectura de Contexto

```text
MASTER (fuente de verdad)
  → AGENTS.md (reglas persistentes)
    → SKILL (procedimiento de ejecución)
      → AI-BOS-STATE.md (memoria compacta)
        → CHECKPOINTS (evidencia validada)
          → GIT (detección de cambios)
```

---

## Criterios de Calidad

- **Correctness** > Security > Stability > Cost > Performance
- Todo cambio debe ser verificable
- Todo checkpoint debe tener evidencia
- Todo error debe ser clasificado (P0-P4)

---

## Referencias

| Archivo                                      | Propósito                   |
| -------------------------------------------- | --------------------------- |
| `docs/admin/AI-BOS-MASTER-IMPLEMENTATION.md` | Fuente maestra del proyecto |
| `AI-BOS-STATE.md`                            | Estado actual               |
| `.opencode/skills/ai-bos/SKILL.md`           | Protocolo de ejecución      |
| `docs/admin/checkpoints/`                    | Evidencia de validación     |
