-- workspace_connectors: OAuth tokens for Microsoft (and future providers) per workspace
CREATE TABLE IF NOT EXISTS workspace_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_connection_name TEXT,
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_connectors_workspace_provider ON workspace_connectors(workspace_id, provider);

-- connector_audit_log: audit trail for connector actions
CREATE TABLE IF NOT EXISTS connector_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES workspace_connectors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_audit_log_workspace ON connector_audit_log(workspace_id, created_at DESC);

-- workspace_files: metadata for files stored in O365 (OneDrive/SharePoint) via Graph
CREATE TABLE IF NOT EXISTS workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES workspace_connectors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  provider TEXT NOT NULL DEFAULT 'onedrive',
  provider_item_id TEXT NOT NULL,
  drive_id TEXT,
  path TEXT NOT NULL,
  web_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_files_workspace ON workspace_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_connection ON workspace_files(connection_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_document ON workspace_files(document_id);

-- document_versions: add O365 fields so a version can point to OneDrive/SharePoint instead of storage_path
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'supabase';
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS provider_item_id TEXT;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS o365_path TEXT;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS web_url TEXT;

-- RLS workspace_connectors: only workspace members
ALTER TABLE workspace_connectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_connectors_select ON workspace_connectors;
CREATE POLICY workspace_connectors_select ON workspace_connectors FOR SELECT USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS workspace_connectors_insert ON workspace_connectors;
CREATE POLICY workspace_connectors_insert ON workspace_connectors FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS workspace_connectors_update ON workspace_connectors;
CREATE POLICY workspace_connectors_update ON workspace_connectors FOR UPDATE USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS workspace_connectors_delete ON workspace_connectors;
CREATE POLICY workspace_connectors_delete ON workspace_connectors FOR DELETE USING (can_manage_workspace(workspace_id));

-- RLS connector_audit_log
ALTER TABLE connector_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS connector_audit_log_select ON connector_audit_log;
CREATE POLICY connector_audit_log_select ON connector_audit_log FOR SELECT USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS connector_audit_log_insert ON connector_audit_log;
CREATE POLICY connector_audit_log_insert ON connector_audit_log FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

-- RLS workspace_files
ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_files_select ON workspace_files;
CREATE POLICY workspace_files_select ON workspace_files FOR SELECT USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS workspace_files_insert ON workspace_files;
CREATE POLICY workspace_files_insert ON workspace_files FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS workspace_files_update ON workspace_files;
CREATE POLICY workspace_files_update ON workspace_files FOR UPDATE USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS workspace_files_delete ON workspace_files;
CREATE POLICY workspace_files_delete ON workspace_files FOR DELETE USING (is_workspace_member(workspace_id));

-- Ensure updated_at exists (if table was created elsewhere)
ALTER TABLE workspace_connectors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Trigger updated_at for workspace_connectors
DROP TRIGGER IF EXISTS workspace_connectors_updated_at ON workspace_connectors;
CREATE TRIGGER workspace_connectors_updated_at
  BEFORE UPDATE ON workspace_connectors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
