import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';

/** Save O365 file metadata to DB after upload (chunked or small). */
export async function POST(request: NextRequest) {
  let body: {
    workspaceId: string;
    connectionId: string;
    driveId: string;
    itemId: string;
    name: string;
    size: number;
    mimeType?: string | null;
    path: string;
    webUrl?: string | null;
    projectId?: string | null;
    documentId?: string | null;
    documentVersionId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { workspaceId, connectionId, driveId, itemId, name, size, path, webUrl, projectId, documentId, documentVersionId } = body;
  const mimeType = body.mimeType ?? null;
  if (!workspaceId || !connectionId || !itemId || !name) {
    return NextResponse.json({ error: 'workspaceId, connectionId, itemId y name requeridos' }, { status: 400 });
  }

  const res = NextResponse.json({});
  const supabase = createServerClientForRouteHandler(request, res);
  const auth = await requireWorkspaceMemberInApi(supabase, workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: file, error } = await supabase
    .from('workspace_files')
    .insert({
      workspace_id: workspaceId,
      connection_id: connectionId,
      owner_user_id: user.id,
      name,
      size: Number(size) || 0,
      mime_type: mimeType,
      provider: 'onedrive',
      provider_item_id: itemId,
      drive_id: driveId || null,
      path,
      web_url: webUrl ?? null,
      project_id: projectId ?? null,
      document_id: documentId ?? null,
      document_version_id: documentVersionId ?? null,
    })
    .select('id, name, size, web_url, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ file });
}
