import { redirect } from 'next/navigation';
import { requireProjectAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function NewBoardPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { workspace, supabase } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: project } = await supabase.from('projects').select('id').eq('slug', params.projectSlug).single();
  if (!project) redirect(`/w/${params.workspaceSlug}/projects`);
  const { data: board } = await supabase
    .from('boards')
    .insert({
      project_id: project.id,
      title: 'Nuevo board',
      mode: 'freeform',
      visibility: 'team',
      created_by: user.id,
    })
    .select('id')
    .single();
  if (board) redirect(`/w/${params.workspaceSlug}/p/${params.projectSlug}/boards/${board.id}`);
  redirect(`/w/${params.workspaceSlug}/p/${params.projectSlug}/boards`);
}
