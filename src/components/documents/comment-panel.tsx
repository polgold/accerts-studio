'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { addComment } from '@/app/actions/documents';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

type Comment = { id: string; content: string; user_id: string; parent_id: string | null; status: string; created_at: string };

export function CommentPanel({
  entityType,
  entityId,
  comments,
  profilesMap,
}: {
  entityType: 'document' | 'version' | 'board' | 'card' | 'task';
  entityId: string;
  comments: Comment[];
  profilesMap: Record<string, string>;
}) {
  const [localComments, setLocalComments] = useState(comments);
  const [submitting, setSubmitting] = useState(false);
  const [newContent, setNewContent] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim() || submitting) return;
    setSubmitting(true);
    const err = await addComment(entityType, entityId, newContent.trim());
    setSubmitting(false);
    if (!err.error) {
      setLocalComments((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          content: newContent.trim(),
          user_id: '',
          parent_id: null,
          status: 'open',
          created_at: new Date().toISOString(),
        },
      ]);
      setNewContent('');
    }
  }

  const rootComments = localComments.filter((c) => !c.parent_id);
  const getReplies = (id: string) => localComments.filter((c) => c.parent_id === id);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-medium text-neutral-900">Comentarios</h3>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Escribe un comentario..."
          className="flex-1 min-h-[80px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          rows={2}
        />
        <Button type="submit" disabled={submitting || !newContent.trim()}>Enviar</Button>
      </form>
      <ul className="mt-4 space-y-3">
        {rootComments.map((c) => (
          <li key={c.id} className="border-l-2 border-neutral-200 pl-3">
            <p className="text-sm text-neutral-900">{c.content}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {profilesMap[c.user_id] ?? c.user_id?.slice(0, 8)} · {formatDateTime(c.created_at)}
              {c.status === 'resolved' && <span className="ml-1 text-green-600">Resuelto</span>}
            </p>
            {getReplies(c.id).map((r) => (
              <div key={r.id} className="mt-2 ml-2 text-sm text-neutral-600 border-l border-neutral-100 pl-2">
                {r.content}
                <span className="text-xs text-neutral-400 ml-1">{formatDateTime(r.created_at)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
      {rootComments.length === 0 && <p className="text-neutral-500 text-sm mt-4">Sin comentarios aún.</p>}
    </div>
  );
}
