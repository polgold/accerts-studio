import { requireProjectAccess } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';

export default async function ActivityPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { project, supabase } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  const { data: activity } = await supabase
    .from('activity_log')
    .select('id, action, entity_type, entity_id, metadata, user_id, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Actividad del proyecto</h2>
      <ul className="space-y-2">
        {(activity ?? []).map((a: { id: string; action: string; entity_type: string | null; metadata: Record<string, unknown> | null; created_at: string }) => (
          <li key={a.id} className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm">
            <span className="font-medium text-neutral-900">{a.action}</span>
            {a.entity_type && <span className="text-neutral-500">{a.entity_type}</span>}
            {a.metadata && typeof a.metadata === 'object' && (a.metadata as { title?: string }).title && (
              <span className="text-neutral-600">{(a.metadata as { title: string }).title}</span>
            )}
            <span className="text-neutral-400 ml-auto">{formatDateTime(a.created_at)}</span>
          </li>
        ))}
      </ul>
      {(!activity || activity.length === 0) && <p className="text-neutral-500">Sin actividad aún.</p>}
    </div>
  );
}
