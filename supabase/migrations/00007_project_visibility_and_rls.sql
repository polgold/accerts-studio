-- projects.visibility: 'workspace' (solo miembros) | 'public' (cualquier logueado puede ver)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'workspace';

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_visibility_check;

ALTER TABLE projects
ADD CONSTRAINT projects_visibility_check CHECK (visibility IN ('workspace', 'public'));

-- Helper: current user is workspace admin (owner or admin) and active
CREATE OR REPLACE FUNCTION is_workspace_admin(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS projects: SELECT = miembro activo del workspace OR visibility = 'public'
DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects FOR SELECT USING (
  is_workspace_member(workspace_id)
  OR visibility = 'public'
);

-- INSERT/UPDATE: solo miembros activos del workspace
DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects FOR INSERT
WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update ON projects FOR UPDATE
USING (is_workspace_member(workspace_id));

-- DELETE: solo owner/admin del workspace
DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete ON projects FOR DELETE
USING (is_workspace_admin(workspace_id));
