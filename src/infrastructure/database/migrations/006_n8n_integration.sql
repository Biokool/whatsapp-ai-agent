-- 006_n8n_integration.sql
-- n8n workflow integration for document uploads

-- ============================================================
-- n8n Configuration (per tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS n8n_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- ============================================================
-- Document Versions (history tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  file_size INT,
  file_hash TEXT,
  storage_provider TEXT NOT NULL DEFAULT 'gdrive',
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Modify documents table for external storage
-- ============================================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS current_version INT NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'local';

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_n8n_config_tenant ON n8n_config(tenant_id);
CREATE INDEX idx_doc_versions_doc ON document_versions(document_id);
CREATE INDEX idx_doc_versions_tenant ON document_versions(tenant_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE n8n_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY n8n_config_tenant_isolation ON n8n_config
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY doc_versions_tenant_isolation ON document_versions
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE TRIGGER update_n8n_config_updated_at BEFORE UPDATE ON n8n_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
