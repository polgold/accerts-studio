'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateTaskStatus(taskId: string, status: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
  revalidatePath('/');
  return error ? { error: error.message } : {};
}

export async function createTask(
  projectId: string,
  data: { title: string; description?: string | null; status?: string; due_date?: string | null }
): Promise<{ error?: string; task?: { id: string; title: string; description: string | null; status: string; due_date: string | null; task_assignees: { user_id: string }[] } }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? 'todo',
      due_date: data.due_date ?? null,
      created_by: user?.id ?? null,
    })
    .select('id, title, description, status, due_date, task_assignees(user_id)')
    .single();
  revalidatePath('/');
  if (error) return { error: error.message };
  return { task: task as { id: string; title: string; description: string | null; status: string; due_date: string | null; task_assignees: { user_id: string }[] } };
}
