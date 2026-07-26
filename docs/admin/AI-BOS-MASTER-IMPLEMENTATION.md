# AI-BOS-MASTER-IMPLEMENTATION.md

# AI Business Operating System

## Master Implementation, Execution Protocol & Context Optimization

**Proyecto:** AI-BOS — AI Business Operating System
**Documento:** Master Implementation v2
**Estado:** Master / Single Source of Truth
**Versión:** 2.0.0
**Fecha:** 2026-07-25

---

# 0. DEFINICIÓN DEL DOCUMENTO

Este documento es la **fuente única de verdad funcional y técnica** para la construcción y evolución del AI-BOS.

Define:

* arquitectura objetivo
* orden de implementación
* alcance de cada fase
* dependencias
* prompts ejecutables
* validaciones
* pruebas
* criterios de aceptación
* checkpoints
* gates de aprobación
* reglas de autonomía
* estrategia de observabilidad
* estrategia de recuperación
* eficiencia de contexto y tokens

Este documento debe utilizarse junto con:

```text
AGENTS.md
SKILL.md
AI-BOS-STATE.md
Git
```

Cada uno tiene una responsabilidad diferente.

```text
AI-BOS-MASTER-IMPLEMENTATION.md
    QUÉ construir y en qué orden

AGENTS.md
    REGLAS permanentes del proyecto

SKILL.md
    CÓMO ejecutar las fases

AI-BOS-STATE.md
    DÓNDE se encuentra actualmente el proyecto

CHECKPOINTS
    QUÉ fue validado

Git
    QUÉ cambió
```

---

# 1. PRINCIPIO FUNDAMENTAL

El AI-BOS debe construirse como un sistema:

```text
SIMPLE AL INICIO
        ↓
MODULAR
        ↓
CONTROLABLE
        ↓
OBSERVABLE
        ↓
ESCALABLE
        ↓
AUTOMATIZABLE
        ↓
AUTÓNOMO DE FORMA CONTROLADA
```

No se debe implementar complejidad antes de que exista una necesidad real.

La arquitectura debe permitir crecimiento sin obligar a construir desde el primer día todas las capacidades futuras.

---

# 2. OBJETIVOS DEL SISTEMA

AI-BOS debe proporcionar una plataforma genérica para automatizar la operación de negocios mediante:

* atención al cliente
* agentes de IA
* RAG
* bases de conocimiento
* memoria contextual
* CRM
* seguimiento de leads
* agenda
* automatización
* workflows
* comunicación omnicanal
* observabilidad
* administración

Debe poder adaptarse a negocios como:

* restaurantes
* despachos de abogados
* clínicas
* empresas de servicios
* comercios
* soporte técnico
* profesionales independientes
* empresas B2B

El conocimiento específico del negocio debe residir en:

```text
TENANT KNOWLEDGE
```

y no en código hardcodeado.

---

# 3. PRINCIPIO DE IMPLEMENTACIÓN INCREMENTAL

El sistema debe crecer mediante incrementos funcionales.

Nunca:

```text
DISEÑAR TODO
↓
CONSTRUIR TODO
↓
ESPERAR QUE FUNCIONE
```

Preferir:

```text
AUDIT
↓
DESIGN
↓
BUILD
↓
TEST
↓
VALIDATE
↓
OBSERVE
↓
IMPROVE
```

---

# 4. IMMUTABLE CORE

El AI-BOS debe tener un núcleo estable independiente de proveedores.

El núcleo no debe depender directamente de:

* WhatsApp
* Telegram
* Messenger
* Instagram
* Google Calendar
* Cal.com
* n8n
* Supabase
* un proveedor LLM
* un proveedor de embeddings

Arquitectura:

```text
CHANNEL
    ↓
CHANNEL ADAPTER
    ↓
UNIFIED CONTRACT
    ↓
AI-BOS CORE
    ↓
USE CASE
    ↓
PORT
    ↓
ADAPTER
    ↓
EXTERNAL PROVIDER
```

Los proveedores deben poder reemplazarse sin reescribir el núcleo.

---

# 5. PRINCIPIOS DE SOFTWARE

Todo código nuevo debe respetar:

* SOLID
* DRY
* KISS
* separation of concerns
* dependency inversion
* modularity
* testability
* observability
* least privilege

No aplicar abstracciones innecesarias.

La arquitectura debe evitar:

* overengineering
* premature optimization
* duplicated logic
* monolithic workflows
* hardcoded configuration
* hidden dependencies

---

# 6. MULTI-TENANCY

El sistema debe ser **tenant-aware desde el inicio**.

Toda entidad relacionada con un negocio debe poder asociarse a:

```text
tenant_id
```

El aislamiento debe existir desde el inicio en:

```text
DATABASE
API
RAG
MEMORY
AGENTS
WORKFLOWS
CRM
LOGS
TOOLS
```

Sin embargo, no se debe implementar inicialmente complejidad innecesaria.

No construir desde el inicio:

