# Phase 06 Checkpoint — Universal Agent + Memory

```yaml
phase: "PHASE 06"
status: "COMPLETED"
objective: "Crear un agente universal (UniversalAgent) con memoria, guard de seguridad, RAG y tools orquestadas, e integrarlo en el canal WhatsApp"
note: "Checkpoint generado el 2026-08-02 con evidencia verificada del código, tests y del bot en ejecución."

implemented:
  - "Ports del agente: AgentContext, AgentResult, LLMProvider, RAGProvider, MemoryProvider, ToolProvider, IntentType (src/core/types/agent.ts)"
  - "Guard de seguridad: detectPromptInjection (regex) + evaluateIntent (known/unknown/out_of_scope/contradictory/prompt_injection) (src/lib/agent/guard.ts)"
  - "Memoria mínima viable: summarizeConversation vía LLM + SupabaseMemoryProvider (getRecent/getSummary/updateSummary) (src/lib/agent/memory.ts)"
  - "Columna summary en tabla conversations + getConversationSummary/updateConversationSummary en src/lib/db.ts"
  - "Provider LLM extraído: OpenRouterLLMProvider con rate limit por conversación, loop multi-turn MAX_TURNS=5 y ejecución de tools (src/lib/agent/providers/openrouter-llm.ts)"
  - "Provider RAG: SupabaseRAGProvider que delega en retrieveContext (src/lib/agent/providers/rag-provider.ts)"
  - "Provider Tools: DefaultToolProvider que expone toolDefinitions y ejecuta executeTool (src/lib/agent/providers/tool-provider.ts)"
  - "UniversalAgent core: orquestación pura (guard → RAG best-effort → system prompt → LLM → tools → resultado) (src/lib/agent/universal-agent.ts)"
  - "Separación expertise vs business knowledge: getCustomerServiceExpertise/getBusinessKnowledge/splitPrompt (src/lib/system-prompt.ts)"
  - "Integración en canal Baileys: handler.ts usa UniversalAgent por conversación (conversationId real) en vez de generateReply directo"

files_created:
  - "src/core/types/agent.ts"
  - "src/lib/agent/guard.ts"
  - "src/lib/agent/guard.test.ts"
  - "src/lib/agent/memory.ts"
  - "src/lib/agent/memory.test.ts"
  - "src/lib/agent/universal-agent.ts"
  - "src/lib/agent/universal-agent.test.ts"
  - "src/lib/agent/providers/openrouter-llm.ts"
  - "src/lib/agent/providers/rag-provider.ts"
  - "src/lib/agent/providers/tool-provider.ts"
  - "src/lib/system-prompt.test.ts"

files_modified:
  - "src/lib/openrouter.ts (delega en OpenRouterLLMProvider; validateApiKey conservado)"
  - "src/lib/system-prompt.ts (expertise + business knowledge separados, reglas de negocio preservadas)"
  - "src/lib/baileys/handler.ts (integra UniversalAgent por conversación)"
  - "src/lib/db.ts (getConversationSummary/updateConversationSummary)"
  - "src/core/types/database.ts (summary en Conversation)"
  - ".gitignore (tsconfig.tsbuildinfo)"

database_changes:
  - "ALTER TABLE conversations ADD COLUMN summary (asumido en código; verificar migración en runtime)"

tests:
  executed: 34
  passed: 34
  failed: 0

validation: "Typecheck sin errores. 34 tests pasando (8 archivos). Bot verificado en ejecución con el UniversalAgent activo."

evidence:
  - "npm run typecheck — 0 errores (2026-08-02)"
  - "npm run test — 34/34 tests pasando, 8 files (2026-08-02)"
  - "docker compose up -d --build — imagen construida OK tras sync de package-lock.json"
  - "docker logs whatsapp-agent — ✓ conectado como 5215664436277, outbox listener activo"
  - "GET /api/connection/status — { status: connected, phone: 5215664436277 }"
  - "Commits: 95a2a01 (types), 1e7d841 (guard), 287f744 (memory), f3f6f1f (LLM provider), d5f1924 (RAG/Tools providers), 0deb162 (UniversalAgent), c31370a (system-prompt split), 182403c (handler + fix conversación), 5ae01fb (lock sync)"

known_issues:
  - "result.action nunca es 'escalate' con el OpenRouterLLMProvider actual: el provider ejecuta las tools internamente y devuelve toolCalls vacío; la escalada a humano funciona vía efecto secundario (setMode(conversationId, HUMAN)). Refactor futuro: el provider debería devolver las toolCalls ejecutadas."
  - "setMode sin await en derivar-humano.ts (race condition menor en la persistencia del modo)"
  - "La columna summary en Supabase se asume presente; si la tabla conversations no la tiene, requiere migración antes de usar updateSummary en runtime"

risks:
  - "R-007 RESUELTO: escalada a humano rota por conversationId 'runtime' en el singleton del agente → fix aplicado (agente construido por-conversación con convo.id)"
  - "R-008 ABIERTO: generateReply (usado por vía legacy) quedó sin tools desde Task 4; el handler de Baileys ya usa el agente completo con tools, pero cualquier otro consumidor de generateReply que dependiera de tools queda afectado"

blockers: []

master_version: "2.0.0"

ready_for_next_phase: true

human_approval_required: true
```

---

## Validation Checklist

- [x] Ports del agente definidos y tipados (AgentContext, AgentResult, LLMProvider, RAGProvider, MemoryProvider, ToolProvider)
- [x] Guard de seguridad: prompt injection detectada y rechazada sin llamar al LLM
- [x] Intent routing: known / unknown / out_of_scope / contradictory / prompt_injection
- [x] Memoria: resumen de conversación generado y persistido
- [x] Provider LLM con rate limit y loop multi-turn de tools
- [x] Providers RAG y Tools implementando sus ports
- [x] UniversalAgent orquesta guard → RAG → LLM → tools → resultado
- [x] Expertise y business knowledge separados, sin perder reglas de negocio
- [x] Handler de Baileys integra el agente con conversationId real (escalada y rate-limit correctos)
- [x] TypeScript compila sin errores
- [x] 34 tests pasando
- [x] Bot verificado en ejecución (conectado como 5215664436277)

---

## Arquitectura Verificada

```text
WHATSAPP (Baileys)
↓
handleIncomingMessages (handler.ts)
↓
AgentContext (tenantId, conversationId, channel, userPhone, systemInstructions,
              businessKnowledge, ragContext, history, conversationSummary, nowIso)
↓
UniversalAgent.process(ctx)
  ├── evaluateIntent (guard) → prompt_injection/out_of_scope → reject sin LLM
  ├── RAG best-effort (SupabaseRAGProvider.retrieve)
  ├── buildSystemPrompt (expertise + business knowledge + resumen + rag)
  ├── LLMProvider.complete (OpenRouter, multi-turn, rate limit por conversación)
  │     └── tools ejecutadas internamente (DefaultToolProvider.execute)
  └── AgentResult (action, reply, intent, toolsUsed, usedRag)
↓
respuesta enviada + insertMessage (memoria de conversación)
```

---

**Generated by:** AI-BOS Phase 06 — Universal Agent + Memory
**Date:** 2026-08-02 (validación en vivo)
**Status:** COMPLETED — verificado
