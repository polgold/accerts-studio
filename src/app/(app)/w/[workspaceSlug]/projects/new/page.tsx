import { requireWorkspaceMember } from '@/lib/auth';
import { NewProjectForm } from '@/components/project/new-project-form';

export default async function NewProjectPage({ params }: { params: { workspaceSlug: string } }) {
  const { workspaceSlug } = params;
  await requireWorkspaceMember(workspaceSlug);
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Nuevo proyecto</h1>
      <p className="text-neutral-500 mt-1">Completa los datos del proyecto.</p>
      <NewProjectForm workspaceSlug={workspaceSlug} />
    </div>
  );
}
