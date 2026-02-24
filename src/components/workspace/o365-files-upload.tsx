'use client';

import { useState, useCallback } from 'react';
import { Upload, Loader2, FileText, Download, Trash2 } from 'lucide-react';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024; // 4 MB

type WorkspaceFile = {
  id: string;
  name: string;
  size: number;
  mime_type: string | null;
  web_url: string | null;
  created_at: string;
};

export function O365FilesUpload({
  workspaceId,
  connectionId,
  projectId,
  onError,
  onUploadSuccess,
}: {
  workspaceId: string;
  connectionId: string;
  projectId?: string | null;
  onError: (msg: string) => void;
  onUploadSuccess?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const url = projectId
        ? `/api/files/list?workspaceId=${encodeURIComponent(workspaceId)}&projectId=${encodeURIComponent(projectId)}`
        : `/api/files/list?workspaceId=${encodeURIComponent(workspaceId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'Error al cargar la lista');
        return;
      }
      setFiles(data.files ?? []);
    } finally {
      setLoadingList(false);
    }
  }, [workspaceId, projectId, onError]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setProgress(0);
    try {
      const fileSize = file.size;
      const isSmall = fileSize < SIMPLE_UPLOAD_MAX;

      if (isSmall) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const initRes = await fetch('/api/files/init-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            connectionId,
            fileName: file.name,
            fileSize,
            fileBase64: base64,
            projectId: projectId ?? undefined,
          }),
        });
        const initData = await initRes.json();
        if (!initRes.ok) {
          if (initData.code === 'MSA_NOT_SUPPORTED') {
            onError('Las cuentas personales de Microsoft no están soportadas. Usa una cuenta laboral o educativa.');
          } else {
            onError(initData.error ?? 'Error al subir');
          }
          return;
        }
        setProgress(100);
        const fileMeta = initData.file;
        const completeRes = await fetch('/api/files/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            connectionId,
            driveId: fileMeta.driveId,
            itemId: fileMeta.id,
            name: fileMeta.name,
            size: fileMeta.size,
            mimeType: fileMeta.mimeType,
            path: `${workspaceId}/${file.name}`,
            webUrl: fileMeta.webUrl,
            projectId: projectId ?? undefined,
          }),
        });
        if (!completeRes.ok) {
          const err = await completeRes.json();
          onError(err.error ?? 'Error al guardar');
          return;
        }
      } else {
        const initRes = await fetch('/api/files/init-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            connectionId,
            fileName: file.name,
            fileSize,
            projectId: projectId ?? undefined,
          }),
        });
        const initData = await initRes.json();
        if (!initRes.ok) {
          if (initData.code === 'MSA_NOT_SUPPORTED') {
            onError('Las cuentas personales de Microsoft no están soportadas. Usa una cuenta laboral o educativa.');
          } else {
            onError(initData.error ?? 'Error al iniciar subida');
          }
          return;
        }
        const uploadUrl = initData.uploadUrl;
        if (!uploadUrl) {
          onError('No se recibió URL de subida');
          return;
        }
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
        let lastDriveItem: { id: string; name: string; size?: number; webUrl?: string; parentReference?: { driveId?: string }; file?: { mimeType?: string } } | null = null;
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunk = file.slice(start, end);
          const res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Length': String(chunk.size),
              'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`,
            },
            body: chunk,
          });
          setProgress(Math.round(((i + 1) / totalChunks) * 100));
          if (res.status === 200) {
            lastDriveItem = await res.json();
            break;
          }
          if (res.status !== 202) {
            const err = await res.json().catch(() => ({}));
            onError((err as { error?: { message?: string } }).error?.message ?? `Error en chunk ${i + 1}`);
            return;
          }
        }
        if (!lastDriveItem) {
          onError('Subida incompleta');
          return;
        }
        const driveId = lastDriveItem.parentReference?.driveId ?? '';
        const completeRes = await fetch('/api/files/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            connectionId,
            driveId,
            itemId: lastDriveItem.id,
            name: lastDriveItem.name,
            size: lastDriveItem.size ?? fileSize,
            mimeType: lastDriveItem.file?.mimeType,
            path: `${workspaceId}/${file.name}`,
            webUrl: lastDriveItem.webUrl,
            projectId: projectId ?? undefined,
          }),
        });
        if (!completeRes.ok) {
          const err = await completeRes.json();
          onError(err.error ?? 'Error al guardar');
          return;
        }
      }
      onUploadSuccess?.();
      loadList();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/files/${id}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este archivo de Microsoft 365 y de la lista?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'Error al eliminar');
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 mt-4">
      <h2 className="text-sm font-medium text-[var(--muted-strong)] mb-4">Archivos en Microsoft 365</h2>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:opacity-90 cursor-pointer disabled:opacity-50">
          <Upload className="h-4 w-4" />
          {uploading ? 'Subiendo…' : 'Subir archivo'}
          <input
            type="file"
            className="sr-only"
            disabled={uploading}
            onChange={handleFileSelect}
          />
        </label>
        <button
          type="button"
          onClick={loadList}
          disabled={loadingList}
          className="rounded border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--input-bg)] disabled:opacity-50"
        >
          {loadingList ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Actualizar lista'}
        </button>
      </div>
      {uploading && (
        <div className="mb-4">
          <div className="h-2 rounded-full bg-[var(--input-bg)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">{progress}%</p>
        </div>
      )}
      <ul className="space-y-2">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm text-[var(--foreground)] min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span className="truncate">{f.name}</span>
              {f.size > 0 && (
                <span className="text-[var(--muted)] text-xs shrink-0">
                  ({(f.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <a
                href={`/api/files/${f.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                title="Descargar"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => handleDelete(f.id)}
                disabled={deletingId === f.id}
                className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--error-bg)] hover:text-[var(--error-text)] disabled:opacity-50"
                title="Eliminar"
              >
                {deletingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {files.length === 0 && !loadingList && (
        <p className="text-sm text-[var(--muted)] py-2">No hay archivos. Sube uno con el botón de arriba.</p>
      )}
    </section>
  );
}
