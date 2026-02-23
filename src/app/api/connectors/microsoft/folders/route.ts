import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';
import { getValidAccessToken, graphFetch, type GraphChildrenResponse } from '@/lib/connectors/microsoft-graph';

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const connectionId = request.nextUrl.searchParams.get('connectionId');
  const driveId = request.nextUrl.searchParams.get('driveId');
  const parentId = request.nextUrl.searchParams.get('parentId');

  if (!workspaceId || !connectionId || !driveId) {
    return NextResponse.json({ error: 'workspaceId, connectionId y driveId requeridos' }, { status: 400 });
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

  const path = parentId
    ? `/drives/${driveId}/items/${parentId}/children`
    : `/drives/${driveId}/root/children`;

  const result = await graphFetch<GraphChildrenResponse>(
    tokenResult.accessToken,
    path
  );

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 }
    );
  }

  const folders = (result.data?.value ?? []).filter((i) => i.folder != null);

  return NextResponse.json({
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      childCount: f.folder?.childCount ?? 0,
    })),
  });
}
