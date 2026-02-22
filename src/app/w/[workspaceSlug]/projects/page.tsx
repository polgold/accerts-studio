import Link from 'next/link';
import { requireWorkspaceMember, canManageInWorkspace } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default async function ProjectsPage({ params }: { params: { workspaceSlug: string } }) {
  const { workspaceSlug } = params;
  const { user, workspace, member, supabase } = await requireWorkspaceMember(workspaceSlug);
  const canManage = canManageInWorkspace(user?.email ?? null, member?.role ?? null);
  const { data: projects } = await supabase
    .from('projects')
    .select('id, slug, title, client_name, status, start_date, end_date')
    .eq('workspace_id', workspace.id)
    .order('updated_at', { ascending: false });
  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Proyectos</h1>
        {canManage && (
          <Button asChild>
            <Link href={`/w/${workspaceSlug}/projects/new`}>Nuevo proyecto</Link>
          </Button>
        )}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(projects ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/w/${workspaceSlug}/p/${p.slug}/overview`}
            className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-soft hover:border-neutral-300 hover:shadow-card transition-all"
          >
            <h3 className="font-medium text-neutral-900">{p.title}</h3>
            {p.client_name && <p className="text-sm text-neutral-500 mt-1">{p.client_name}</p>}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">{p.status}</span>
              {(p.start_date || p.end_date) && (
                <span className="text-xs text-neutral-400">
                  {p.start_date && formatDate(p.start_date)}
                  {p.end_date && ` – ${formatDate(p.end_date)}`}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {(!projects || projects.length === 0) && (
        <div className="mt-12 text-center py-12 rounded-xl border border-dashed border-neutral-300">
          <p className="text-neutral-500">No hay proyectos todavía.</p>
          {canManage && (
            <Button asChild className="mt-4">
              <Link href={`/w/${workspaceSlug}/projects/new`}>Crear primer proyecto</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
