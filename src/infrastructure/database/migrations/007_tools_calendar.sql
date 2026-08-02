-- 007_tools_calendar.sql
-- Fase 07: Tools + Calendar

-- ============================================================
-- Follow-ups (recordatorios independientes de la conversación)
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK(status IN ('pending','done','cancelled')) NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON follow_ups(tenant_id, scheduled_at);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY follow_ups_tenant_isolation ON follow_ups
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- ============================================================
-- Tool executions (idempotencia + rastro)
-- ============================================================
CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL,
  input JSONB,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, tool_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_tenant ON tool_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_key ON tool_executions(tenant_id, idempotency_key);

ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tool_executions_tenant_isolation ON tool_executions
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- ============================================================
-- Appointments: añadir timezone y external_id (multi-proveedor)
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS external_event_id TEXT;

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
