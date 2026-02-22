import { requireProjectAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export default async function ProjectOverviewPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { project, supabase } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  const { data: fullProject } = await supabase
    .from('projects')
    .select('*')
    .eq('id', project.id)
    .single();
  const { data: tags } = await supabase
    .from('project_tags')
    .select('tag')
    .eq('project_id', project.id);
  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-xl font-semibold text-neutral-900">Resumen</h2>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
        {fullProject?.logline && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-500">Logline</h3>
            <p className="mt-1 text-neutral-900">{fullProject.logline}</p>
          </div>
        )}
        {fullProject?.description && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-500">Descripción</h3>
            <p className="mt-1 text-neutral-900 whitespace-pre-wrap">{fullProject.description}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {fullProject?.client_name && (
            <div>
              <span className="text-neutral-500">Cliente</span>
              <p className="font-medium text-neutral-900">{fullProject.client_name}</p>
            </div>
          )}
          {fullProject?.start_date && (
            <div>
              <span className="text-neutral-500">Inicio</span>
              <p className="font-medium text-neutral-900">{formatDate(fullProject.start_date)}</p>
            </div>
          )}
          {fullProject?.end_date && (
            <div>
              <span className="text-neutral-500">Fin</span>
              <p className="font-medium text-neutral-900">{formatDate(fullProject.end_date)}</p>
            </div>
          )}
        </div>
        {tags && tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(tags as { tag: string }[]).map(({ tag }) => (
              <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