* billing multi-tenant
* jerarquías empresariales complejas
* provisioning automático
* organizaciones anidadas
* roles avanzados innecesarios

Principio:

```text
TENANT-AWARE
FROM DAY ONE

TENANT-COMPLEXITY
ONLY WHEN NEEDED
```

---

# 7. CONFIGURATION OVER HARDCODING

Las variables configurables deben separarse del código.

Jerarquía:

```text
GLOBAL
↓
ENVIRONMENT
↓
TENANT
↓
CHANNEL
↓
AGENT
↓
WORKFLOW
↓
PROVIDER
```

No almacenar secretos en:

* código
* workflows
* prompts
* repositorio

---

# 8. TOKEN & CONTEXT EFFICIENCY

La eficiencia de contexto es una prioridad técnica.

## 8.1 Regla principal

Nunca leer todo el repositorio ni todo el Master Document si no es necesario.

El agente debe cargar únicamente:

```text
GLOBAL RULES
+
CURRENT STATE
+
CURRENT PHASE
+
RELEVANT DEPENDENCIES
+
RELEVANT ARTIFACTS
```

---

## 8.2 Jerarquía de contexto

### NIVEL 1

Siempre disponible:

```text
AGENTS.md
AI-BOS-STATE.md
```

Debe ser pequeño.

---

### NIVEL 2

Sólo la fase actual:

```text
PHASE X
```

---

### NIVEL 3

Sólo documentación requerida:

```text
ARCHITECTURE
DATABASE
RAG
N8N
INTEGRATIONS
```

---

### NIVEL 4

Sólo código relevante.

---

### NIVEL 5

Sólo documentación externa necesaria.

---

## 8.3 Prohibiciones

No:

```text
leer todo el Master en cada fase
```

No:

```text
repetir auditorías ya validadas
```

No:

```text
repetir tests sin motivo
```

No:

```text
recrear artefactos existentes
```

No:

```text
revisar documentación que no afecta la fase actual
```

---

## 8.4 Reutilización

Antes de crear:

```text
SEARCH
↓
INSPECT
↓
REUSE
↓
EXTEND
↓
CREATE ONLY IF NECESSARY
```

---

## 8.5 Cambios incrementales

Preferir:

```text
SMALL DIFF
↓
TEST
↓
VALIDATE
```

sobre cambios masivos.

---

# 9. DETECCIÓN DE CAMBIOS DEL MASTER

El agente debe detectar si el Master Document cambió.

Usar preferentemente:

```text
Git
```

y opcionalmente hashes.

El estado puede registrar:

```yaml
master_document:
  path: docs/ai-bos/AI-BOS-MASTER-IMPLEMENTATION.md
  version: 2.0.0
  commit: <commit>
  hash: <sha256>
```

Si el documento no cambió:

```text
NO RELOAD
```

Si cambió:

```text
IDENTIFY CHANGED SECTION
↓
LOAD ONLY AFFECTED SECTION
```

Si cambió una fase:

```text
READ THAT PHASE
```

Si cambiaron las reglas globales:

```text
READ GLOBAL RULES
```

Nunca recargar todo innecesariamente.

---

# 10. ESTADO DEL PROYECTO

El estado actual se mantiene en:

```text
AI-BOS-STATE.md
```

Debe registrar:

```yaml
project:
  name: AI-BOS
  master_version: 2.0.0

execution:
  current_phase:
  last_completed_phase:
  status:

validation:
  last_validated_phase:
  last_validation_date:

approval:
  approved_phase:
  approved_by:

master_document:
  version:
  commit:
  hash:

blockers: []

risks: []

next_action:
```

Este archivo debe mantenerse pequeño.

No almacenar documentación extensa.

Sólo estado.

---

# 11. CICLO DE EJECUCIÓN

Cada fase sigue:

```text
READ STATE
↓
CHECK MASTER VERSION
↓
CHECK GIT CHANGES
↓
LOAD CURRENT PHASE
↓
LOAD REQUIRED CONTEXT
↓
INSPECT
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
VALIDATE
↓
DOCUMENT
↓
CHECKPOINT
↓
UPDATE STATE
↓
STOP
```

Nunca avanzar automáticamente.

---

# 12. REGLAS DE DOCUMENTACIÓN EXTERNA

Antes de modificar una integración externa:

1. consultar documentación oficial actual
2. verificar versión
3. revisar changelog
4. revisar breaking changes
5. verificar deprecaciones
6. revisar seguridad
7. revisar ejemplos oficiales

Prioridad:

```text
OFFICIAL DOCUMENTATION
>
OFFICIAL REPOSITORY
>
OFFICIAL CHANGELOG
>
OFFICIAL EXAMPLES
>
COMMUNITY
```

No inventar:

* APIs
* endpoints
* parámetros
* SDKs
* versiones
* modelos
* configuraciones

---

# 13. MANEJO DE ERRORES

Nunca ocultar errores.

Nunca marcar una fase como completada si existen:

