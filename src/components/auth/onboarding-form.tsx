'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workspaceSchema, type WorkspaceSchema } from '@/lib/validations';
import { createWorkspace } from '@/app/actions/workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormData = WorkspaceSchema;

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: '', slug: '' },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await createWorkspace(data);
    if (result.error) setError(result.error);
    else if (result.slug) {
      router.push(`/w/${result.slug}/dashboard`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      <div>
        <Label htmlFor="name">Nombre del workspace</Label>
        <Input id="name" {...form.register('name')} className="mt-1" placeholder="Mi productora" />
        {form.formState.errors.name && <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="slug">URL (slug)</Label>
        <Input id="slug" {...form.register('slug')} className="mt-1" placeholder="mi-productora" />
        {form.formState.errors.slug && <p className="text-xs text-red-600 mt-1">{form.formState.errors.slug.message}</p>}
      </div>
      <Button type="submit" className="w-full">Crear workspace</Button>
    </form>
  );
}
