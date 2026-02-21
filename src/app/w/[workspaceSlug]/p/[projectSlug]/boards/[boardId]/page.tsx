import { requireProjectAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BoardEditor } from '@/components/boards/board-editor';

export default async function BoardDetailPage({
  params,
}: {
  params: { workspaceSlug: string; projectSlug: string; boardId: string };
}) {
  const { workspaceSlug, projectSlug, boardId } = params;
  const { project, supabase } = await requireProjectAccess(workspaceSlug, projectSlug);
  const { data: board } = await supabase
    .from('boards')
    .select('id, title, mode, visibility')
    .eq('project_id', project.id)
    .eq('id', boardId)
    .single();
  if (!board) notFound();
  const { data: cards } = await supabase
    .from('board_cards')
    .select('id, card_type, title, data_json, position')
    .eq('board_id', board.id)
    .order('position');
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col p-6">
      <BoardEditor
        workspaceSlug={workspaceSlug}
        projectSlug={projectSlug}
        board={board as { id: string; title: string; mode: string; visibility: string }}
        initialCards={(cards ?? []) as { id: string; card_type: string; title: string | null; data_json: Record<string, unknown>; position: number }[]}
      />
    </div>
  );
}
