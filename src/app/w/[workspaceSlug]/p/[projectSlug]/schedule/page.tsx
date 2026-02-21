import { requireProjectAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ScheduleView } from '@/components/schedule/schedule-view';

export default async function SchedulePage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { project, supabase } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, title, description, start_at, end_at, visibility')
    .eq('project_id', project.id)
    .order('start_at');
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Calendario</h2>
      <ScheduleView
        workspaceSlug={params.workspaceSlug}
        projectSlug={params.projectSlug}
        projectId={project.id}
        events={(events ?? []) as { id: string; title: string; description: string | null; start_at: string; end_at: string; visibility: string }[]}
      />
    </div>
  );
}
