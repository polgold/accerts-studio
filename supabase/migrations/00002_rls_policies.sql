-- Helper: current user is member of workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: current user has at least one of the roles in workspace
CREATE OR REPLACE FUNCTION workspace_has_role(ws_id UUID, roles TEXT[], u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id AND status = 'active' AND role::TEXT = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: current user is project member
CREATE OR REPLACE FUNCTION is_project_member(p_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members WHERE project_id = p_id AND user_id = u_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: current user is member of project's workspace
CREATE OR REPLACE FUNCTION is_project_workspace_member(p_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT is_workspace_member((SELECT workspace_id FROM projects WHERE id = p_id), u_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: can manage workspace (owner, admin)
CREATE OR REPLACE FUNCTION can_manage_workspace(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT workspace_has_role(ws_id, ARRAY['owner', 'admin'], u_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: can manage project (owner, admin, producer)
CREATE OR REPLACE FUNCTION can_manage_project(p_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_id AND user_id = u_id AND role IN ('owner', 'admin', 'producer')
  ) OR workspace_has_role((SELECT workspace_id FROM projects WHERE id = p_id), ARRAY['owner', 'admin', 'producer'], u_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: document visible to user (project member + visibility or client visibility)
CREATE OR REPLACE FUNCTION can_view_document(doc_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = doc_id
    AND (
      (is_project_member(p.id, u_id) AND d.visibility IN ('team', 'client'))
      OR (d.visibility = 'client' AND EXISTS (
        SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = u_id AND pm.role = 'client'
      ))
      OR (d.visibility = 'team' AND is_project_member(p.id, u_id))
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- workspaces
CREATE POLICY workspaces_select ON workspaces FOR SELECT USING (is_workspace_member(id));
CREATE POLICY workspaces_insert ON workspaces FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY workspaces_update ON workspaces FOR UPDATE USING (can_manage_workspace(id));
CREATE POLICY workspaces_delete ON workspaces FOR DELETE USING (workspace_has_role(id, ARRAY['owner'], auth.uid()));

-- workspace_members
CREATE POLICY workspace_members_select ON workspace_members FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT WITH CHECK (can_manage_workspace(workspace_id));
CREATE POLICY workspace_members_update ON workspace_members FOR UPDATE USING (can_manage_workspace(workspace_id));
CREATE POLICY workspace_members_delete ON workspace_members FOR DELETE USING (can_manage_workspace(workspace_id));

-- invites
CREATE POLICY invites_select ON invites FOR SELECT USING (is_workspace_member(workspace_id) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY invites_insert ON invites FOR INSERT WITH CHECK (can_manage_workspace(workspace_id));
CREATE POLICY invites_update ON invites FOR UPDATE USING (can_manage_workspace(workspace_id) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY invites_delete ON invites FOR DELETE USING (can_manage_workspace(workspace_id));

-- projects
CREATE POLICY projects_select ON projects FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY projects_update ON projects FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY projects_delete ON projects FOR DELETE USING (can_manage_workspace(workspace_id));

-- project_members
CREATE POLICY project_members_select ON project_members FOR SELECT USING (is_project_workspace_member(project_id));
CREATE POLICY project_members_insert ON project_members FOR INSERT WITH CHECK (can_manage_project(project_id));
CREATE POLICY project_members_update ON project_members FOR UPDATE USING (can_manage_project(project_id));
CREATE POLICY project_members_delete ON project_members FOR DELETE USING (can_manage_project(project_id));

-- folders
CREATE POLICY folders_select ON folders FOR SELECT USING (is_project_workspace_member(project_id));
CREATE POLICY folders_insert ON folders FOR INSERT WITH CHECK (is_project_workspace_member(project_id));
CREATE POLICY folders_update ON folders FOR UPDATE USING (is_project_workspace_member(project_id));
CREATE POLICY folders_delete ON folders FOR DELETE USING (is_project_workspace_member(project_id));

-- documents
CREATE POLICY documents_select ON documents FOR SELECT USING (
  is_project_workspace_member(project_id)
  OR (visibility = 'client' AND is_project_member(project_id))
);
CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK (is_project_workspace_member(project_id));
CREATE POLICY documents_update ON documents FOR UPDATE USING (is_project_workspace_member(project_id));
CREATE POLICY documents_delete ON documents FOR DELETE USING (can_manage_project(project_id));

-- document_versions (via document access)
CREATE POLICY document_versions_select ON document_versions FOR SELECT USING (
  can_view_document(document_id)
  OR EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.current_version_id = document_versions.id)
);
CREATE POLICY document_versions_insert ON document_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND is_project_workspace_member(d.project_id))
);
CREATE POLICY document_versions_update ON document_versions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND is_project_workspace_member(d.project_id))
);
CREATE POLICY document_versions_delete ON document_versions FOR DELETE USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND can_manage_project(d.project_id))
);

-- comments
CREATE POLICY comments_select ON comments FOR SELECT USING (
  (entity_type = 'document' AND can_view_document(entity_id))
  OR (entity_type = 'version' AND EXISTS (SELECT 1 FROM document_versions dv JOIN documents d ON d.id = dv.document_id WHERE dv.id = entity_id AND (is_project_workspace_member(d.project_id) OR d.visibility = 'client')))
  OR (entity_type = 'board' AND EXISTS (SELECT 1 FROM boards b WHERE b.id = entity_id AND is_project_workspace_member(b.project_id)))
  OR (entity_type = 'card' AND EXISTS (SELECT 1 FROM board_cards bc JOIN boards b ON b.id = bc.board_id WHERE bc.id = entity_id AND is_project_workspace_member(b.project_id)))
  OR (entity_type = 'task' AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = entity_id AND is_project_workspace_member(t.project_id)))
);
CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (auth.uid() = user_id AND (
  (entity_type = 'document' AND can_view_document(entity_id))
  OR (entity_type = 'version' AND EXISTS (SELECT 1 FROM document_versions dv JOIN documents d ON d.id = dv.document_id WHERE dv.id = entity_id AND is_project_workspace_member(d.project_id)))
  OR (entity_type = 'board' AND EXISTS (SELECT 1 FROM boards b WHERE b.id = entity_id AND is_project_workspace_member(b.project_id)))
  OR (entity_type = 'card' AND EXISTS (SELECT 1 FROM board_cards bc JOIN boards b ON b.id = bc.board_id WHERE bc.id = entity_id AND is_project_workspace_member(b.project_id)))
  OR (entity_type = 'task' AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = entity_id AND is_project_workspace_member(t.project_id)))
));
CREATE POLICY comments_update ON comments FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM workspace_members wm
  JOIN documents d ON d.project_id IN (SELECT project_id FROM projects WHERE workspace_id = wm.workspace_id)
  WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'producer')
));
CREATE POLICY comments_delete ON comments FOR DELETE USING (user_id = auth.uid());

