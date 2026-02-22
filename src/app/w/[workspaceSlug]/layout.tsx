import { requireWorkspaceMember, canManageInWorkspace } from '@/lib/auth';
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string };
}) {
  const { user, workspace, member } = await requireWorkspaceMember(params.workspaceSlug);
  const canManage = canManageInWorkspace(user?.email ?? null, member?.role ?? null);
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <WorkspaceSidebar workspaceSlug={workspace.slug} workspaceName={workspace.name} canManage={canManage} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
