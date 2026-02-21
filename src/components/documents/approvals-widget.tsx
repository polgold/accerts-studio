'use client';

import { useState } from 'react';
import { requestApproval, setApprovalStatus } from '@/app/actions/documents';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

type Approval = { id: string; document_version_id: string; status: string; requested_by: string; decided_by: string | null; decided_at: string | null; note: string | null };

export function ApprovalsWidget({
  documentVersionId,
  approvals,
}: {
  documentVersionId?: string;
  approvals: Approval[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function handleRequestApproval() {
    if (!documentVersionId) return;
    setLoading('request');
    await requestApproval(documentVersionId);
    setLoading(null);
  }

  async function handleSetStatus(approvalId: string, status: 'approved' | 'changes_requested') {
    setLoading(approvalId);
    await setApprovalStatus(approvalId, status, note);
    setLoading(null);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-medium text-neutral-900">Aprobaciones</h3>
      {documentVersionId && approvals.length === 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={handleRequestApproval}
          disabled={!!loading}
        >
          Solicitar aprobación
        </Button>
      )}
      <ul className="mt-2 space-y-2">
        {approvals.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
            <span className="font-medium">{a.status}</span>
            {a.decided_at && <span className="text-neutral-500">{formatDateTime(a.decided_at)}</span>}
            {a.status === 'pending' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nota (opcional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs w-32"
                />
                <Button size="sm" variant="outline" onClick={() => handleSetStatus(a.id, 'approved')} disabled={!!loading}>
                  Aprobar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleSetStatus(a.id, 'changes_requested')} disabled={!!loading}>
                  Cambios
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
