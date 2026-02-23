import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';
import { getValidAccessToken, graphFetch, type GraphDrivesResponse } from '@/lib/connectors/microsoft-graph';

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const connectionId = request.nextUrl.searchParams.get('connectionId');
  const siteId = request.nextUrl.searchParams.get('siteId');

  if (!workspaceId || !connectionId || !siteId) {
    return NextResponse.json({ error: 'workspaceId, connectionId y siteId requeridos' }, { status: 400 });
  }

  const res = NextResponse.json({});
  const supabase = createServerClientForRouteHandler(request, res);

  const auth = await requireWorkspaceMemberInApi(supabase, workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tokenResult = await getValidAccessToken(connectionId, supabase);
  if (tokenResult.error || !tokenResult.accessToken) {
    const code = 'code' in tokenResult ? tokenResult.code : undefined;
    return NextResponse.json(
      { error: tokenResult.error ?? 'Token no disponible', code },
      { status: code === 'REAUTH_REQUIRED' ? 401 : 502 }
    );
  }

  const result = await graphFetch<GraphDrivesResponse>(
    tokenResult.accessToken,
    `/sites/${siteId}/drives`
  );

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 }
    );
  }

  return NextResponse.json({
    drives: (result.data?.value ?? []).map((d) => ({ id: d.id, name: d.name, driveType: d.driveType })),
  });
}
