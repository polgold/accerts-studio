'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { DocumentPreview } from '@/components/documents/document-preview';
import { CommentPanel } from '@/components/documents/comment-panel';
import { ApprovalsWidget } from '@/components/documents/approvals-widget';
import { formatDateTime } from '@/lib/utils';

type Doc = { id: string; title: string; doc_type: string; visibility: string; current_version_id: string | null };
type Version = { id: string; version_number: number; storage_path: string | null; external_url: string | null; poster_path: string | null; content_json: Record<string, unknown> | null; created_at: string };
type Approval = { id: string; document_version_id: string; status: string; requested_by: string; decided_by: string | null; decided_at: string | null; note: string | null };
type Comment = { id: string; content: string; user_id: string; parent_id: string | null; status: string; created_at: string };

export function DocumentView({
  workspaceSlug,
  projectSlug,
  document,
  versions,
  currentVersion,
  approvals,
  comments,
  profilesMap,
}: {
  workspaceSlug: string;
  projectSlug: string;
  document: Doc;
  versions: Version[];
  currentVersion: Version | undefined;
  approvals: Approval[];
  comments: Comment[];
  profilesMap: Record<string, string>;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(currentVersion?.id ?? null);
  const ver = versions.find((v) => v.id === selectedVersionId) ?? currentVersion;
  const backUrl = `/w/${workspaceSlug}/p/${projectSlug}/documents`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={backUrl} className="text-sm text-neutral-500 hover:text-neutral-900">← Documentos</Link>
          <h1 className="text-xl font-semibold text-neutral-900 mt-1">{document.title}</h1>
          <p className="text-xs text-neutral-500">{document.doc_type} · {document.visibility}</p>
        </div>
      </div>
      <div className="flex gap-4">
        <label className="text-sm font-medium text-neutral-700">Versión</label>
        <select
          value={selectedVersionId ?? ''}
          onChange={(e) => setSelectedVersionId(e.target.value || null)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>v{v.version_number} – {formatDateTime(v.created_at)}</option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-soft">
        {ver && (
          <DocumentPreview
            docType={document.doc_type}
            version={ver}
            workspaceSlug={workspaceSlug}
          />
        )}
      </div>
      <ApprovalsWidget
        documentVersionId={ver?.id}
        approvals={approvals.filter((a) => ver && a.document_version_id === ver.id)}
      />
      <CommentPanel
        entityType="document"
        entityId={document.id}
        comments={comments}
        profilesMap={profilesMap}
      />
    </div>
  );
}
