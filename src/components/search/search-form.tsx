'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SearchForm({
  workspaceSlug,
  initialQ,
  initialType,
  initialStatus,
}: {
  workspaceSlug: string;
  initialQ: string;
  initialType: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);

  function submit() {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (type) p.set('type', type);
    if (status) p.set('status', status);
    router.push(`/w/${workspaceSlug}/search?${p.toString()}`);
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs font-medium text-neutral-500">Buscar</label>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Proyectos, documentos, boards..."
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-500">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm"
        >
          <option value="">Todos</option>
          <option value="project">Proyecto</option>
          <option value="document">Documento</option>
          <option value="board">Board</option>
          <option value="task">Tarea</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-500">Estado</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm"
        >
          <option value="">Cualquiera</option>
          <option value="draft">draft</option>
          <option value="production">production</option>
          <option value="done">done</option>
        </select>
      </div>
      <Button type="button" onClick={submit}>Buscar</Button>
    </div>
  );
}
