'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentSchema, docTypes, docVisibilities, type DocumentSchema } from '@/lib/validations';
import { createDocument } from '@/app/actions/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormData = DocumentSchema;

export function NewDocumentForm({
  workspaceSlug,
  projectSlug,
  projectId,
  folders,
}: {
  workspaceSlug: string;
  projectSlug: string;
  projectId: string;
  folders: { id: string; name: string; parent_id: string | null; position: number }[];
}) {
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: { title: '', doc_type: 'text', visibility: 'team', folder_id: null, pinned: false },
  });

  async function onSubmit(data: FormData) {
    const result = await createDocument(projectId, data);
    if (result.error) form.setError('root', { message: result.error });
    else if (result.documentId) {
      router.push(`/w/${workspaceSlug}/p/${projectSlug}/documents/${result.documentId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
      {form.formState.errors.root && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.root.message}</p>
      )}
      <div>
        <Label htmlFor="title">Título</Label>
        <Input id="title" {...form.register('title')} className="mt-1" />
        {form.formState.errors.title && <p className="text-xs text-red-600 mt-1">{form.formState.errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="doc_type">Tipo</Label>
        <select
          id="doc_type"
          {...form.register('doc_type')}
          className="mt-1 flex h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
        >
          {docTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="visibility">Visibilidad</Label>
        <select
          id="visibility"
          {...form.register('visibility')}
          className="mt-1 flex h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
        >
          {docVisibilities.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="folder_id">Carpeta</Label>
        <select
          id="folder_id"
          {...form.register('folder_id')}
          className="mt-1 flex h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
        >
          <option value="">Sin carpeta</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="pinned" {...form.register('pinned')} />
        <Label htmlFor="pinned" className="font-normal">Fijar</Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit">Crear documento</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
