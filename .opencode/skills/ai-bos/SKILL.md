# AI-BOS Skill — Protocolo de Ejecución

## Activación

Activa cuando el usuario solicite:

- Ejecutar una fase del AI-BOS
- Ver el estado del proyecto
- Continuar el desarrollo del sistema

## Protocolo de Ejecución

### Al Iniciar Sesión

```text
1. Leer AGENTS.md (reglas permanentes)
2. Leer AI-BOS-STATE.md (estado actual)
3. Verificar versión del Master Document
4. Identificar fase actual
5. Reportar estado al usuario
```

### Al Ejecutar una Fase

```text
1. Cargar SOLO la fase actual del Master
2. Cargar dependencias directas
3. Inspeccionar código afectado
4. Planificar cambios
5. Implementar
6. Ejecutar tests relevantes
7. Validar criterios de aceptación
8. Generar checkpoint
9. Actualizar AI-BOS-STATE.md
10. DETENERSE — No avanzar automáticamente
```

### Checkpoint Universal

Cada fase debe generar:

```yaml
phase: "PHASE XX"
status: "COMPLETED|PARTIAL|BLOCKED"
objective: "descripción"
implemented: ["lista de cambios"]
files_created: []
files_modified: []
tests:
  executed: 0
  passed: 0
  failed: 0
validation: "descripción de validación"
evidence: ["archivos generados"]
known_issues: []
risks: []
blockers: []
master_version: "2.0.0"
ready_for_next_phase: true|false
human_approval_required: true|false
```

### Reglas de Eficiencia

```text
NO:
- Leer todo el Master Document
- Repetir auditorías validadas
- Recrear artefactos existentes
- Revisar documentación no afectada
- Avanzar sin aprobación

SI:
- Cargar solo lo necesario
- Reusar checkpoints
- Cambios incrementales
- Tests dirigidos
- Documentación mínima suficiente
```

### Human Gates

Fases que REQUIEREN aprobación humana:

```text
PHASE 00 → HUMAN GATE
PHASE 01 → HUMAN GATE
PHASE 04 → HUMAN GATE
PHASE 05 → HUMAN GATE
PHASE 06 → HUMAN GATE
PHASE 08 → HUMAN GATE
PHASE 11 → HUMAN GATE
PHASE 12 → HUMAN GATE
PHASE 14 → FINAL GATE
```

### Estructura dearchivos

```text
docs/admin/
├── AI-BOS-MASTER-IMPLEMENTATION.md  (fuente maestra)
├── AI-BOS-STATE.md                  (estado actual)
├── checkpoints/                     (evidencia por fase)
│   ├── phase-00.md
│   ├── phase-01.md
│   └── ...
└── audit/                           (reportes de auditoría)
```

### Al Finalizar

```text
1. Validar criterios de aceptación
2. Generar checkpoint con evidencia
3. Actualizar AI-BOS-STATE.md
4. Reportar al usuario
5. DETENERSE
```
