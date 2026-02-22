'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { projectSchema, type ProjectSchema } from '@/lib/validations';

export async function createProject(workspaceSlug: string, data: ProjectSchema): Promise<{ slug?: string; error?: string }> {
  const parsed = projectSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().formErrors[0] };
  const supabase = await createClient();
  const { data: ws } = await supabase.from('workspaces').select('id').eq('slug', workspaceSlug).single();
  if (!ws) return { error: 'Workspace no encontrado' };
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      workspace_id: ws.id,
      slug: parsed.data.slug,
      title: parsed.data.title,
      client_name: parsed.data.client_name || null,
      status: parsed.data.status,
      visibility: parsed.data.visibility ?? 'workspace',
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      logline: parsed.data.logline || null,
      description: parsed.data.description || null,
    })
    .select('id, slug')
    .single();
  if (error) return { error: error.message };
  const { data: { user } } = await supabase.auth.getUser();
  if (user && project) {
    await supabase.from('activity_log').insert({
      workspace_id: ws.id,
      project_id: project.id,
      user_id: user.id,
      action: 'project_created',
      entity_type: 'project',
      entity_id: project.id,
      metadata: { title: parsed.data.title },
    });
  }
  revalidatePath(`/w/${workspaceSlug}/projects`);
  revalidatePath(`/w/${workspaceSlug}/dashboard`);
  return { slug: project.slug };
}