-- approvals
CREATE POLICY approvals_select ON approvals FOR SELECT USING (
  EXISTS (SELECT 1 FROM document_versions dv JOIN documents d ON d.id = dv.document_id WHERE dv.id = document_version_id AND is_project_workspace_member(d.project_id))
);
CREATE POLICY approvals_insert ON approvals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM document_versions dv JOIN documents d ON d.id = dv.document_id WHERE dv.id = document_version_id AND is_project_workspace_member(d.project_id))
);
CREATE POLICY approvals_update ON approvals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM document_versions dv JOIN documents d ON d.id = dv.document_id WHERE dv.id = document_version_id AND is_project_workspace_member(d.project_id))
);

-- boards
CREATE POLICY boards_select ON boards FOR SELECT USING (is_project_workspace_member(project_id));
CREATE POLICY boards_insert ON boards FOR INSERT WITH CHECK (is_project_workspace_member(project_id));
CREATE POLICY boards_update ON boards FOR UPDATE USING (is_project_workspace_member(project_id));
CREATE POLICY boards_delete ON boards FOR DELETE USING (is_project_workspace_member(project_id));

-- board_cards
CREATE POLICY board_cards_select ON board_cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM boards b WHERE b.id = board_id AND is_project_workspace_member(b.project_id))
);
CREATE POLICY board_cards_insert ON board_cards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM boards b WHERE b.id = board_id AND is_project_workspace_member(b.project_id))
);
CREATE POLICY board_cards_update ON board_cards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM boards b WHERE b.id = board_id AND is_project_workspace_member(b.project_id))
);
CREATE POLICY board_cards_delete ON board_cards FOR DELETE USING (
  EXISTS (SELECT 1 FROM boards b WHERE b.id = board_id AND is_project_workspace_member(b.project_id))
);

