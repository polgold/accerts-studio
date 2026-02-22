'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { workspaceSchema, type WorkspaceSchema } from '@/lib/validations';

export async function createWorkspace(data: WorkspaceSchema): Promise<{ slug?: string; error?: string }> {
  const parsed = workspaceSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().formErrors[0] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const { data: result, error } = await supabase.rpc('create_workspace_with_owner', {
    ws_name: parsed.data.name,
    ws_slug: parsed.data.slug,
  });
  if (error) return { error: error.message };
  const err = result?.error;
  if (typeof err === 'string') return { error: err };
  revalidatePath('/');
  return { slug: parsed.data.slug };
}

export async function inviteToWorkspace(workspaceId: string, email: string, role: string, projectId: string | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const { error } = await supabase.from('invites').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    email: email.toLowerCase(),
    role: role as 'owner' | 'admin' | 'producer' | 'collaborator' | 'client' | 'vendor' | 'viewer',
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) return { error: error.message };
  return {};
}

export async function acceptInvite(token: string): Promise<{ error?: string; workspaceSlug?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('id, workspace_id, project_id, email, role')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (inviteError || !invite) return { error: 'Invite inválido o expirado' };
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) return { error: 'Este invite es para otro email' };
  const { error: memberError } = await supabase.from('workspace_members').upsert(
    { workspace_id: invite.workspace_id, user_id: user.id, role: invite.role, status: 'active' },
    { onConflict: 'workspace_id,user_id' }
  );
  if (memberError) return { error: memberError.message };
  if (invite.project_id) {
    await supabase.from('project_members').upsert(
      { project_id: invite.project_id, user_id: user.id, role: invite.role },
      { onConflict: 'project_id,user_id' }
    );
  }
  await supabase.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);
  const { data: ws } = await supabase.from('workspaces').select('slug').eq('id', invite.workspace_id).single();
  revalidatePath('/');
  return { workspaceSlug: ws?.slug };
}
