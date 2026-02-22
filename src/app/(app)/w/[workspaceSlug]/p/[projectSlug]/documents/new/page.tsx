import { requireProjectAccess } from '@/lib/auth';
import { NewDocumentForm } from '@/components/documents/new-document-form';

export default async function NewDocumentPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { workspaceSlug, projectSlug } = params;
  const { project, supabase } = await requireProjectAccess(workspaceSlug, projectSlug);
  const { data: folders } = await supabase
    .from('folders')
    .select('id, name, parent_id, position')
    .eq('project_id', project.id)
    .order('position');
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Nuevo documento</h1>
      <p className="text-neutral-500 mt-1">Elige tipo y visibilidad.</p>
      <NewDocumentForm
        workspaceSlug={workspaceSlug}
        projectSlug={projectSlug}
        projectId={project.id}
        folders={(folders ?? []) as { id: string; name: string; parent_id: string | null; position: number }[]}
      />
    </div>
  );
}
