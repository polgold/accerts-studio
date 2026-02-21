'use client';

import { DocumentPreview } from '@/components/documents/document-preview';

type Version = { id: string; storage_path: string | null; external_url: string | null; content_json: Record<string, unknown> | null };

export function PublicShareView({
  type,
  document,
  version,
  board,
  cards,
  permission,
}: {
  type: 'document';
  document: { id: string; title: string; doc_type: string };
  version: Version | null;
  permission: string;
  board?: never;
  cards?: never;
} | {
  type: 'board';
  board: { id: string; title: string; mode: string };
  cards: { id: string; card_type: string; title: string | null; data_json: Record<string, unknown>; position: number }[];
  permission: string;
  document?: never;
  version?: never;
}) {
  if (type === 'document') {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-neutral-900 mb-4">{document.title}</h1>
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-soft">
          {version && (
            <DocumentPreview
              docType={document.doc_type}
              version={{ ...version, version_number: 1, poster_path: null, created_at: '' }}
              workspaceSlug=""
            />
          )}
        </div>
        {permission === 'comment' && (
          <p className="mt-4 text-sm text-neutral-500">Puedes comentar en este documento.</p>
        )}
      </div>
    );
  }
  if (type === 'board' && board && cards) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-neutral-900 mb-4">{board.title}</h1>
        <div className="flex flex-wrap gap-4">
          {cards.map((c) => (
            <div key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4 min-w-[200px] shadow-soft">
              <span className="text-xs text-neutral-400 uppercase">{c.card_type}</span>
              <p className="mt-1 text-sm text-neutral-900">{(c.data_json.content as string) || c.title || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
