import { redirect } from 'next/navigation';
import { requireProjectAccess } from '@/lib/auth';

export default async function NewBoardPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { user, supabase, project } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
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
