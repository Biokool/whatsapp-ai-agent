# Phase 07 Checkpoint — Tools + Calendar

```yaml
phase: "PHASE 07"
status: "COMPLETED"
objective: "Crear un framework de tools tipado (ToolSpec) con executor (validación, permisos, timeout, retry, idempotencia, auditoría), proveedor de calendario (CalendarProvider) con MVP Supabase y adaptadores Google/Cal.com, tools de datos y calendario, transferToHuman y la migración 007"
note: "Checkpoint generado el 2026-08-02 con evidencia verificada del código, tests y del bot en ejecución."

implemented:
  - "Contrato de tools: ToolSpec, ToolError, ToolResult y ToolDefinition con Zod schema en runtime (src/core/types/tool.ts)"
  - "Executor de tools: runTool con estados VALID / INVALID / UNAUTHORIZED / TIMEOUT / FAILURE / DUPLICATE, timeout, retry y auditoría (src/lib/tools/executor.ts)"
  - "Idempotencia: claves idempotency_key por (tenant_id, tool_name) persistidas en tool_executions y reutilización de resultados DUPLICATE"
  - "Tools de datos: searchKnowledge, contact, lead y follow-up sobre el CRM vía src/lib/db.ts (13 funciones nuevas) (src/lib/tools/data-tools.ts)"
  - "Tools de calendario: availability, createAppointment, rescheduleAppointment y cancelAppointment con validación de timezone y de doble reserva (src/lib/tools/calendar-tools.ts)"
  - "CalendarProvider interface + MVP SupabaseCalendarProvider con validación de timezone y doble reserva (src/lib/calendar/types.ts, src/lib/calendar/providers/supabase-calendar.ts)"
  - "Adaptadores Google Calendar y Cal.com (stubs pluggables 'en preparación', sin tocar Agent Core) (src/lib/calendar/providers/google-calendar.ts, src/lib/calendar/providers/cal-com.ts)"
  - "transferToHuman: escalado a humano desde el framework de tools (src/lib/tools/transfer-to-human.ts)"
  - "Infra de tools: timeout, retry y dependencias compartidas (src/lib/tools/infra.ts)"
  - "Registry que inyecta CalendarProvider y fusiona legacy + herramientas nuevas (src/lib/tools/registry.ts)"
  - "Migración 007: tablas follow_ups y tool_executions con RLS por tenant, columnas appointments.timezone y appointments.external_event_id (src/infrastructure/database/migrations/007_tools_calendar.sql)"

files_created:
  - "src/core/types/tool.ts"
  - "src/lib/tools/executor.ts"
  - "src/lib/tools/executor.test.ts"
  - "src/lib/tools/data-tools.ts"
  - "src/lib/tools/data-tools.test.ts"
  - "src/lib/tools/calendar-tools.ts"
  - "src/lib/tools/calendar-tools.test.ts"
  - "src/lib/tools/registry.ts"
  - "src/lib/tools/registry.test.ts"
  - "src/lib/tools/transfer-to-human.ts"
  - "src/lib/tools/infra.ts"
  - "src/lib/calendar/types.ts"
  - "src/lib/calendar/providers/supabase-calendar.ts"
  - "src/lib/calendar/providers/supabase-calendar.test.ts"
  - "src/lib/calendar/providers/google-calendar.ts"
  - "src/lib/calendar/providers/cal-com.ts"
  - "src/lib/calendar/providers/adapters.test.ts"
  - "src/infrastructure/database/migrations/007_tools_calendar.sql"

files_modified:
  - "src/core/types/database.ts (FollowUp, ToolExecution y Appointment.timezone/external_event_id)"
  - "src/lib/db.ts (13 funciones nuevas: follow-ups, tool executions y funciones CRM/calendar)"
  - "src/lib/tools/index.ts (fusión del framework legacy con el registry nuevo)"

database_changes:
  - "CREATE TABLE follow_ups (tenant_id, conversation_id, contact_id, lead_id, scheduled_at, status, note, RLS por tenant)"
  - "CREATE TABLE tool_executions (tenant_id, tool_name, idempotency_key, status, input, output, error, UNIQUE(tenant_id, tool_name, idempotency_key), RLS por tenant)"
  - "ALTER TABLE appointments ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC'"
  - "ALTER TABLE appointments ADD COLUMN external_event_id TEXT"
  - "NOTA: la migración 007 NO se aplicó automáticamente a la base Supabase en ejecución. Este repo no tiene runner de migraciones (no hay script que ejecute los .sql); las tablas/columnas nuevas solo se tocan cuando una tool se invoca en runtime, por lo que la migración debe aplicarse manualmente antes de usar las tools de datos/calendario en vivo."

tests:
  executed: 68
  passed: 68
  failed: 0
  files: 14

validation: "Typecheck sin errores. 68 tests pasando (14 archivos). Bot verificado en ejecución conectado como 5215664436277."

evidence:
  - "npm run typecheck — 0 errores (2026-08-02)"
  - "npm run test — 68/68 tests pasando, 14 files (2026-08-02)"
  - "docker compose -f docker-compose.local.yml up -d --build — imagen whatsapp-ai-agent-whatsapp-agent construida OK, contenedor whatsapp-agent arrancado"
  - "docker logs whatsapp-agent — connected to WA, myPN 5215664436277, own LID session created, 'esperando QR scan en el dashboard' (sesión previa válida); race inicial de lock resuelta (PID 30)"
  - "GET /api/connection/status — { status: connected, phone: 5215664436277 }"
  - "Commits: 90ffa3f (core types + ToolSpec), 010cecf (executor), 2bb256c (migración 007 + db), e4ad5dd (CalendarProvider + Supabase MVP), 6c9a34a (adaptadores Google/Cal.com), a60f9d9 (data tools), 07cabb3 (calendar tools), 2716f50 (registry + transferToHuman)"

known_issues:
  - "Los adaptadores Google Calendar y Cal.com son stubs 'en preparación': implementan la interface CalendarProvider pero devuelven estado UNIMPLEMENTED/ERROR pendiente de credenciales y validación en vivo."
  - "SupabaseCalendarProvider usa leadId: 'unknown' como fallback hasta que se conecte con el lead real: la tool de calendario aún no recibe un lead resuelto desde el canal."
  - "La migración 007 no está aplicada en la Supabase en ejecución (no hay auto-migrator en el repo); aplicarla manualmente antes de invocar las tools en runtime (mismo patrón que la columna summary de la fase 06)."

risks:
  - "R-009 ABIERTO: adaptadores externos (Google Calendar, Cal.com) pendientes de credenciales y de validación en vivo; solo el MVP Supabase está operativo"
  - "R-010 ABIERTO: SupabaseCalendarProvider usa leadId 'unknown' como fallback hasta que la tool de calendario reciba el lead real del canal"

blockers: []

master_version: "2.0.0"

ready_for_next_phase: true

human_approval_required: true
```

