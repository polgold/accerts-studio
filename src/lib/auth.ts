import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/** Email del admin desde env (Vercel: Settings → Environment Variables → ADMIN_EMAIL) */
export function getAdminEmail(): string | null {
  const email = process.env.ADMIN_EMAIL;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
}

/** True si el email corresponde al admin configurado */
export function isAdminEmail(email: string | undefined | null): boolean {
  const admin = getAdminEmail();
  if (!admin || !email) return false;
  return email.trim().toLowerCase() === admin;
}

/** Emails con acceso especial (ver proyectos, leer confidenciales, comentar). Desde env SPECIAL_ACCESS_EMAILS (separados por coma). */
export function getSpecialAccessEmails(): string[] {
  const raw = process.env.SPECIAL_ACCESS_EMAILS;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/** True si el email tiene acceso especial (lectura confidencial + comentar) */
export function isSpecialAccessUser(email: string | undefined | null): boolean {
  if (!email) return false;
  return getSpecialAccessEmails().includes(email.trim().toLowerCase());
}

/** True si el usuario puede agregar/quitar/modificar (admin o rol de gestión en el workspace) */
export function canManageInWorkspace(
  userEmail: string | undefined | null,
  memberRole: string | undefined | null
): boolean {
  if (isAdminEmail(userEmail)) return true;
  const managingRoles = ['owner', 'admin', 'producer', 'collaborator'];
  return memberRole != null && managingRoles.includes(memberRole);
}

export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return { user, supabase };
}

export async function requireWorkspaceMember(workspaceSlug: string) {
  const { user, supabase } = await requireAuth();
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
