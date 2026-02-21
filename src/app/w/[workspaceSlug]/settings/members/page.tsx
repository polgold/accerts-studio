import { requireWorkspaceMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { InviteMemberForm } from '@/components/workspace/invite-member-form';

export default async function MembersPage({ params }: { params: { workspaceSlug: string } }) {
  const { workspaceSlug } = params;
  const { workspace, supabase } = await requireWorkspaceMember(workspaceSlug);
  const { data: members } = await supabase
    .from('workspace_members')
    .select('id, user_id, role, status')
    .eq('workspace_id', workspace.id);
  const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
  const profilesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
    (profiles ?? []).forEach((p: { id: string; display_name: string | null }) => {
      profilesMap[p.id] = p.display_name || p.id.slice(0, 8);
    });
  }
  const { data: invites } = await supabase
    .from('invites')
    .select('id, email, role, expires_at')
    .eq('workspace_id', workspace.id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Miembros del workspace</h1>
      <p className="text-neutral-500 mt-1">Invita por email y gestiona roles.</p>
      <InviteMemberForm workspaceId={workspace.id} workspaceSlug={workspaceSlug} />
      <div className="mt-8">
        <h2 className="text-sm font-medium text-neutral-700">Miembros</h2>
        <ul className="mt-2 space-y-2">
          {(members ?? []).map((m: { id: string; user_id: string; role: string; status: string }) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <span className="font-medium text-neutral-900">{profilesMap[m.user_id] ?? m.user_id.slice(0, 8)}</span>
              <span className="text-sm text-neutral-500">{m.role} · {m.status}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <h2 className="text-sm font-medium text-neutral-700">Invitaciones pendientes</h2>
        <ul className="mt-2 space-y-2">
          {(invites ?? []).map((i: { id: string; email: string; role: string; expires_at: string }) => (
            <li key={i.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <span>{i.email}</span>
              <span className="text-sm text-neutral-500">{i.role}</span>
            </li>
          ))}
        </ul>
        {(!invites || invites.length === 0) && <p className="text-neutral-500 text-sm mt-2">Sin invitaciones pendientes.</p>}
      </div>
    </div>
  );
}
