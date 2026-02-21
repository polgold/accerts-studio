import { requireProjectAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DocumentView } from '@/components/documents/document-view';

export default async function DocumentDetailPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string; docId: string };
}) {
  const { workspaceSlug, projectSlug, docId } = params;
  const { project, supabase } = await requireProjectAccess(workspaceSlug, projectSlug);
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, doc_type, visibility, current_version_id')
    .eq('project_id', project.id)
    .eq('id', docId)
    .single();
  if (!doc) notFound();
  const { data: versions } = await supabase
    .from('document_versions')
    .select('id, version_number, storage_path, external_url, poster_path, content_json, created_at')
    .eq('document_id', doc.id)
    .order('version_number', { ascending: false });
  const currentVersion = (versions ?? []).find((v: { id: string }) => v.id === doc.current_version_id) ?? (versions ?? [])[0];
  const versionIds = (versions ?? []).map((v: { id: string }) => v.id);
  const { data: approvals } = versionIds.length
    ? await supabase.from('approvals').select('id, document_version_id, status, requested_by, decided_by, decided_at, note').in('document_version_id', versionIds)
    : { data: [] };
  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, user_id, parent_id, status, created_at')
    .eq('entity_type', 'document')
    .eq('entity_id', doc.id)
    .order('created_at', { ascending: true });
  const profileIds = Array.from(new Set((comments ?? []).map((c: { user_id: string }) => c.user_id)));
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', profileIds)
    : { data: [] };
  const profilesMap: Record<string, string> = {};
  (profiles ?? []).forEach((p: { id: string; display_name: string | null }) => {
    profilesMap[p.id] = p.display_name || p.id.slice(0, 8);
  });
  return (
    <div className="p-6 flex gap-6">
      <div className="flex-1 min-w-0">
        <DocumentView
          workspaceSlug={workspaceSlug}
          projectSlug={projectSlug}
          document={doc as { id: string; title: string; doc_type: string; visibility: string; current_version_id: string | null }}
          versions={(versions ?? []) as { id: string; version_number: number; storage_path: string | null; external_url: string | null; poster_path: string | null; content_json: Record<string, unknown> | null; created_at: string }[]}
          currentVersion={currentVersion as { id: string; version_number: number; storage_path: string | null; external_url: string | null; poster_path: string | null; content_json: Record<string, unknown> | null; created_at: string } | undefined}
          approvals={(approvals ?? []) as { id: string; document_version_id: string; status: string; requested_by: string; decided_by: string | null; decided_at: string | null; note: string | null }[]}
          comments={(comments ?? []) as { id: string; content: string; user_id: string; parent_id: string | null; status: string; created_at: string }[]}
          profilesMap={profilesMap}
        />
      </div>
    </div>
  );
}