-- tasks
CREATE POLICY tasks_select ON tasks FOR SELECT USING (is_project_workspace_member(project_id));
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (is_project_workspace_member(project_id));
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (is_project_workspace_member(project_id));
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (is_project_workspace_member(project_id));

-- task_assignees
CREATE POLICY task_assignees_select ON task_assignees FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_workspace_member(t.project_id))
);
CREATE POLICY task_assignees_insert ON task_assignees FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_workspace_member(t.project_id))
);
CREATE POLICY task_assignees_delete ON task_assignees FOR DELETE USING (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_workspace_member(t.project_id))
);

-- calendar_events
CREATE POLICY calendar_events_select ON calendar_events FOR SELECT USING (is_project_workspace_member(project_id));
CREATE POLICY calendar_events_insert ON calendar_events FOR INSERT WITH CHECK (is_project_workspace_member(project_id));
CREATE POLICY calendar_events_update ON calendar_events FOR UPDATE USING (is_project_workspace_member(project_id));
CREATE POLICY calendar_events_delete ON calendar_events FOR DELETE USING (is_project_workspace_member(project_id));

-- public_links: only creator or workspace admin can manage
CREATE POLICY public_links_select ON public_links FOR SELECT USING (
  created_by = auth.uid()
  OR (entity_type = 'document' AND EXISTS (SELECT 1 FROM documents d WHERE d.id = entity_id AND is_project_workspace_member(d.project_id)))
  OR (entity_type = 'board' AND EXISTS (SELECT 1 FROM boards b WHERE b.id = entity_id AND is_project_workspace_member(b.project_id)))
);
CREATE POLICY public_links_insert ON public_links FOR INSERT WITH CHECK (
  (entity_type = 'document' AND EXISTS (SELECT 1 FROM documents d WHERE d.id = entity_id AND is_project_workspace_member(d.project_id)))
  OR (entity_type = 'board' AND EXISTS (SELECT 1 FROM boards b WHERE b.id = entity_id AND is_project_workspace_member(b.project_id)))
);
CREATE POLICY public_links_update ON public_links FOR UPDATE USING (created_by = auth.uid() OR (
  (entity_type = 'document' AND EXISTS (SELECT 1 FROM documents d WHERE d.id = entity_id AND can_manage_project(d.project_id)))
  OR (entity_type = 'board' AND EXISTS (SELECT 1 FROM boards b WHERE b.id = entity_id AND can_manage_project(b.project_id)))
));
CREATE POLICY public_links_delete ON public_links FOR DELETE USING (created_by = auth.uid() OR (
  (entity_type = 'document' AND EXISTS (SELECT 1 FROM documents d WHERE d.id = entity_id AND can_manage_project(d.project_id)))
  OR (entity_type = 'board' AND EXISTS (SELECT 1 FROM boards b WHERE b.id = entity_id AND can_manage_project(b.project_id)))
));

-- views: insert only (for tracking); select by link owner
CREATE POLICY views_select ON views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public_links pl WHERE pl.id = public_link_id AND pl.created_by = auth.uid())
);
CREATE POLICY views_insert ON views FOR INSERT WITH CHECK (true);

-- activity_log
CREATE POLICY activity_log_select ON activity_log FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY activity_log_insert ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id AND is_workspace_member(workspace_id));

-- project_tags
CREATE POLICY project_tags_select ON project_tags FOR SELECT USING (is_project_workspace_member(project_id));
CREATE POLICY project_tags_insert ON project_tags FOR INSERT WITH CHECK (is_project_workspace_member(project_id));
CREATE POLICY project_tags_delete ON project_tags FOR DELETE USING (is_project_workspace_member(project_id));

-- profiles: own profile + workspace members
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.user_id = profiles.id AND is_workspace_member(wm.workspace_id))
);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- notifications
CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (user_id = auth.uid());
