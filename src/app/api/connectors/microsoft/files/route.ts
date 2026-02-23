import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';
import { getValidAccessToken, graphFetch, type GraphChildrenResponse } from '@/lib/connectors/microsoft-graph';

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const connectionId = request.nextUrl.searchParams.get('connectionId');
  const driveId = request.nextUrl.searchParams.get('driveId');
  const folderId = request.nextUrl.searchParams.get('folderId');

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

  const path = folderId
    ? `/drives/${driveId}/items/${folderId}/children`
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

  const files = (result.data?.value ?? []).filter((i) => i.file != null);

  return NextResponse.json({
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size ?? 0,
      mimeType: f.file?.mimeType ?? null,
    })),
  });
}
