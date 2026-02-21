import { requireProjectAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TasksBoard } from '@/components/tasks/tasks-board';

export default async function TasksPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { workspace, project, supabase } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  const workspaceSlug = workspace.slug;
  const projectSlug = project.slug;
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, status, due_date, task_assignees(user_id)')
    .eq('project_id', project.id)
    .order('due_date', { ascending: true });
  const statuses = ['todo', 'doing', 'blocked', 'done'];
  return (
    <div className="p-6">
      <TasksBoard
        workspaceSlug={workspaceSlug}
        projectSlug={projectSlug}
        projectId={project.id}
        initialTasks={(tasks ?? []) as { id: string; title: string; description: string | null; status: string; due_date: string | null; task_assignees: { user_id: string }[] }[]}
        statuses={statuses}
      />
    </div>
  );
}