---

## Validation Checklist

- [x] ToolSpec con input/output tipados y schema Zod en runtime
- [x] Executor con resultados VALID / INVALID / UNAUTHORIZED / TIMEOUT / FAILURE / DUPLICATE
- [x] Idempotencia y auditoría de ejecuciones (tool_executions)
- [x] CalendarProvider interface + SupabaseCalendarProvider MVP (timezone + doble reserva validados)
- [x] Adaptadores Google Calendar y Cal.com pluggables sin modificar Agent Core
- [x] Tools de datos (knowledge, contact, lead, follow-up) y de calendario (availability, create, reschedule, cancel)
- [x] transferToHuman desde el framework de tools
- [x] Migración 007 creada (follow_ups, tool_executions, appointments.timezone/external_event_id)
- [x] TypeScript compila sin errores
- [x] 68 tests pasando (14 archivos)
- [x] Bot verificado en ejecución (conectado como 5215664436277)

---

## Arquitectura Verificada

```text
FRAMEWORK DE TOOLS (src/lib/tools)
┌──────────────────────────────────────────────────────────┐
│ ToolSpec (zod schema)  →  registry.ts (defaultTools)     │
│   ├── runTool (executor)                                  │
│   │    ├── validación input (VALID/INVALID)               │
│   │    ├── permisos (UNAUTHORIZED)                        │
│   │    ├── timeout + retry (TIMEOUT/FAILURE)              │
│   │    └── idempotencia + auditoría (DUPLICATE, tool_executions)
│   ├── data-tools.ts  (searchKnowledge, contact, lead, follow-up)
│   ├── calendar-tools.ts (availability, create/reschedule/cancel appointment)
│   └── transfer-to-human.ts
└──────────────────────────────────────────────────────────┘
            │
CALENDAR (src/lib/calendar)
  CalendarProvider interface
    ├── SupabaseCalendarProvider (MVP activo, timezone + doble reserva)
    ├── GoogleCalendarAdapter (stub "en preparación")
    └── CalComAdapter (stub "en preparación")
            │
BASE DE DATOS (Supabase) — migración 007
  follow_ups | tool_executions | appointments.timezone/external_event_id
```

---

**Generated by:** AI-BOS Phase 07 — Tools + Calendar
**Date:** 2026-08-02 (validación en vivo)
**Status:** COMPLETED — verificado
