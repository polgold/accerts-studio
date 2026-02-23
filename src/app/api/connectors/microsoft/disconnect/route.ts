import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';

export async function DELETE(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const connectionId = request.nextUrl.searchParams.get('connectionId');

  if (!workspaceId || !connectionId) {
    return NextResponse.json({ error: 'workspaceId y connectionId requeridos' }, { status: 400 });
  }

  const res = NextResponse.json({});
  const supabase = createServerClientForRouteHandler(request, res);

  const auth = await requireWorkspaceMemberInApi(supabase, workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: conn, error: fetchError } = await supabase
    .from('workspace_connectors')
    .select('id, workspace_id')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .single();

  if (fetchError || !conn) {
    return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 });
  }

  await supabase.from('connector_audit_log').insert({
    workspace_id: workspaceId,
    connector_id: connectionId,
    user_id: auth.data.userId,
    action: 'disconnected',
    metadata: {},
  });

  const { error: deleteError } = await supabase
    .from('workspace_connectors')
    .delete()
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
