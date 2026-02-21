import { requireWorkspaceMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SearchForm } from '@/components/search/search-form';

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { workspaceSlug: string };
  searchParams: { q?: string; type?: string; status?: string };
}) {
  const { workspace, supabase } = await requireWorkspaceMember(params.workspaceSlug);
  const sp = searchParams;
  const q = sp.q?.trim() || '';
  const type = sp.type || '';
  const status = sp.status || '';

  let projects: { id: string; slug: string; title: string; status: string }[] = [];
  let documents: { id: string; title: string; doc_type: string; project_id: string; projects?: { slug: string } }[] = [];
  let boards: { id: string; title: string; project_id: string; projects?: { slug: string } }[] = [];
  let tasks: { id: string; title: string; status: string; project_id: string; projects?: { slug: string } }[] = [];

  if (q) {
    const ilike = `%${q}%`;
    if (!type || type === 'project') {
      const { data } = await supabase
        .from('projects')
        .select('id, slug, title, status')
        .eq('workspace_id', workspace.id)
        .or(`title.ilike.${ilike},client_name.ilike.${ilike}`);
      projects = (data ?? []) as typeof projects;
      if (status) projects = projects.filter((p) => p.status === status);
    }
    if (!type || type === 'document') {
      const { data } = await supabase
        .from('documents')
        .select('id, title, doc_type, project_id, projects(slug)')
        .eq('project_id', supabase.from('projects').select('id').eq('workspace_id', workspace.id) as unknown as string)
        .ilike('title', ilike);
      const { data: docs } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspace.id);
      const projectIds = (docs ?? []).map((d: { id: string }) => d.id);
      if (projectIds.length) {
        const { data: docList } = await supabase
          .from('documents')
          .select('id, title, doc_type, project_id, projects(slug)')
          .in('project_id', projectIds)
          .ilike('title', ilike);
        documents = (docList ?? []) as unknown as { id: string; title: string; doc_type: string; project_id: string; projects?: { slug: string } }[];
      }
    }
    if (!type || type === 'board') {
      const { data: proj } = await supabase.from('projects').select('id').eq('workspace_id', workspace.id);
      const pids = (proj ?? []).map((x: { id: string }) => x.id);
      if (pids.length) {
        const { data: b } = await supabase.from('boards').select('id, title, project_id, projects(slug)').in('project_id', pids).ilike('title', ilike);
        boards = (b ?? []) as unknown as { id: string; title: string; project_id: string; projects?: { slug: string } }[];
      }
    }
    if (!type || type === 'task') {
      const { data: proj } = await supabase.from('projects').select('id').eq('workspace_id', workspace.id);
      const pids = (proj ?? []).map((x: { id: string }) => x.id);
      if (pids.length) {
        const { data: t } = await supabase.from('tasks').select('id, title, status, project_id, projects(slug)').in('project_id', pids).ilike('title', ilike);
        tasks = (t ?? []) as unknown as { id: string; title: string; status: string; project_id: string; projects?: { slug: string } }[];
        if (status) tasks = tasks.filter((x) => x.status === status);
      }
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Buscar</h1>
      <SearchForm workspaceSlug={params.workspaceSlug} initialQ={q} initialType={type} initialStatus={status} />
      {q && (
        <div className="mt-6 space-y-6">
          {(!type || type === 'project') && (
            <section>
              <h2 className="text-sm font-medium text-neutral-500">Proyectos</h2>
              <ul className="mt-2 space-y-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <a href={`/w/${params.workspaceSlug}/p/${p.slug}/overview`} className="text-neutral-900 font-medium hover:underline">
                      {p.title}
                    </a>
                    <span className="text-neutral-400 text-sm ml-2">{p.status}</span>
                  </li>
                ))}
              </ul>
              {projects.length === 0 && <p className="text-neutral-500 text-sm">Ningún proyecto</p>}
            </section>
          )}
          {(!type || type === 'document') && (
            <section>
              <h2 className="text-sm font-medium text-neutral-500">Documentos</h2>
              <ul className="mt-2 space-y-2">
                {documents.map((d) => (
                  <li key={d.id}>
                    <a href={`/w/${params.workspaceSlug}/p/${(d.projects as { slug: string })?.slug}/documents/${d.id}`} className="text-neutral-900 font-medium hover:underline">
                      {d.title}
                    </a>
                    <span className="text-neutral-400 text-sm ml-2">{d.doc_type}</span>
                  </li>
                ))}
              </ul>
              {documents.length === 0 && <p className="text-neutral-500 text-sm">Ningún documento</p>}
            </section>
          )}
          {(!type || type === 'board') && (
            <section>
              <h2 className="text-sm font-medium text-neutral-500">Boards</h2>
              <ul className="mt-2 space-y-2">
                {boards.map((b) => (
                  <li key={b.id}>
                    <a href={`/w/${params.workspaceSlug}/p/${(b.projects as { slug: string })?.slug}/boards/${b.id}`} className="text-neutral-900 font-medium hover:underline">
                      {b.title}
                    </a>
                  </li>
                ))}
              </ul>
              {boards.length === 0 && <p className="text-neutral-500 text-sm">Ningún board</p>}
            </section>
          )}
          {(!type || type === 'task') && (
            <section>
              <h2 className="text-sm font-medium text-neutral-500">Tareas</h2>
              <ul className="mt-2 space-y-2">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <span className="text-neutral-900 font-medium">{t.title}</span>
                    <span className="text-neutral-400 text-sm ml-2">{t.status}</span>
                  </li>
                ))}
              </ul>
              {tasks.length === 0 && <p className="text-neutral-500 text-sm">Ninguna tarea</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
