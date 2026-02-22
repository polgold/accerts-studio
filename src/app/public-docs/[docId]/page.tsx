import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DocumentPreview } from '@/components/documents/document-preview';
import { CommentPanel } from '@/components/documents/comment-panel';
import { formatDateTime } from '@/lib/utils';

export default async function PublicDocumentPage({ params }: { params: { docId: string } }) {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, doc_type, visibility, current_version_id, project_id, projects(slug, workspaces(slug))')
    .eq('id', params.docId)
    .single();
  if (!doc || doc.visibility !== 'public') notFound();
  const raw = (doc as { projects?: unknown }).projects;
  const project = Array.isArray(raw) ? raw[0] : raw;
  const workspaceSlug = (project as { workspaces?: { slug?: string } | null })?.workspaces?.slug ?? '';
  const projectSlug = (project as { slug?: string })?.slug ?? '';
  const { data: versions } = await supabase
    .from('document_versions')
    .select('id, version_number, storage_path, external_url, poster_path, content_json, created_at')
    .eq('document_id', doc.id)
    .order('version_number', { ascending: false });
  const currentVersion = (versions ?? []).find((v: { id: string }) => v.id === doc.current_version_id) ?? (versions ?? [])[0];
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
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/public-docs" className="text-sm text-neutral-500 hover:text-neutral-900">← Documentos públicos</Link>
        <h1 className="text-xl font-semibold text-neutral-900 mt-1">{doc.title}</h1>
        <p className="text-xs text-neutral-500">{doc.doc_type} · público</p>
        {currentVersion && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-soft">
            <DocumentPreview
              docType={doc.doc_type}
              version={currentVersion as { id: string; version_number: number; storage_path: string | null; external_url: string | null; poster_path: string | null; content_json: Record<string, unknown> | null; created_at: string }}
              workspaceSlug={workspaceSlug}
            />
          </div>
        )}
        <div className="mt-6">
          <CommentPanel
            entityType="document"
            entityId={doc.id}
            comments={(comments ?? []) as { id: string; content: string; user_id: string; parent_id: string | null; status: string; created_at: string }[]}
            profilesMap={profilesMap}
          />
        </div>
      </div>
    </div>
  );
}
