import { requireWorkspaceMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ConnectorsClient } from '@/components/workspace/connectors-client';

export default async function ConnectorsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }> | { workspaceSlug: string };
}) {
  const { workspaceSlug } = await Promise.resolve(params);
  const { workspace, supabase } = await requireWorkspaceMember(workspaceSlug);
  const { data: projects } = await supabase
    .from('projects')
    .select('id, slug, title')
    .eq('workspace_id', workspace.id)
    .order('title');

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Conectores</h1>
      <p className="text-[var(--muted)] mt-1">
        Conectá tus cuentas para importar archivos.
      </p>
      <ConnectorsClient
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        projects={projects ?? []}
      />
    </div>
  );
}
