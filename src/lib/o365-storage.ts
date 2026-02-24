/**
 * O365 storage (OneDrive / SharePoint) via Microsoft Graph.
 * Server-only: uses connection token from workspace_connectors; no secrets to client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getValidAccessToken, getGraphClient, graphFetchWithRetry, type GraphDriveItemWithDownload, type GraphUploadSession } from '@/lib/connectors/microsoft-graph';
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024; // 4 MB

const APP_NAME = process.env.O365_APP_NAME ?? 'AccertsStudio';

export type O365StorageMode = 'onedrive' | 'sharepoint';

export function getO365StorageConfig(): {
  mode: O365StorageMode;
  siteId?: string;
  driveId?: string;
  baseFolder?: string;
  onedriveBaseFolder: string;
} {
  const mode = (process.env.O365_STORAGE_MODE ?? 'onedrive') as O365StorageMode;
  const onedriveBaseFolder = process.env.ONEDRIVE_BASE_FOLDER ?? `/Apps/${APP_NAME}`;
  const baseFolder = process.env.SHAREPOINT_BASE_FOLDER ?? '';
  return {
    mode,
    siteId: process.env.SHAREPOINT_SITE_ID,
    driveId: process.env.SHAREPOINT_DRIVE_ID,
    baseFolder: baseFolder || undefined,
    onedriveBaseFolder,
  };
}

/** Path segment for Graph: no leading slash; segments encoded. */
function toGraphPath(workspaceId: string, projectId?: string | null): string {
  const config = getO365StorageConfig();
  const base = config.onedriveBaseFolder.replace(/^\//, '');
  const folderPath = projectId ? `${base}/${workspaceId}/${projectId}` : `${base}/${workspaceId}`;
  return folderPath.split('/').map(encodeURIComponent).join('/');
}

/** Ensure folder path and return rootPath + childrenPath for listing/upload. */
function ensureFolderAndGetPath(
  mode: O365StorageMode,
  workspaceId: string,
  projectId?: string | null
): { childrenPath: string; rootPath: string } {
  const encodedPath = toGraphPath(workspaceId, projectId);
  if (mode === 'onedrive') {
    const rootPath = `/me/drive/root:/${encodedPath}`;
    const childrenPath = `${rootPath}:/children`;
    return { childrenPath, rootPath };
  }
  const driveId = getO365StorageConfig().driveId;
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID required');
  const rootPath = `/drives/${driveId}/root:/${encodedPath}`;
  const childrenPath = `${rootPath}:/children`;
  return { childrenPath, rootPath };
}

/** Small upload (< 4MB): PUT content to /drive/root:path/filename:/content */
export async function uploadSmall(
  accessToken: string,
  mode: O365StorageMode,
  workspaceId: string,
  fileName: string,
  content: ArrayBuffer | Buffer,
  projectId?: string | null
): Promise<{ data: GraphDriveItemWithDownload; error?: never } | { data?: never; error: string; status?: number }> {
  const { rootPath } = ensureFolderAndGetPath(mode, workspaceId, projectId);
  const itemPath = `${rootPath}/${encodeURIComponent(fileName)}:/content`;
  const res = await getGraphClient(accessToken, itemPath, {
    method: 'PUT',
    body: content as unknown as BodyInit,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    return { error: err.error?.message ?? res.statusText, status: res.status };
  }
  const data = (await res.json()) as GraphDriveItemWithDownload;
  return { data };
}

/** Create upload session for large file (>= 4MB). */
export async function createUploadSession(
  accessToken: string,
  mode: O365StorageMode,
  workspaceId: string,
  fileName: string,
  projectId?: string | null
): Promise<{ uploadUrl: string; error?: never } | { uploadUrl?: never; error: string; status?: number }> {
  const { rootPath } = ensureFolderAndGetPath(mode, workspaceId, projectId);
  const itemPath = `${rootPath}/${encodeURIComponent(fileName)}:/createUploadSession`;
  const result = await graphFetchWithRetry<GraphUploadSession>(accessToken, itemPath, {
    method: 'POST',
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } }),
  });
  if (result.error || !result.data?.uploadUrl) {
    const status = 'status' in result ? result.status : undefined;
    return { error: result.error ?? 'No upload URL', status };
  }
  return { uploadUrl: result.data.uploadUrl };
}

/** Upload a chunk to the upload URL (from createUploadSession). No auth header – uploadUrl is pre-authenticated. */
export async function uploadChunk(
  uploadUrl: string,
  range: { start: number; end: number; total: number },
  chunk: ArrayBuffer | Buffer
): Promise<{ data?: GraphDriveItemWithDownload; done: boolean; error?: string; status?: number }> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(chunk.byteLength),
      'Content-Range': `bytes ${range.start}-${range.end - 1}/${range.total}`,
    },
    body: chunk as unknown as BodyInit,
  });
  if (res.status === 202) {
    const nextRange = res.headers.get('Location');
    return { done: false, data: undefined };
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    return { done: false, error: err.error?.message ?? res.statusText, status: res.status };
  }
  const data = (await res.json()) as GraphDriveItemWithDownload;
  return { done: true, data };
}

