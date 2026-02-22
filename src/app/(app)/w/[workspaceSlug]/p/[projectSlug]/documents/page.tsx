import Link from 'next/link';
import { requireProjectAccess, canManageInWorkspace } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { DocumentsList } from '@/components/documents/documents-list';
import { FolderTree } from '@/components/documents/folder-tree';

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: { workspaceSlug: string; projectSlug: string };
  searchParams: { folder?: string; type?: string; q?: string };
}) {
  const { user, project, member, supabase } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  const canManage = canManageInWorkspace(user?.email ?? null, member?.role ?? null);
  const sp = searchParams;
  const { data: folders } = await supabase
    .from('folders')
    .select('id, name, parent_id, position')
    .eq('project_id', project.id)
    .order('position');
  let query = supabase
    .from('documents')
    .select('id, title, doc_type, visibility, pinned, current_version_id, folder_id, updated_at')
    .eq('project_id', project.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (sp.folder) {
    if (sp.folder === 'root') query = query.is('folder_id', null);
    else query = query.eq('folder_id', sp.folder);
  }
  if (sp.type) query = query.eq('doc_type', sp.type);
  if (sp.q) query = query.ilike('title', `%${sp.q}%`);
  const { data: documents } = await query;
  return (
    <div className="p-6 flex gap-6">
      <aside className="w-56 shrink-0">
        <FolderTree
          workspaceSlug={params.workspaceSlug}
          projectSlug={params.projectSlug}
          folders={(folders ?? []) as { id: string; name: string; parent_id: string | null; position: number }[]}
          selectedFolderId={sp.folder ?? 'root'}
        />
      </aside>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Documentos</h2>
          {canManage && (
            <Button asChild size="sm">
              <Link href={`/w/${params.workspaceSlug}/p/${params.projectSlug}/documents/new`}>Nuevo documento</Link>
            </Button>
          )}
        </div>
        <DocumentsList
          workspaceSlug={params.workspaceSlug}
          projectSlug={params.projectSlug}
          documents={(documents ?? []) as { id: string; title: string; doc_type: string; visibility: string; pinned: boolean; folder_id: string | null; updated_at: string }[]}
          filters={{ folder: sp.folder, type: sp.type, q: sp.q }}
        />
      </div>
    </div>
  );
}
