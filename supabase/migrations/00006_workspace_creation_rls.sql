-- Allow workspace creator to add themselves as owner (fixes onboarding when no members exist yet)
CREATE POLICY workspace_members_insert_creator ON workspace_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (SELECT created_by FROM workspaces WHERE id = workspace_id) = auth.uid()
);

-- RPC so workspace creation works even if session is not forwarded in Server Actions
CREATE OR REPLACE FUNCTION create_workspace_with_owner(ws_name TEXT, ws_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id UUID;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not authenticated');
  END IF;
  INSERT INTO workspaces (name, slug, created_by) VALUES (ws_name, ws_slug, uid)
  RETURNING id INTO ws_id;
  INSERT INTO workspace_members (workspace_id, user_id, role, status)
  VALUES (ws_id, uid, 'owner', 'active');
  RETURN jsonb_build_object('id', ws_id, 'slug', ws_slug);
END;
$$;