```text
P0 BLOCKER
```

o:

```text
CRITICAL SECURITY RISK
```

Los errores deben clasificarse:

```text
P0 BLOCKER
P1 CRITICAL
P2 HIGH
P3 MEDIUM
P4 LOW
```

---

# 14. FASES DE IMPLEMENTACIÓN

La implementación se divide en 15 fases.

```text
00 AUDIT
01 TARGET ARCHITECTURE
02 CONTRACTS + CONFIGURATION
03 ENGINEERING FOUNDATION
04 DATA + MULTI-TENANCY
05 RAG + KNOWLEDGE
06 UNIVERSAL AGENT + MEMORY
07 TOOLS + CALENDAR
08 OMNICHANNEL
09 N8N ORCHESTRATION
10 CRM + FOLLOW-UP
11 OBSERVABILITY + SELF-VALIDATION
12 ADMIN CONTROL PLANE
13 RECOVERY + CONTROLLED AUTONOMY
14 HARDENING + PRODUCTION READINESS
```

---

# PHASE 00

# SYSTEM AUDIT

## Objetivo

Conocer el estado real antes de modificar.

## Dependencias

Ninguna.

## No hacer

* refactor
* migraciones
* eliminación
* cambios arquitectónicos

## Prompt

```text
Ejecuta únicamente PHASE 00 — SYSTEM AUDIT.

Realiza una auditoría integral y no destructiva del sistema existente.

Inspecciona únicamente componentes relevantes del proyecto:

- repositorio
- aplicaciones
- servicios
- documentación
- arquitectura
- agentes
- LLM
- prompts
- skills
- MCP
- Supabase
- PostgreSQL
- RLS
- RAG
- n8n
- workflows
- canales
- integraciones
- variables
- secretos
- testing
- CI/CD
- deployment
- logging
- observabilidad

Determina qué existe realmente y qué funciona.

Clasifica:

VERIFIED
LIKELY
UNVERIFIED
UNKNOWN

Clasifica riesgos:

P0
P1
P2
P3
P4

Analiza:

- duplicación
- código reutilizable
- workflows monolíticos
- hardcoding
- falta de idempotencia
- falta de retries
- problemas de aislamiento
- deuda técnica

No modifiques funcionalidad.

No elimines archivos.

No modifiques datos.

No realices migraciones.

Crea únicamente documentación necesaria.

Genera:

AUDIT-REPORT.md
CURRENT-ARCHITECTURE.md
TECHNICAL-DEBT.md
SYSTEM-GAP-ANALYSIS.md

Genera inventarios adicionales sólo si existe información suficiente para justificar su creación.

Al finalizar:

genera CHECKPOINT.

actualiza AI-BOS-STATE.md.

detente.

No ejecutes PHASE 01.
```

## Validación

```text
[ ] Estado real identificado
[ ] Riesgos clasificados
[ ] Funcionalidad existente verificada
[ ] Deuda técnica identificada
[ ] No hubo cambios destructivos
```

## Gate

Aprobación humana.

---

# PHASE 01

# TARGET ARCHITECTURE

## Objetivo

Definir arquitectura objetivo basada en el estado real.

## Prompt

```text
Ejecuta únicamente PHASE 01 — TARGET ARCHITECTURE.

Lee únicamente los artefactos generados por PHASE 00 relevantes para arquitectura.

Define:

- Immutable Core
- Domain
- Application
- Infrastructure
- Adapters
- Integrations
- Agents
- Knowledge
- RAG
- Memory
- Tools
- Orchestration
- Observability
- Control Plane

Define contratos y límites.

Diseña una evolución incremental desde CURRENT STATE hacia TARGET STATE.

Evita reescribir componentes funcionales sin necesidad.

No implementes todavía migraciones masivas.

No construyas funcionalidades que no sean necesarias para el MVP.

Genera:

TARGET-ARCHITECTURE.md
SYSTEM-COMPONENT-DIAGRAM.md
DATA-FLOW.md
INTEGRATION-MAP.md
ARCHITECTURE-MIGRATION-PLAN.md

Crea o actualiza ADR sólo para decisiones relevantes.

Valida.

Genera CHECKPOINT.

Actualiza AI-BOS-STATE.md.

Detente.
```

## Gate

Aprobación humana.

---

# PHASE 02

# CONTRACTS + CONFIGURATION

## Objetivo

Crear contratos estables y configuración desacoplada.

## Prompt

```text
Ejecuta únicamente PHASE 02.

Implementa contratos para:

InboundMessage
OutboundMessage
Conversation
Contact
Lead
AgentContext
KnowledgeQuery
KnowledgeResult
ToolRequest
ToolResult
Appointment
Event
WorkflowExecution
ErrorEvent

Centraliza configuración.

Define niveles:

GLOBAL
ENVIRONMENT
TENANT
CHANNEL
AGENT
WORKFLOW
PROVIDER

Elimina hardcoding sólo donde sea seguro.

No rompas funcionalidades existentes.

Crea tests de contratos.

Demuestra que cambiar un proveedor no requiere modificar el Immutable Core.

Valida.

Genera CHECKPOINT.

Actualiza AI-BOS-STATE.md.

Detente.
```

