import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';
import {
  getO365StorageConfig,
  getValidAccessToken,
  createUploadSession,
  uploadSmall,
  getDriveId,
  getDefaultConnection,
} from '@/lib/o365-storage';

const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024; // 4 MB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }
  const workspaceId = body.workspaceId as string;
  const connectionId = body.connectionId as string | undefined;
  const fileName = body.fileName as string;
  const fileSize = Number(body.fileSize) || 0;
  const projectId = (body.projectId as string) ?? null;
  const documentId = (body.documentId as string) ?? null;
  const documentVersionId = (body.documentVersionId as string) ?? null;

  if (!workspaceId || !fileName) {
    return NextResponse.json({ error: 'workspaceId y fileName requeridos' }, { status: 400 });
  }

  const res = NextResponse.json({});
  const supabase = createServerClientForRouteHandler(request, res);
  const auth = await requireWorkspaceMemberInApi(supabase, workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const connId = connectionId || (await (async () => {
    const def = await getDefaultConnection(supabase, workspaceId);
    return def.connectionId ?? null;
  })());
  if (!connId) {
    return NextResponse.json({ error: 'Conecta una cuenta Microsoft en Ajustes > Conectores' }, { status: 400 });
  }

  const tokenResult = await getValidAccessToken(connId, supabase);
  if (tokenResult.error || !tokenResult.accessToken) {
    const code = 'code' in tokenResult ? tokenResult.code : undefined;
    return NextResponse.json(
      { error: tokenResult.error ?? 'Token no disponible', code },
      { status: code === 'REAUTH_REQUIRED' ? 401 : 502 }
    );
  }

  const config = getO365StorageConfig();
  const mode = config.mode;
  const accessToken = tokenResult.accessToken;

  // Small upload: optional body with file bytes (base64)
  const fileBase64 = body.fileBase64 ?? body.file;
  if (fileSize > 0 && fileSize < SIMPLE_UPLOAD_MAX && fileBase64) {
    if (fileBase64) {
      const buf = Buffer.from(fileBase64, 'base64');
      const uploadResult = await uploadSmall(accessToken, mode, workspaceId, fileName, buf, projectId);
      if (uploadResult.error) {
        return NextResponse.json({ error: uploadResult.error }, { status: uploadResult.status ?? 500 });
      }
      const item = uploadResult.data as { id: string; name: string; size?: number; webUrl?: string; file?: { mimeType?: string }; parentReference?: { driveId?: string } };
      const driveId = item.parentReference?.driveId ?? (await getDriveId(accessToken, mode)).driveId ?? '';
      return NextResponse.json({
        file: {
          id: item.id,
          name: item.name,
          size: item.size ?? 0,
          webUrl: item.webUrl,
          driveId,
          mimeType: (item as { file?: { mimeType?: string } }).file?.mimeType,
        },
        driveId,
      });
    }
  }

  // Large file: return upload session URL for client to upload chunks
  const sessionResult = await createUploadSession(accessToken, mode, workspaceId, fileName, projectId);
  if (sessionResult.error) {
    return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status ?? 500 });
  }

  return NextResponse.json({
    uploadUrl: sessionResult.uploadUrl,
    chunkSize: CHUNK_SIZE,
    fileName,
  });
}
