'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, projectStatuses, type ProjectSchema } from '@/lib/validations';
import { createProject } from '@/app/actions/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateSlug } from '@/lib/utils';

type FormData = ProjectSchema;

export function NewProjectForm({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      slug: '',
      client_name: '',
      status: 'draft',
      start_date: '',
      end_date: '',
      logline: '',
      description: '',
    },
  });

  const title = form.watch('title');
  useEffect(() => {
    if (!form.formState.dirtyFields.slug) {
      form.setValue('slug', generateSlug(title ?? ''), { shouldValidate: true });
    }
  }, [title]);

  async function onSubmit(data: FormData) {
    const result = await createProject(workspaceSlug, data);
    if (result.error) form.setError('root', { message: result.error });
    else if (result.slug) {
      router.push(`/w/${workspaceSlug}/p/${result.slug}/overview`);
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
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input id="slug" {...form.register('slug')} className="mt-1" />
        {form.formState.errors.slug && <p className="text-xs text-red-600 mt-1">{form.formState.errors.slug.message}</p>}
      </div>
      <div>
        <Label htmlFor="client_name">Cliente</Label>
        <Input id="client_name" {...form.register('client_name')} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="status">Estado</Label>
        <select
          id="status"
          {...form.register('status')}
          className="mt-1 flex h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1 text-sm"
        >
          {projectStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Fecha inicio</Label>
          <Input id="start_date" type="date" {...form.register('start_date')} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="end_date">Fecha fin</Label>
          <Input id="end_date" type="date" {...form.register('end_date')} className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="logline">Logline</Label>
        <textarea id="logline" {...form.register('logline')} className="mt-1 flex min-h-[80px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" />
      </div>
      <div>
        <Label htmlFor="description">Descripción</Label>
        <textarea id="description" {...form.register('description')} className="mt-1 flex min-h-[100px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Crear proyecto</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