---

# PHASE 03

# ENGINEERING FOUNDATION

## Objetivo

Garantizar una base técnica reproducible.

## Prompt

```text
Ejecuta únicamente PHASE 03.

Configura o valida únicamente lo necesario:

- lint
- formatter
- type checking
- unit tests
- integration tests
- E2E cuando corresponda
- CI/CD
- environment management
- secrets management
- logging
- error handling

Define comandos reproducibles:

install
dev
build
test
lint
typecheck
validate
health

No implementar funcionalidades de negocio.

Validar:

CLONE
→ INSTALL
→ CONFIGURE
→ RUN
→ TEST

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 04

# DATA + MULTI-TENANCY

## Objetivo

Crear una base de datos segura y tenant-aware.

## Prompt

```text
Ejecuta únicamente PHASE 04.

Audita primero el esquema existente.

Implementa o ajusta sólo las entidades necesarias.

Como mínimo considerar:

tenants
users
contacts
leads
conversations
messages
conversation_state
follow_ups
appointments
integrations
agents
skills
tools
workflows
audit_logs

No crear tablas innecesarias.

Toda entidad relacionada con negocio debe soportar tenant_id cuando corresponda.

Implementar:

- foreign keys
- índices necesarios
- constraints
- timestamps
- auditoría
- RLS

Las migraciones deben ser versionadas y reproducibles.

No eliminar datos.

Probar aislamiento:

TENANT A
NO PUEDE LEER
TENANT B

No implementar complejidad SaaS innecesaria.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

## Gate

Aprobación humana obligatoria.

---

# PHASE 05

# RAG + KNOWLEDGE

## Objetivo

Crear una capa de conocimiento genérica y aislada por tenant.

## Arquitectura

```text
TENANT
↓
KNOWLEDGE BASE
↓
INGESTION
↓
CHUNKING
↓
METADATA
↓
EMBEDDING
↓
VECTOR STORE
↓
RETRIEVAL
↓
RANKING
↓
CONTEXT
```

## Prompt

```text
Ejecuta únicamente PHASE 05.

Implementa o refactoriza RAG usando Supabase/pgvector cuando corresponda.

El sistema debe soportar múltiples knowledge bases por tenant.

Implementa:

INGEST
→ CLEAN
→ CHUNK
→ METADATA
→ EMBEDDING
→ STORE

QUERY
→ UNDERSTAND
→ EMBED
→ FILTER
→ SEARCH
→ RANK
→ CONTEXT

Separar estrictamente:

SYSTEM INSTRUCTIONS
CUSTOMER SERVICE EXPERTISE
TENANT CONFIGURATION
BUSINESS KNOWLEDGE

El contenido recuperado por RAG nunca debe convertirse automáticamente en instrucciones del sistema.

Implementar filtros por tenant y knowledge base.

Probar:

- relevancia
- ausencia de resultados
- información contradictoria
- aislamiento tenant

No implementar evaluación avanzada innecesaria.

Crear sólo métricas suficientes para medir calidad.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 06

# UNIVERSAL AGENT + MEMORY

## Objetivo

Crear un agente universal independiente del negocio y canal.

## Prompt

```text
Ejecuta únicamente PHASE 06.

Crear o refactorizar el Universal Agent.

Debe ser independiente de:

- canal
- proveedor LLM
- negocio
- proveedor RAG

Debe recibir AgentContext.

Debe poder:

- detectar intención
- consultar RAG
- utilizar memoria
- ejecutar tools
- responder
- escalar
- rechazar solicitudes fuera de alcance

Separar:

CUSTOMER SERVICE EXPERTISE
de
BUSINESS KNOWLEDGE

Implementar memoria mínima viable:

- mensajes recientes
- resumen de conversación
- contexto relevante
- información persistente necesaria

No implementar memoria vectorial compleja si no existe una necesidad demostrada.

Implementar controles contra:

- alucinaciones
- prompt injection
- acciones no autorizadas
- información no verificada

Crear tests:

- conocida
- desconocida
- ambigua
- fuera de alcance
- contradictoria
- prompt injection
- escalamiento

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 07

# TOOLS + CALENDAR

## Objetivo

Permitir acciones externas mediante interfaces desacopladas.

## Tools iniciales

```text
searchKnowledge
getContact
updateContact
createLead
updateLead
createFollowUp
getAvailability
createAppointment
rescheduleAppointment
cancelAppointment
transferToHuman
```

## Prompt

