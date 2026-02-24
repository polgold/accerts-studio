import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';

/** List workspace files from DB (O365 metadata). */
export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const projectId = request.nextUrl.searchParams.get('projectId') ?? null;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId requerido' }, { status: 400 });
  }

  const res = NextResponse.json({});
  const supabase = createServerClientForRouteHandler(request, res);
  const auth = await requireWorkspaceMemberInApi(supabase, workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let query = supabase
    .from('workspace_files')
    .select('id, name, size, mime_type, provider_item_id, drive_id, path, web_url, created_at, project_id, document_id, document_version_id')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data: files, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: files ?? [] });
}