/** List files in workspace folder from Graph. */
export async function listFolder(
  accessToken: string,
  mode: O365StorageMode,
  workspaceId: string,
  projectId?: string | null
): Promise<{ items: GraphDriveItemWithDownload[]; error?: never } | { items?: never; error: string; status?: number }> {
  const { childrenPath } = ensureFolderAndGetPath(mode, workspaceId, projectId);
  const result = await graphFetchWithRetry<{ value: GraphDriveItemWithDownload[] }>(accessToken, childrenPath);
  if (result.error) {
    const status = 'status' in result ? result.status : undefined;
    return { error: result.error, status };
  }
  return { items: result.data?.value ?? [] };
}

/** Get drive item (for download URL). */
export async function getDriveItem(
  accessToken: string,
  mode: O365StorageMode,
  driveId: string,
  itemId: string
): Promise<{ data: GraphDriveItemWithDownload; error?: never } | { data?: never; error: string; status?: number }> {
  const path = `/drives/${driveId}/items/${itemId}`;
  const result = await graphFetchWithRetry<GraphDriveItemWithDownload>(accessToken, path);
  if (result.error) {
    const status = 'status' in result ? result.status : undefined;
    return { error: result.error, status };
  }
  if (!result.data) return { error: 'Item not found', status: 404 };
  return { data: result.data };
}

/** Get download URL for an item (OneDrive: /me/drive/items/{id}; SharePoint: /drives/{driveId}/items/{id}). */
export async function getDownloadUrl(
  accessToken: string,
  driveId: string,
  itemId: string
): Promise<{ url: string; error?: never } | { url?: never; error: string; status?: number }> {
  const result = await graphFetchWithRetry<GraphDriveItemWithDownload>(
    accessToken,
    `/drives/${driveId}/items/${itemId}`
  );
  if (result.error || !result.data) {
    const status = 'status' in result ? result.status : 404;
    return { error: result.error ?? 'Item not found', status };
  }
  const url = (result.data as GraphDriveItemWithDownload)['@microsoft.graph.downloadUrl'];
  if (!url) return { error: 'Download URL no disponible', status: 404 };
  return { url };
}

/** Delete drive item. */
export async function deleteDriveItem(
  accessToken: string,
  driveId: string,
  itemId: string
): Promise<{ ok: true; error?: never } | { ok?: false; error: string; status?: number }> {
  const res = await getGraphClient(accessToken, `/drives/${driveId}/items/${itemId}`, { method: 'DELETE' });
  if (res.ok || res.status === 204) return { ok: true };
  const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
  return { ok: false, error: err.error?.message ?? res.statusText, status: res.status };
}

/** Get drive ID for OneDrive (from /me/drive) or SharePoint (from env). */
export async function getDriveId(
  accessToken: string,
  mode: O365StorageMode
): Promise<{ driveId: string; error?: never } | { driveId?: never; error: string }> {
  if (mode === 'sharepoint') {
    const id = getO365StorageConfig().driveId;
    return id ? { driveId: id } : { error: 'SHAREPOINT_DRIVE_ID not set' };
  }
  const result = await graphFetchWithRetry<{ id: string }>(accessToken, '/me/drive');
  if (result.error || !result.data?.id) return { error: result.error ?? 'No drive' };
  return { driveId: result.data.id };
}

/** Get valid token and run an O365 operation. */
export async function withO365Token<T>(
  connectionId: string,
  supabase: SupabaseClient,
  fn: (accessToken: string) => Promise<T>
): Promise<{ data: T; error?: never; code?: string } | { data?: never; error: string; code?: string }> {
  const tokenResult = await getValidAccessToken(connectionId, supabase);
  if (tokenResult.error || !tokenResult.accessToken) {
    return {
      error: tokenResult.error ?? 'Token no disponible',
      code: 'code' in tokenResult ? tokenResult.code : undefined,
    };
  }
  try {
    const data = await fn(tokenResult.accessToken);
    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error en O365' };
  }
}

/** Get default connection for workspace (first Microsoft connector). */
export async function getDefaultConnection(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ connectionId: string; error?: never } | { connectionId?: never; error: string }> {
  const { data: row, error } = await supabase
    .from('workspace_connectors')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'microsoft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !row) return { error: 'No hay cuenta Microsoft conectada' };
  return { connectionId: row.id };
}