```text
Ejecuta únicamente PHASE 07.

Implementa interfaces abstractas para tools.

Cada tool debe validar:

- input
- autorización
- permisos
- errores
- timeout
- retry
- idempotencia
- auditoría

Crear CalendarProvider.

Preparar adaptadores:

Google Calendar
Cal.com

Implementar inicialmente sólo el proveedor necesario para el MVP.

El segundo proveedor debe poder incorporarse sin modificar el Agent Core.

Probar:

VALID
INVALID
UNAUTHORIZED
TIMEOUT
FAILURE
DUPLICATE

Validar timezone y doble reserva.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 08

# OMNICHANNEL

## Objetivo

Normalizar múltiples canales sin acoplar el agente.

## Canales objetivo

```text
WhatsApp
Telegram
Messenger
Instagram
```

## Prompt

```text
Ejecuta únicamente PHASE 08.

Implementa adapters por canal.

Arquitectura:

CHANNEL
→ ADAPTER
→ NORMALIZE
→ INBOUND MESSAGE
→ AI-BOS
→ OUTBOUND MESSAGE
→ ADAPTER
→ CHANNEL

El agente no debe conocer detalles específicos del canal.

Utiliza contratos comunes.

Comienza con el canal funcional existente.

Valida completamente ese canal.

Después integra los canales restantes uno por uno.

No implementar los cuatro canales simultáneamente si aumenta el riesgo.

Cada canal debe poder probarse independientemente.

Demostrar que agregar un nuevo canal no requiere modificar Agent Core ni RAG Core.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 09

# N8N ORCHESTRATION

## Objetivo

Convertir n8n en la capa de orquestación modular.

## Workflows objetivo

```text
WF-INBOUND
WF-NORMALIZE
WF-RESOLVE-TENANT
WF-RESOLVE-CONTACT
WF-CONTEXT
WF-RAG
WF-AGENT
WF-TOOLS
WF-OUTBOUND
WF-PERSIST
WF-FOLLOW-UP
WF-APPOINTMENT
WF-ERROR
```

No todos deben crearse si todavía no son necesarios.

## Prompt

```text
Ejecuta únicamente PHASE 09.

Audita primero los workflows existentes.

Reutiliza workflows funcionales.

Refactoriza únicamente donde aporte estabilidad o reutilización.

Crear workflows pequeños y especializados.

Evitar workflows monolíticos.

Utilizar Execute Workflow cuando corresponda.

Implementar:

- idempotencia
- retries
- timeout
- error handling
- correlationId
- tenantId
- logging

Centralizar variables y configuración.

No almacenar credenciales directamente en workflows.

Probar workflows individualmente.

Después ejecutar prueba end-to-end.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 10

# CRM + FOLLOW-UP

## Objetivo

Gestionar el ciclo comercial y operativo básico.

## Flujo

```text
CONTACT
↓
LEAD
↓
CONVERSATION
↓
QUALIFICATION
↓
FOLLOW-UP
↓
APPOINTMENT
↓
CONVERSION
```

## Prompt

```text
Ejecuta únicamente PHASE 10.

Implementa únicamente las capacidades necesarias para gestionar:

- contactos
- leads
- conversaciones
- estado
- seguimiento
- próxima acción
- citas

Los follow-ups deben persistir independientemente de la conversación activa.

Evitar construir un CRM empresarial complejo.

El sistema debe permitir crecer posteriormente.

Validar ciclo completo.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 11

# OBSERVABILITY + SELF-VALIDATION

## Objetivo

Saber qué ocurre en el sistema antes de intentar automatizar su recuperación.

## Prompt

```text
Ejecuta únicamente PHASE 11.

Implementa observabilidad mínima efectiva.

Registrar:

logs
errors
health checks
workflow executions
agent executions
RAG operations
tool executions

Toda ejecución relevante debe incluir:

correlationId
tenantId
conversationId
workflowId
executionId

Implementar estados:

HEALTHY
DEGRADED
FAILED
UNKNOWN

Crear health checks para dependencias críticas.

Debe ser posible responder:

qué ocurrió
por qué ocurrió
dónde falló
qué tenant fue afectado
qué workflow participó
qué agente participó

No construir todavía una plataforma avanzada de observabilidad.

Priorizar información accionable.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 12

# ADMIN CONTROL PLANE

## Condición de entrada

Esta fase sólo debe ejecutarse cuando exista suficiente información generada por PHASE 11.

## Objetivo

Crear una vista administrativa interna.

## Prompt

```text
Ejecuta únicamente PHASE 12.

Primero valida que PHASE 11 proporcione datos suficientes.

Construye un Control Plane administrativo interno.

No es un frontend para clientes.

Debe visualizar inicialmente:

- system health
- errores
- workflows
- ejecuciones
- tenants
- agentes
- RAG
- herramientas

No construir todas las capacidades administrativas de una vez.

Prioridad:

1. health
2. errors
3. executions
4. workflows
5. agents
6. RAG
7. tenants

Evaluar React, Vue, Astro, Next.js u otra alternativa.

Seleccionar según:

- mantenibilidad
- seguridad
- rendimiento
- complejidad
- integración
- escalabilidad

Crear ADR para la decisión.

El Control Plane no debe contener lógica crítica del AI-BOS.

