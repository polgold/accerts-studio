import type { SupabaseClient } from '@supabase/supabase-js';

export interface WorkspaceAuthResult {
  userId: string;
  workspaceId: string;
  workspaceSlug: string;
}

/**
 * Verifica que el usuario esté autenticado y sea miembro activo del workspace.
 * Para usar en route handlers: pasar el cliente Supabase que escribe cookies (request/response).
 */
export async function requireWorkspaceMemberInApi(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ ok: true; data: WorkspaceAuthResult } | { ok: false; error: string; status: number }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: 'No autenticado', status: 401 };
  }

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, slug')
    .eq('id', workspaceId)
    .single();

  if (wsError || !workspace) {
    return { ok: false, error: 'Workspace no encontrado', status: 404 };
  }

  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (memberError || !member) {
    return { ok: false, error: 'No tienes acceso a este workspace', status: 403 };
  }

  return {
    ok: true,
    data: {
      userId: user.id,
      workspaceId: workspace.id as string,
      workspaceSlug: workspace.slug as string,
    },
  };
}

/**
 * Verifica que el usuario sea miembro del workspace y que el project pertenezca al workspace
 * y que el usuario tenga acceso (es miembro del workspace).
 */
export async function requireProjectInWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  projectId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const memberCheck = await requireWorkspaceMemberInApi(supabase, workspaceId);
  if (!memberCheck.ok) return memberCheck;

  const { data: project, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !project) {
    return { ok: false, error: 'Proyecto no encontrado', status: 404 };
  }
  return { ok: true };
}
