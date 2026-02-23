import { requireWorkspaceMember } from '@/lib/auth';
import { SettingsTabs } from '@/components/workspace/settings-tabs';

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string };
}) {
  const { workspaceSlug } = params;
  await requireWorkspaceMember(workspaceSlug);
  const base = `/w/${workspaceSlug}/settings`;

  return (
    <div className="p-6 max-w-3xl">
      <SettingsTabs base={base} />
      {children}
    </div>
  );
}
