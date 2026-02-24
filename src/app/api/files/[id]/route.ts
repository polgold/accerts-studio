import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';
import { getValidAccessToken } from '@/lib/connectors/microsoft-graph';
import { getDownloadUrl, deleteDriveItem } from '@/lib/o365-storage';

/** GET: redirect to download URL (Graph temporary URL). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const res = NextResponse.json({});
  const supabase = createServerClientForRouteHandler(request, res);
  const { data: row, error } = await supabase
    .from('workspace_files')
    .select('workspace_id, connection_id, provider_item_id, provider, drive_id')
    .eq('id', id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }

  const auth = await requireWorkspaceMemberInApi(supabase, row.workspace_id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tokenResult = await getValidAccessToken(row.connection_id, supabase);
  if (tokenResult.error || !tokenResult.accessToken) {
    return NextResponse.json({ error: 'Token no disponible' }, { status: 502 });
  }

  let driveId = row.drive_id;
  if (!driveId) {
    const { getDriveId } = await import('@/lib/o365-storage');
    const mode = row.provider === 'sharepoint' ? 'sharepoint' : 'onedrive';
    const driveRes = await getDriveId(tokenResult.accessToken, mode);
    driveId = driveRes.driveId ?? null;
  }
  if (!driveId) {
    return NextResponse.json({ error: 'No se pudo obtener el drive' }, { status: 500 });
  }

  const urlResult = await getDownloadUrl(tokenResult.accessToken, driveId, row.provider_item_id);
  if (urlResult.error || !urlResult.url) {
    return NextResponse.json({ error: urlResult.error ?? 'URL no disponible' }, { status: 404 });
  }

  return NextResponse.redirect(urlResult.url);
}

/** DELETE: remove from Graph and DB. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const res = NextResponse.json({});
  const supabase = createServerClientForRouteHandler(request, res);
  const { data: row, error } = await supabase
    .from('workspace_files')
    .select('workspace_id, connection_id, provider_item_id, provider')
    .eq('id', id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }

  const auth = await requireWorkspaceMemberInApi(supabase, row.workspace_id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tokenResult = await getValidAccessToken(row.connection_id, supabase);
  if (tokenResult.error || !tokenResult.accessToken) {
    return NextResponse.json({ error: 'Token no disponible' }, { status: 502 });
  }

  let driveId = row.drive_id;
  if (!driveId) {
    const { getDriveId } = await import('@/lib/o365-storage');
    const mode = row.provider === 'sharepoint' ? 'sharepoint' : 'onedrive';
    const driveRes = await getDriveId(tokenResult.accessToken, mode);
    driveId = driveRes.driveId ?? null;
  }
  if (!driveId) {
    return NextResponse.json({ error: 'No se pudo obtener el drive' }, { status: 500 });
  }

  const delResult = await deleteDriveItem(tokenResult.accessToken, driveId, row.provider_item_id);
  if (!delResult.ok) {
    return NextResponse.json({ error: delResult.error ?? 'Error al eliminar' }, { status: delResult.status ?? 500 });
  }

  const { error: deleteDbError } = await supabase.from('workspace_files').delete().eq('id', id);
  if (deleteDbError) {
    return NextResponse.json({ error: deleteDbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