Debe consumir APIs y datos existentes.

Implementar autenticación y autorización.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 13

# RECOVERY + CONTROLLED AUTONOMY

## Objetivo

Agregar recuperación automática de bajo riesgo y evolución controlada.

## Evolución

```text
LEVEL 1
DETECT

LEVEL 2
RETRY

LEVEL 3
BACKOFF

LEVEL 4
FALLBACK

LEVEL 5
RESTART

LEVEL 6
RECOMMEND

LEVEL 7
HUMAN APPROVAL
```

## Prompt

```text
Ejecuta únicamente PHASE 13.

Implementa recuperación automática únicamente para operaciones seguras y reversibles.

Flujo:

DETECT
→ CLASSIFY
→ RETRY
→ BACKOFF
→ FALLBACK
→ RECOVER
→ VALIDATE
→ NOTIFY

Permitir:

- retries
- backoff
- fallback
- restart controlado
- reanudación segura

No permitir autonomía para:

- migraciones destructivas
- cambios de seguridad
- cambios multi-tenant
- cambios arquitectónicos
- modificaciones críticas de configuración

Registrar todas las acciones automáticas.

Implementar inicialmente sólo acciones de bajo riesgo.

Crear sistema de recomendaciones para mejoras.

No modificar código automáticamente.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# PHASE 14

# HARDENING + PRODUCTION READINESS

## Objetivo

Determinar si el sistema está preparado para producción.

## Prompt

```text
Ejecuta únicamente PHASE 14.

Realiza auditoría final.

Validar:

- arquitectura
- seguridad
- secretos
- RLS
- multi-tenancy
- RAG
- agentes
- memoria
- tools
- agenda
- canales
- n8n
- CRM
- observabilidad
- Control Plane
- recuperación

Ejecutar según corresponda:

unit tests
integration tests
contract tests
E2E tests
security tests
multi-tenant tests
RAG tests
agent tests
workflow tests
failure tests
recovery tests
load tests

No ejecutar pruebas costosas si no son relevantes para el estado actual.

Clasificar:

GO
NO-GO
GO-WITH-RISKS

Generar:

PRODUCTION-READINESS-REPORT.md

Documentar:

- funcionalidades
- riesgos
- deuda técnica
- problemas conocidos
- pruebas
- evidencias
- recomendaciones

No desplegar automáticamente.

Generar CHECKPOINT.

Actualizar AI-BOS-STATE.md.

Detenerse.
```

---

# 15. CHECKPOINT UNIVERSAL

Toda fase debe finalizar con:

```yaml
phase:
status:

objective:
implemented:

files_created: []
files_modified: []

database_changes: []

workflows_changed: []

integrations_changed: []

tests:
  executed:
  passed:
  failed:

validation:

evidence: []

documentation: []

known_issues: []

risks: []

blockers: []

master_version:

ready_for_next_phase:

human_approval_required:
```

---

# 16. HUMAN GATES

No avanzar automáticamente.

Gates obligatorios:

```text
PHASE 00
        ↓
HUMAN GATE

PHASE 01
        ↓
HUMAN GATE

PHASE 04
        ↓
HUMAN GATE

PHASE 05
        ↓
HUMAN GATE

PHASE 06
        ↓
HUMAN GATE

PHASE 08
        ↓
HUMAN GATE

PHASE 11
        ↓
HUMAN GATE

PHASE 12
        ↓
HUMAN GATE

PHASE 14
        ↓
FINAL GATE
```

Las fases intermedias pueden avanzar sólo si el checkpoint anterior está aprobado.

---

# 17. REGLA DE NO REPETICIÓN

Antes de ejecutar cualquier tarea:

```text
SEARCH
↓
INSPECT
↓
CHECK STATE
↓
CHECK CHECKPOINT
↓
CHECK GIT
↓
REUSE
```

Nunca:

```text
REBUILD
```

si:

```text
EXISTS
+
VALIDATED
+
REUSABLE
```

---

# 18. REGLA DE AUDITORÍA

Una auditoría sólo debe repetirse si:

```text
CODE CHANGED
OR
ARCHITECTURE CHANGED
OR
DEPENDENCY CHANGED
OR
SECURITY EVENT
OR
VALIDATION FAILED
```

De lo contrario:

```text
USE PREVIOUS CHECKPOINT
```

---

# 19. REGLA DE TESTING

No repetir todos los tests después de cada modificación.

Seleccionar:

```text
TARGETED TESTS
```

y ejecutar:

```text
REGRESSION TESTS
```

sólo cuando el cambio pueda afectar componentes relacionados.

Ejemplo:

```text
RAG CHANGE
↓
RAG TESTS
+
AGENT CONTEXT TESTS
+
RELEVANT E2E
```

No necesariamente:

```text
ENTIRE TEST SUITE
```

---

# 20. REGLA DE COSTOS

El sistema debe optimizar:

```text
QUALITY
+
RELIABILITY
+
LOW COST
```

No optimizar únicamente costo.

Prioridad:

```text
1. CORRECTNESS
2. SECURITY
3. STABILITY
4. COST
5. PERFORMANCE
```

Reducir costos mediante:

* contexto mínimo
* caching cuando sea adecuado
* reutilización de resultados
* evitar llamadas duplicadas
* modelos adecuados al tipo de tarea
* workflows eficientes
* retrieval eficiente
* evitar procesamiento innecesario

---

# 21. ESTRATEGIA DE MODELOS

No utilizar el modelo más costoso para todo.

Separar tareas:

```text
LOW COMPLEXITY
→ FAST / CHEAP MODEL

