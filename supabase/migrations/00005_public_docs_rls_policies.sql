-- Any authenticated user can SELECT documents with visibility = 'public'
CREATE POLICY documents_select_public ON documents FOR SELECT
  USING (visibility = 'public' AND auth.uid() IS NOT NULL);

-- Any authenticated user can SELECT document_versions for public documents
CREATE POLICY document_versions_select_public ON document_versions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id AND d.visibility = 'public'
    )
  );
