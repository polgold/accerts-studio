import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId requerido' }, { status: 400 });
  }

  const res = NextResponse.json({ connections: [] });
  const supabase = createServerClientForRouteHandler(request, res);

  const auth = await requireWorkspaceMemberInApi(supabase, workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: connections, error } = await supabase
    .from('workspace_connectors')
    .select('id, provider, provider_connection_name, token_expires_at, created_at, created_by')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'microsoft')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    connections: (connections ?? []).map((c) => ({
      id: c.id,
      provider: c.provider,
      displayName: c.provider_connection_name ?? 'Cuenta Microsoft',
      expiresAt: c.token_expires_at,
      createdAt: c.created_at,
    })),
  });
}
