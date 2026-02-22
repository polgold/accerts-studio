import Link from 'next/link';
import { requireWorkspaceMember, isWorkspaceAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default async function DashboardPage({ params }: { params: { workspaceSlug: string } }) {
  const { workspaceSlug } = params;
  const { user, workspace, member, supabase } = await requireWorkspaceMember(workspaceSlug);
  const canManage = isWorkspaceAdmin(member?.role ?? null);
  const { data: projects } = await supabase
    .from('projects')
    .select('id, slug, title, status, start_date, end_date')
    .eq('workspace_id', workspace.id)
    .order('updated_at', { ascending: false })
    .limit(6);
  const { data: activity } = await supabase
    .from('activity_log')
    .select('id, action, entity_type, created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(10);
  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <p className="text-neutral-500 mt-1">Workspace: {workspace.name}</p>
      <div className="mt-8 flex justify-between items-center">
        <h2 className="text-lg font-medium text-neutral-900">Proyectos recientes</h2>
        {canManage && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/w/${workspaceSlug}/projects/new`}>Nuevo proyecto</Link>
          </Button>
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {(projects ?? []).map((p) => (
          <li key={p.id}>
            <Link
              href={`/w/${workspaceSlug}/p/${p.slug}/overview`}
              className="block rounded-lg border border-neutral-200 bg-white p-4 shadow-soft hover:border-neutral-300 transition-colors"
            >
              <span className="font-medium text-neutral-900">{p.title}</span>
              <span className="ml-2 text-xs text-neutral-500">{p.status}</span>
              {(p.start_date || p.end_date) && (
                <span className="block text-xs text-neutral-500 mt-1">
                  {p.start_date && formatDate(p.start_date)}
                  {p.end_date && ` – ${formatDate(p.end_date)}`}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {(!projects || projects.length === 0) && (
        <p className="text-neutral-500 mt-4">Aún no hay proyectos. Crea uno desde Proyectos.</p>
      )}
      <h2 className="text-lg font-medium text-neutral-900 mt-8">Actividad reciente</h2>
      <ul className="mt-4 space-y-2">
        {(activity ?? []).map((a) => (
          <li key={a.id} className="text-sm text-neutral-600">
            <span className="font-medium">{a.action}</span>
            {a.entity_type && <span> · {a.entity_type}</span>}
            <span className="text-neutral-400 ml-1">{formatDate(a.created_at)}</span>
          </li>
        ))}
      </ul>
      {(!activity || activity.length === 0) && <p className="text-neutral-500 mt-4">Sin actividad aún.</p>}
    </div>
  );
}