MEDIUM COMPLEXITY
→ STANDARD MODEL

HIGH COMPLEXITY
→ STRONG MODEL
```

Ejemplos:

```text
CLASSIFICATION
→ CHEAP

ROUTING
→ CHEAP

SUMMARIZATION
→ CHEAP / MEDIUM

CUSTOMER SERVICE
→ MEDIUM / HIGH QUALITY

ARCHITECTURE
→ STRONG

DEBUGGING COMPLEX
→ STRONG
```

La selección de modelos debe ser configurable.

Nunca hardcodear un proveedor específico en el Immutable Core.

---

# 22. NIVELES DE AUTONOMÍA

```text
LEVEL 0
MANUAL

LEVEL 1
DETECT

LEVEL 2
RECOMMEND

LEVEL 3
AUTO-RECOVER

LEVEL 4
AUTO-OPTIMIZE

LEVEL 5
CONTROLLED EVOLUTION
```

El sistema debe comenzar en:

```text
LEVEL 1
```

y evolucionar progresivamente.

No activar autonomía avanzada hasta contar con:

* suficiente observabilidad
* historial de errores
* validaciones
* rollback
* auditoría

---

# 23. REGLAS DE AUTONOMÍA

Nunca ejecutar automáticamente:

```text
destructive migrations
security changes
tenant isolation changes
architecture changes
production deployments
```

sin aprobación humana.

---

# 24. DOCUMENTATION WATCH

La revisión de documentación externa no debe ser una fase permanente del producto.

Debe funcionar como una actividad operativa.

Debe activarse cuando:

```text
dependency update
integration change
breaking change
security advisory
```

El proceso:

```text
DETECT
↓
CHECK OFFICIAL DOCS
↓
ASSESS IMPACT
↓
PLAN
↓
TEST
↓
UPDATE
```

No revisar toda la documentación en cada ejecución.

---

# 25. ARQUITECTURA DE CONTEXTO PARA OPENCODE

El proyecto debe utilizar:

```text
AGENTS.md
+
AI-BOS SKILL
+
AI-BOS-MASTER-IMPLEMENTATION.md
+
AI-BOS-STATE.md
+
Git
```

Responsabilidades:

```text
AGENTS.md
REGLAS PERMANENTES

SKILL
PROTOCOLO DE EJECUCIÓN

MASTER
PLAN MAESTRO

STATE
ESTADO ACTUAL

CHECKPOINT
EVIDENCIA DE VALIDACIÓN

GIT
CAMBIOS
```

---

# 26. FLUJO DE CONTEXTO

```text
AGENTS.md
      ↓
AI-BOS-STATE.md
      ↓
CHECK MASTER VERSION
      ↓
CHECK GIT CHANGES
      ↓
CURRENT PHASE
      ↓
PHASE X
      ↓
RELEVANT ARTIFACTS
      ↓
RELEVANT CODE
      ↓
IMPLEMENT
      ↓
VALIDATE
      ↓
CHECKPOINT
      ↓
UPDATE STATE
      ↓
STOP
```

---

# 27. ESTRUCTURA RECOMENDADA

```text
/
├── AGENTS.md
│
├── .opencode/
│   └── skills/
│       └── ai-bos/
│           ├── SKILL.md
│           ├── phase-execution.md
│           ├── validation.md
│           └── checkpoints.md
│
├── docs/
│   └── admin/
│       ├── AI-BOS-MASTER-IMPLEMENTATION.md
│       ├── AI-BOS-STATE.md
│       ├── architecture/
│       ├── adr/
│       ├── audit/
│       └── checkpoints/
│
└── src/
```

---

# 28. DEFINICIÓN DE TERMINADO

Una fase sólo está terminada cuando:

```text
IMPLEMENTATION
+
TESTS
+
VALIDATION
+
EVIDENCE
+
DOCUMENTATION
+
CHECKPOINT
+
STATE UPDATE
```

y cuando corresponda:

```text
HUMAN APPROVAL
```

---

# 29. ORDEN DEFINITIVO

```text
PHASE 00
SYSTEM AUDIT
        ↓
PHASE 01
TARGET ARCHITECTURE
        ↓
PHASE 02
CONTRACTS + CONFIGURATION
        ↓
PHASE 03
ENGINEERING FOUNDATION
        ↓
PHASE 04
DATA + MULTI-TENANCY
        ↓
