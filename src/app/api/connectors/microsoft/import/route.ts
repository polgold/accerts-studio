import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireProjectInWorkspace } from '@/lib/connectors/workspace-auth';
import { getValidAccessToken, graphFetchBinary, graphFetch } from '@/lib/connectors/microsoft-graph';

const BUCKET = 'documents';

const MIME_TO_DOC_TYPE: Record<string, 'pdf' | 'image' | 'video_link' | 'text' | 'screenplay' | 'call_sheet' | 'shot_list' | 'storyboard' | 'moodboard' | 'other'> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video_link',
  'video/webm': 'video_link',
  'text/plain': 'text',
  'text/html': 'text',
  'application/msword': 'other',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'other',
};

function inferDocType(mimeType: string | null, fileName: string): 'pdf' | 'image' | 'video_link' | 'text' | 'screenplay' | 'call_sheet' | 'shot_list' | 'storyboard' | 'moodboard' | 'other' {
  if (mimeType && MIME_TO_DOC_TYPE[mimeType]) return MIME_TO_DOC_TYPE[mimeType];
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext ?? '')) return 'image';
  if (['mp4', 'webm'].includes(ext ?? '')) return 'video_link';
  if (['txt', 'md'].includes(ext ?? '')) return 'text';
  return 'other';
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

export async function POST(request: NextRequest) {
  let body: { workspaceId: string; connectionId: string; projectId: string; driveId: string; fileId: string; folderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { workspaceId, connectionId, projectId, driveId, fileId } = body;
  if (!workspaceId || !connectionId || !projectId || !driveId || !fileId) {
    return NextResponse.json({ error: 'workspaceId, connectionId, projectId, driveId y fileId requeridos' }, { status: 400 });
  }

  const res = NextResponse.json({});
  const supabase = createServerClientForRouteHandler(request, res);

  const projectCheck = await requireProjectInWorkspace(supabase, workspaceId, projectId);
  if (!projectCheck.ok) {
    return NextResponse.json({ error: projectCheck.error }, { status: projectCheck.status });
  }

  const tokenResult = await getValidAccessToken(connectionId, supabase);
  if (tokenResult.error || !tokenResult.accessToken) {
    const code = 'code' in tokenResult ? tokenResult.code : undefined;
    return NextResponse.json(
      { error: tokenResult.error ?? 'Token no disponible', code },
      { status: code === 'REAUTH_REQUIRED' ? 401 : 502 }
    );
  }

  const metaResult = await graphFetch<{ name: string; file?: { mimeType?: string } }>(
    tokenResult.accessToken,
    `/drives/${driveId}/items/${fileId}`
  );
  if (metaResult.error || !metaResult.data) {
    return NextResponse.json({ error: metaResult.error ?? 'No se pudo obtener el archivo' }, { status: metaResult.status ?? 500 });
  }

  const fileName = metaResult.data.name ?? 'document';
  const mimeType = metaResult.data.file?.mimeType ?? null;

  const contentResult = await graphFetchBinary(
    tokenResult.accessToken,
    `/drives/${driveId}/items/${fileId}/content`
  );
  if (contentResult.error || !contentResult.data) {
    return NextResponse.json({ error: contentResult.error ?? 'No se pudo descargar el archivo' }, { status: contentResult.status ?? 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const docType = inferDocType(mimeType, fileName);

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      folder_id: null,
      title: fileName,
      doc_type: docType,
      visibility: 'team',
      created_by: user.id,
      pinned: false,
    })
    .select('id')
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: docError?.message ?? 'Error al crear documento' }, { status: 500 });
  }

  const storagePath = `${projectId}/${doc.id}/${safeFileName(fileName)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, contentResult.data, {
      contentType: mimeType ?? 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    await supabase.from('documents').delete().eq('id', doc.id);
    return NextResponse.json({ error: 'Error al subir archivo: ' + uploadError.message }, { status: 500 });
  }

  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: doc.id,
      version_number: 1,
      storage_path: storagePath,
      external_url: null,
      poster_path: null,
      content_json: null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (versionError || !version) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    await supabase.from('documents').delete().eq('id', doc.id);
    return NextResponse.json({ error: 'Error al crear versión' }, { status: 500 });
  }

  await supabase.from('documents').update({ current_version_id: version.id }).eq('id', doc.id);

  const { data: conn } = await supabase.from('workspace_connectors').select('id').eq('id', connectionId).single();
  if (conn) {
    await supabase.from('connector_audit_log').insert({
      workspace_id: workspaceId,
      connector_id: conn.id,
      user_id: user.id,
      action: 'import',
      metadata: { projectId, documentId: doc.id, fileName },
    });
  }

  return NextResponse.json({ documentId: doc.id, title: fileName });
}
