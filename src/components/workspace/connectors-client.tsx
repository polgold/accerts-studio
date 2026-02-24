'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Cloud, FileText, Loader2, Unplug } from 'lucide-react';
import { O365FilesUpload } from './o365-files-upload';

type Connection = { id: string; displayName: string; expiresAt: string; createdAt: string };
type Project = { id: string; slug: string; title: string };
type Site = { id: string; displayName: string; webUrl: string };
type Drive = { id: string; name: string; driveType: string };
type Folder = { id: string; name: string; childCount: number };
type FileItem = { id: string; name: string; size: number; mimeType: string | null };

export function ConnectorsClient({
  workspaceId,
  workspaceSlug,
  projects,
}: {
  workspaceId: string;
  workspaceSlug: string;
  projects: Project[];
}) {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected === '1') setMessage({ type: 'success', text: 'Cuenta conectada correctamente.' });
    if (error === 'oauth_missing') setMessage({ type: 'error', text: 'Faltan datos de autorización. Intenta de nuevo.' });
    if (error === 'oauth_invalid_state') setMessage({ type: 'error', text: 'Sesión inválida. Intenta conectar de nuevo.' });
    if (error === 'token_exchange') setMessage({ type: 'error', text: 'Error al obtener tokens. Intenta de nuevo.' });
    if (error === 'msa_not_supported') setMessage({ type: 'error', text: 'Las cuentas personales de Microsoft (MSA) no están soportadas. Usa una cuenta laboral o educativa.' });
    if (error === 'save_failed') setMessage({ type: 'error', text: 'Error al guardar la conexión.' });
    if (error === 'oauth_config') setMessage({ type: 'error', text: 'Falta configuración OAuth (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI).' });
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingStatus(true);
      try {
        const res = await fetch(`/api/connectors/microsoft/status?workspaceId=${encodeURIComponent(workspaceId)}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setMessage({ type: 'error', text: data.error ?? 'Error al cargar conexiones' });
          return;
        }
        if (!cancelled) setConnections(data.connections ?? []);
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const startOAuth = () => {
    window.location.href = `/api/connectors/microsoft/start?workspaceId=${encodeURIComponent(workspaceId)}`;
  };

  const disconnect = async (connectionId: string) => {
    if (!confirm('¿Desconectar esta cuenta? Tendrás que volver a autorizar para usar SharePoint.')) return;
    try {
      const res = await fetch(
        `/api/connectors/microsoft/disconnect?workspaceId=${encodeURIComponent(workspaceId)}&connectionId=${encodeURIComponent(connectionId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Error al desconectar' });
        return;
      }
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      setMessage({ type: 'success', text: 'Cuenta desconectada.' });
    } catch {
      setMessage({ type: 'error', text: 'Error al desconectar' });
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-[var(--success-bg)] text-[var(--success-text)]' : 'bg-[var(--error-bg)] text-[var(--error-text)]'
          }`}
        >
          {message.text}
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium text-[var(--muted-strong)]">Cuentas Microsoft</h2>
        {loadingStatus ? (
          <p className="mt-2 text-[var(--muted)] flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {connections.length === 0 && (
              <li className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-[var(--muted)]">
                No hay cuentas conectadas.
              </li>
            )}
            {connections.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-[var(--foreground)]">{c.displayName}</span>
                  <span className="text-xs text-[var(--muted)]">
                    Conectada {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect(c.id)}
                  className="ml-2 shrink-0 inline-flex items-center gap-1 rounded border border-[var(--border-strong)] px-2 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--input-bg)] hover:text-[var(--foreground)]"
                  title="Desconectar cuenta"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  Desconectar
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={startOAuth}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:opacity-90"
        >
          <Cloud className="h-4 w-4" />
          Conectar SharePoint
        </button>
      </section>

      {connections.length > 0 && (
        <>
          <O365FilesUpload
            workspaceId={workspaceId}
            connectionId={connections[0].id}
            onError={(err) => setMessage({ type: 'error', text: err })}
            onUploadSuccess={() => setMessage({ type: 'success', text: 'Archivo subido a Microsoft 365.' })}
          />
          <SharePointBrowser
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            connections={connections}
            projects={projects}
            onError={(err) => setMessage({ type: 'error', text: err })}
            onImportSuccess={(title) => setMessage({ type: 'success', text: `"${title}" importado.` })}
          />
        </>
      )}
    </div>
  );
}

function SharePointBrowser({
  workspaceId,
  workspaceSlug,
  connections,
  projects,
  onError,
  onImportSuccess,
}: {
  workspaceId: string;
  workspaceSlug: string;
  connections: Connection[];
  projects: Project[];
  onError: (msg: string) => void;
  onImportSuccess: (title: string) => void;
}) {
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? '');
  const [sites, setSites] = useState<Site[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [siteId, setSiteId] = useState('');
  const [driveId, setDriveId] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? '');

  const fetchSites = async (connId: string) => {
    setLoading('sites');
    setSites([]);
    setDrives([]);
    setFolders([]);
    setFiles([]);
    setSiteId('');
    setDriveId('');
    setFolderId(null);
    try {
      const res = await fetch(
        `/api/connectors/microsoft/sites?workspaceId=${encodeURIComponent(workspaceId)}&connectionId=${encodeURIComponent(connId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'REAUTH_REQUIRED') onError('Sesión caducada. Reconecta la cuenta desde arriba.');
        else onError(data.error ?? 'Error al cargar sites');
        return;
      }
      setSites(data.sites ?? []);
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (connectionId) fetchSites(connectionId);
  }, [connectionId]);

  const onSiteChange = async (sid: string) => {
    setSiteId(sid);
    setDrives([]);
    setFolders([]);
    setFiles([]);
    setDriveId('');
    setFolderId(null);
    if (!sid) return;
    setLoading('drives');
    try {
      const res = await fetch(
        `/api/connectors/microsoft/drives?workspaceId=${encodeURIComponent(workspaceId)}&connectionId=${encodeURIComponent(connectionId)}&siteId=${encodeURIComponent(sid)}`
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'REAUTH_REQUIRED') onError('Sesión caducada. Reconecta la cuenta.');
        else onError(data.error ?? 'Error al cargar bibliotecas');
        return;
      }
      setDrives(data.drives ?? []);
    } finally {
      setLoading(null);
    }
  };

  const onDriveChange = async (did: string) => {
    setDriveId(did);
    setFolders([]);
    setFiles([]);
    setFolderId(null);
    if (!did) return;
    setLoading('folders');
    try {
      const [foldersRes, filesRes] = await Promise.all([
        fetch(
          `/api/connectors/microsoft/folders?workspaceId=${encodeURIComponent(workspaceId)}&connectionId=${encodeURIComponent(connectionId)}&driveId=${encodeURIComponent(did)}&parentId=`
        ),
        fetch(
          `/api/connectors/microsoft/files?workspaceId=${encodeURIComponent(workspaceId)}&connectionId=${encodeURIComponent(connectionId)}&driveId=${encodeURIComponent(did)}`
        ),
      ]);
      const foldersData = await foldersRes.json();
      const filesData = await filesRes.json();
      if (!foldersRes.ok) {
        if (foldersData.code === 'REAUTH_REQUIRED') onError('Sesión caducada. Reconecta la cuenta.');
        else onError(foldersData.error ?? 'Error al cargar carpetas');
        return;
      }
      if (!filesRes.ok) {
        if (filesData.code === 'REAUTH_REQUIRED') onError('Sesión caducada. Reconecta la cuenta.');
        else onError(filesData.error ?? 'Error al cargar archivos');
        return;
      }
      setFolders(foldersData.folders ?? []);
      setFiles(filesData.files ?? []);
    } finally {
      setLoading(null);
    }
  };

  const loadFiles = async (fid: string | null) => {
    if (!driveId) return;
    setLoading('files');
    try {
      const parent = fid ? `&folderId=${encodeURIComponent(fid)}` : '';
      const res = await fetch(
        `/api/connectors/microsoft/files?workspaceId=${encodeURIComponent(workspaceId)}&connectionId=${encodeURIComponent(connectionId)}&driveId=${encodeURIComponent(driveId)}${parent}`
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'REAUTH_REQUIRED') onError('Sesión caducada. Reconecta la cuenta.');
        else onError(data.error ?? 'Error al cargar archivos');
        return;
      }
      setFiles(data.files ?? []);
    } finally {
      setLoading(null);
    }
  };

  const onFolderSelect = (fid: string | null) => {
    setFolderId(fid);
    loadFiles(fid);
  };


  const handleImport = async (fileId: string, fileName: string) => {
    if (!selectedProjectId) {
      onError('Elige un proyecto de destino.');
      return;
    }
    setImportingId(fileId);
    try {
      const res = await fetch('/api/connectors/microsoft/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          connectionId,
          projectId: selectedProjectId,
          driveId,
          fileId,
          folderId: folderId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'REAUTH_REQUIRED') onError('Sesión caducada. Reconecta la cuenta.');
        else onError(data.error ?? 'Error al importar');
        return;
      }
      onImportSuccess(data.title ?? fileName);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } finally {
      setImportingId(null);
    }
  };

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <h2 className="text-sm font-medium text-[var(--muted-strong)] mb-4">Importar desde SharePoint</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Cuenta</span>
          <select
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            className="mt-1 block w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Site</span>
          <select
            value={siteId}
            onChange={(e) => onSiteChange(e.target.value)}
            disabled={loading === 'sites'}
            className="mt-1 block w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
          >
            <option value="">Seleccionar site</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.displayName}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Biblioteca de documentos</span>
          <select
            value={driveId}
            onChange={(e) => onDriveChange(e.target.value)}
            disabled={loading === 'drives'}
            className="mt-1 block w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
          >
            <option value="">Seleccionar biblioteca</option>
            {drives.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Carpeta</span>
          <select
            value={folderId ?? ''}
            onChange={(e) => onFolderSelect(e.target.value || null)}
            disabled={loading === 'folders'}
            className="mt-1 block w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
          >
            <option value="">Raíz</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
      </div>

      {driveId && (
        <button
          type="button"
          onClick={() => loadFiles(folderId)}
          disabled={loading === 'files'}
          className="mt-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
        >
          {loading === 'files' ? 'Cargando…' : 'Actualizar lista de archivos'}
        </button>
      )}

      {projects.length > 0 && (
        <label className="mt-4 block">
          <span className="text-xs text-[var(--muted)]">Importar al proyecto</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-4">
        {loading === 'files' ? (
          <p className="flex items-center gap-2 text-[var(--muted)] text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando archivos…
          </p>
        ) : files.length === 0 && driveId ? (
          <p className="text-[var(--muted)] text-sm">No hay archivos en esta carpeta.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <FileText className="h-4 w-4 text-[var(--muted)]" />
                  {f.name}
                  {f.size > 0 && (
                    <span className="text-[var(--muted)] text-xs">
                      ({(f.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleImport(f.id, f.name)}
                  disabled={!selectedProjectId || importingId === f.id}
                  className="rounded bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--primary)] hover:opacity-90 disabled:opacity-50"
                >
                  {importingId === f.id ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    'Importar'
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {projects.length === 0 && (
        <p className="mt-3 text-sm text-[var(--muted-strong)]">
          Crea un proyecto antes de importar archivos.{' '}
          <Link href={`/w/${workspaceSlug}/projects/new`} className="text-[var(--accent)] underline hover:opacity-90">
            Crear proyecto
          </Link>
        </p>
      )}
    </section>
  );
}
