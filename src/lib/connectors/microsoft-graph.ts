import type { SupabaseClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from './encryption';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

export const MICROSOFT_SCOPES = [
  'offline_access',
  'User.Read',
  'Sites.Read.All',
  'Files.Read.All',
].join(' ');

export interface GraphTokens {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

export async function getValidAccessToken(
  connectionId: string,
  supabase: SupabaseClient
): Promise<{ accessToken: string; error?: never } | { accessToken?: never; error: string; code?: string }> {
  const { data: row, error: fetchError } = await supabase
    .from('workspace_connectors')
    .select('id, workspace_id, encrypted_access_token, encrypted_refresh_token, token_expires_at')
    .eq('id', connectionId)
    .eq('provider', 'microsoft')
    .single();

  if (fetchError || !row) {
    return { error: 'Conexión no encontrada', code: 'CONNECTION_NOT_FOUND' };
  }

  let accessToken: string;
  let refreshToken: string;
  let expiresAt: Date;

  try {
    accessToken = decrypt(row.encrypted_access_token as string);
    refreshToken = decrypt(row.encrypted_refresh_token as string);
    expiresAt = new Date(row.token_expires_at as string);
  } catch {
    return { error: 'Error al leer tokens', code: 'DECRYPT_FAILED' };
  }

  const now = new Date();
  const bufferSeconds = 300;
  if (expiresAt.getTime() - bufferSeconds * 1000 > now.getTime()) {
    return { accessToken };
  }

  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { error: 'Configuración OAuth incompleta', code: 'CONFIG_MISSING' };
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const err = (await tokenRes.json().catch(() => ({}))) as { error?: string };
    if (err.error === 'invalid_grant' || tokenRes.status === 400) {
      return { error: 'Sesión caducada. Reconecta la cuenta.', code: 'REAUTH_REQUIRED' };
    }
    return { error: err.error ?? 'Error al renovar token', code: 'REFRESH_FAILED' };
  }

  const data = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const newExpiresAt = new Date(now.getTime() + data.expires_in * 1000);
  const newRefresh = data.refresh_token ?? refreshToken;

  try {
    await supabase
      .from('workspace_connectors')
      .update({
        encrypted_access_token: encrypt(data.access_token),
        encrypted_refresh_token: encrypt(newRefresh),
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);
  } catch {
    return { error: 'Error al guardar nuevo token', code: 'SAVE_FAILED' };
  }

  return { accessToken: data.access_token };
}

export async function graphFetch<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; error?: never } | { data?: never; error: string; status?: number }> {
  const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
    const msg = errBody.error?.message ?? errBody.message ?? res.statusText;
    if (res.status === 401) {
      return { error: 'Token inválido o expirado', status: 401 };
    }
    if (res.status === 403) {
      return { error: msg || 'Permisos insuficientes en la cuenta de Microsoft', status: 403 };
    }
    return { error: msg || `Error ${res.status}`, status: res.status };
  }

  const data = (await res.json()) as T;
  return { data };
}

export async function graphFetchBinary(
  accessToken: string,
  path: string
): Promise<{ data: ArrayBuffer; error?: never } | { data?: never; error: string; status?: number }> {
  const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: text || `Error ${res.status}`, status: res.status };
  }
  return { data: await res.arrayBuffer() };
}

// Types for Graph API responses
export interface GraphSite {
  id: string;
  displayName: string;
  webUrl: string;
}

export interface GraphDrive {
  id: string;
  name: string;
  driveType: string;
}

export interface GraphDriveItem {
  id: string;
  name: string;
  folder?: { childCount: number };
  file?: { mimeType?: string };
  size?: number;
}

export interface GraphSitesResponse {
  value: GraphSite[];
}

export interface GraphDrivesResponse {
  value: GraphDrive[];
}

export interface GraphChildrenResponse {
  value: GraphDriveItem[];
}
