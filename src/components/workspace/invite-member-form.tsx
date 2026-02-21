'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteSchema, workspaceMemberRoles, type InviteSchema } from '@/lib/validations';
import { inviteToWorkspace } from '@/app/actions/workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormData = InviteSchema;

export function InviteMemberForm({ workspaceId, workspaceSlug }: { workspaceId: string; workspaceSlug: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<FormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'collaborator', project_id: null },
  });

  async function onSubmit(data: FormData) {
    setMessage(null);
    const result = await inviteToWorkspace(workspaceId, data.email, data.role, data.project_id);
    if (result.error) setMessage(result.error);
    else {
      setMessage('Invitación enviada. Revisa el correo del invitado.');
      form.reset();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-wrap items-end gap-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register('email')} className="mt-1 w-56" />
        {form.formState.errors.email && <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="role">Rol</Label>
        <select id="role" {...form.register('role')} className="mt-1 h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm w-36">
          {workspaceMemberRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <Button type="submit">Invitar</Button>
      {message && <p className="text-sm text-neutral-600 w-full">{message}</p>}
    </form>
  );
}