PHASE 05
RAG + KNOWLEDGE
        ↓
PHASE 06
UNIVERSAL AGENT + MEMORY
        ↓
PHASE 07
TOOLS + CALENDAR
        ↓
PHASE 08
OMNICHANNEL
        ↓
PHASE 09
N8N ORCHESTRATION
        ↓
PHASE 10
CRM + FOLLOW-UP
        ↓
PHASE 11
OBSERVABILITY + SELF-VALIDATION
        ↓
PHASE 12
ADMIN CONTROL PLANE
        ↓
PHASE 13
RECOVERY + CONTROLLED AUTONOMY
        ↓
PHASE 14
HARDENING + PRODUCTION READINESS
```

---

# 30. ESTADO FINAL ESPERADO

```text
                         AI-BOS
                            │
              ┌─────────────┴─────────────┐
              │                           │
          CHANNELS                  ADMIN CONTROL
              │                           │
      WhatsApp / Telegram            Health
      Messenger / Instagram          Errors
              │                      Metrics
              └──────────┬──────────────┘
                         │
                    N8N ORCHESTRATION
                         │
              ┌──────────┼──────────┐
              │          │          │
            AGENT       RAG        TOOLS
              │          │          │
           MEMORY     KNOWLEDGE   CALENDAR
              │          │          │
              └──────────┼──────────┘
                         │
                    IMMUTABLE CORE
                         │
                    APPLICATION
                         │
                       DOMAIN
                         │
                   INFRASTRUCTURE
                         │
                      SUPABASE
```

---

# 31. REGLA MAESTRA DE EJECUCIÓN

```text
ONE MASTER
ONE STATE
ONE CURRENT PHASE
ONE EXECUTION
ONE VALIDATION
ONE CHECKPOINT
ONE APPROVAL
THEN NEXT
```

---

# 32. INSTRUCCIÓN DE INICIO

Para iniciar el proyecto:

```text
Lee AGENTS.md.

Lee AI-BOS-STATE.md.

Verifica la versión del Master Document.

Verifica si el Master Document cambió desde el último checkpoint.

Identifica la fase actual.

Carga únicamente la fase actual y sus dependencias necesarias.

Ejecuta únicamente esa fase.

No avances automáticamente.

Al finalizar:

1. valida
2. genera evidencia
3. genera checkpoint
4. actualiza AI-BOS-STATE.md
5. detente
```

---

# 33. INSTRUCCIÓN PARA CONTINUAR

```text
Lee AGENTS.md.

Lee AI-BOS-STATE.md.

Verifica el último checkpoint.

Verifica la versión del Master Document.

Verifica cambios relevantes en Git.

Determina la siguiente fase aprobada.

Carga únicamente:

- la fase actual
- dependencias necesarias
- documentación relevante
- código relevante

No vuelvas a auditar componentes previamente validados salvo que hayan cambiado.

Ejecuta únicamente la siguiente fase.

Valida.

Genera checkpoint.

Actualiza AI-BOS-STATE.md.

Detente.
```

---

# 34. DEFINICIÓN FINAL DEL SISTEMA

AI-BOS debe evolucionar bajo el principio:

```text
BUILD LESS
UNDERSTAND MORE
REUSE FIRST
VALIDATE ALWAYS
OBSERVE EVERYTHING IMPORTANT
AUTOMATE ONLY WHAT IS SAFE
SCALE ONLY WHEN NEEDED
```

El sistema debe ser:

```text
SIMPLE
MODULAR
SEGURO
OBSERVABLE
REUTILIZABLE
MULTI-TENANT
ESCALABLE
COST-EFFICIENT
```

La complejidad debe crecer únicamente cuando el negocio y la operación lo justifiquen.

---

# 35. FUENTE ÚNICA DE VERDAD

Este documento es la fuente maestra para:

* orden de implementación
* objetivos
* alcance
* dependencias
* prompts de ejecución
* validaciones
* checkpoints
* gates
* estrategia de contexto

Las instrucciones permanentes del agente se encuentran en:

```text
AGENTS.md
```

El protocolo de ejecución se encuentra en:

```text
.opencode/skills/ai-bos/SKILL.md
```

El estado actual se encuentra en:

```text
AI-BOS-STATE.md
```

La evidencia de ejecución se encuentra en:

```text
docs/admin/checkpoints/
```

Los cambios se controlan mediante:

```text
Git
```

La combinación de estos componentes constituye el sistema operativo de desarrollo del AI-BOS.

---

# 36. REGLA DE ORO

```text
DO NOT LOAD WHAT YOU DO NOT NEED.

DO NOT BUILD WHAT YOU DO NOT NEED.

DO NOT REPEAT WHAT IS ALREADY VERIFIED.

DO NOT AUTOMATE WHAT IS NOT YET OBSERVABLE.

DO NOT SCALE COMPLEXITY BEFORE SCALE REQUIRES IT.
```

---

# END OF MASTER IMPLEMENTATION v2
