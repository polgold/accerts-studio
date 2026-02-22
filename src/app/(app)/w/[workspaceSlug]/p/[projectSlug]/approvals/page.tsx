import Link from 'next/link';
import { requireProjectAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';

export default async function ApprovalsPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { workspace, project, supabase } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  const workspaceSlug = workspace.slug;
  const projectSlug = project.slug;
  const { data: approvals } = await supabase
    .from('approvals')
    .select('id, document_version_id, status, decided_by, decided_at, note')
    .order('created_at', { ascending: false });
  const versionIds = (approvals ?? []).map((a: { document_version_id: string }) => a.document_version_id);
  const { data: versions } = versionIds.length
    ? await supabase.from('document_versions').select('id, document_id').in('id', versionIds)
    : { data: [] };
  const docIds = Array.from(new Set((versions ?? []).map((v: { document_id: string }) => v.document_id)));
  const { data: docs } = docIds.length ? await supabase.from('documents').select('id, title').in('id', docIds) : { data: [] };
  const docsMap: Record<string, string> = {};
  (docs ?? []).forEach((d: { id: string; title: string }) => { docsMap[d.id] = d.title; });
  const versionToDoc: Record<string, string> = {};
  (versions ?? []).forEach((v: { id: string; document_id: string }) => { versionToDoc[v.id] = v.document_id; });
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Aprobaciones</h2>
      <ul className="space-y-3">
        {(approvals ?? []).map((a: { id: string; document_version_id: string; status: string; decided_at: string | null }) => {
          const docId = versionToDoc[a.document_version_id];
          const title = docId ? docsMap[docId] : 'Documento';
          return (
            <li key={a.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
              <div>
                <span className="font-medium text-neutral-900">{title}</span>
                <p className="text-sm text-neutral-500 mt-0.5">Estado: {a.status}</p>
                {a.decided_at && <p className="text-xs text-neutral-400">{formatDateTime(a.decided_at)}</p>}
              </div>
              {docId && (
                <Link
                  href={`/w/${workspaceSlug}/p/${projectSlug}/documents/${docId}`}
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Ver documento
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {(!approvals || approvals.length === 0) && (
        <p className="text-neutral-500">No hay solicitudes de aprobación.</p>
      )}
    </div>
  );
}
