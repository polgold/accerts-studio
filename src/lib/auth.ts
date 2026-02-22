import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/** True si el usuario puede agregar/quitar/modificar según su rol en el workspace */
export function canManageInWorkspace(
  _userEmail: string | undefined | null,
  memberRole: string | undefined | null
): boolean {
  const managingRoles = ['owner', 'admin', 'producer', 'collaborator'];
  return memberRole != null && managingRoles.includes(memberRole);
}

/** No redirige: el guard de sesión vive en middleware y en layout /w/[workspaceSlug]. */
export async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data?.user ?? null;
  return { user, supabase };
}

export async function requireWorkspaceMember(workspaceSlug: string) {
  const { user, supabase } = await requireAuth();
  // Bajo /w/* el guard ya corrió en middleware y layout; no redirigir aquí.
  if (!user) throw new Error('Unauthorized');
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, slug, name')
    .eq('slug', workspaceSlug)
    .single();
  if (!workspace) redirect('/onboarding');
  const { data: member } = await supabase
    .from('workspace_members')
    .select('id, role, status')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single();
  if (!member || member.status !== 'active') redirect('/onboarding');
  return { user, supabase, workspace, member };
}

export async function requireProjectAccess(workspaceSlug: string, projectSlug: string) {
  const { user, supabase, workspace, member } = await requireWorkspaceMember(workspaceSlug);
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, title, workspace_id, status')
    .eq('workspace_id', workspace.id)
    .eq('slug', projectSlug)
    .single();
  if (!project) redirect(`/w/${workspaceSlug}/projects`);
  return { user, supabase, workspace, member, project };
}
