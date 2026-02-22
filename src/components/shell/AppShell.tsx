import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({
  workspaceSlug,
  workspaceName,
  hasSettings = true,
  children,
}: {
  workspaceSlug: string;
  workspaceName: string;
  hasSettings?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspaceName}
        hasSettings={hasSettings}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
