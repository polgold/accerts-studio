import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/AppShell';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string };
}) {
  const { workspaceSlug } = params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) {
    redirect(`/login?next=/w/${workspaceSlug}/projects`);
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, slug, name')
    .eq('slug', workspaceSlug)
    .single();

  if (!workspace) {
    redirect('/onboarding');
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id, role, status')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single();

  if (!member || member.status !== 'active') {
    redirect('/onboarding');
  }

  return (
    <AppShell
      workspaceSlug={workspace.slug}
      workspaceName={workspace.name}
      hasSettings={true}
    >
      {children}
    </AppShell>
  );
}
