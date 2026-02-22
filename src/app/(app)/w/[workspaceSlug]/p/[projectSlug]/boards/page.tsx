import Link from 'next/link';
import { requireProjectAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function BoardsPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { project, supabase } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  const { data: boards } = await supabase
    .from('boards')
    .select('id, title, mode, visibility, updated_at')
    .eq('project_id', project.id)
    .order('updated_at', { ascending: false });
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-neutral-900">Boards</h2>
        <Button asChild size="sm">
          <Link href={`/w/${params.workspaceSlug}/p/${params.projectSlug}/boards/new`}>Nuevo board</Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(boards ?? []).map((b: { id: string; title: string; mode: string; visibility: string }) => (
          <Link
            key={b.id}
            href={`/w/${params.workspaceSlug}/p/${params.projectSlug}/boards/${b.id}`}
            className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-soft hover:border-neutral-300 transition-colors"
          >
            <h3 className="font-medium text-neutral-900">{b.title}</h3>
            <p className="text-xs text-neutral-500 mt-1">{b.mode} · {b.visibility}</p>
          </Link>
        ))}
      </div>
      {(!boards || boards.length === 0) && (
        <div className="rounded-xl border border-dashed border-neutral-300 py-12 text-center text-neutral-500">
          No hay boards. Crea uno para empezar.
        </div>
      )}
    </div>
  );
}
