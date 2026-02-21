import { requireWorkspaceMember } from '@/lib/auth';
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string };
}) {
  const { workspace } = await requireWorkspaceMember(params.workspaceSlug);
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <WorkspaceSidebar workspaceSlug={workspace.slug} workspaceName={workspace.name} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
