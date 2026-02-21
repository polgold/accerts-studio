'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateBoard(
  boardId: string,
  data: { title?: string; mode?: string; visibility?: string }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('boards').update(data).eq('id', boardId);
  revalidatePath('/');
  return error ? { error: error.message } : {};
}

export async function updateCardPosition(cardId: string, position: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('board_cards').update({ position }).eq('id', cardId);
  revalidatePath('/');
  return error ? { error: error.message } : {};
}

export async function updateBoardCardPositions(boardId: string, cardIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  for (let i = 0; i < cardIds.length; i++) {
    await supabase.from('board_cards').update({ position: i }).eq('id', cardIds[i]).eq('board_id', boardId);
  }
  revalidatePath('/');
  return {};
}

export async function addBoardCard(
  boardId: string,
  cardType: string,
  position: number
): Promise<{ error?: string; card?: { id: string; card_type: string; title: string | null; data_json: Record<string, unknown>; position: number } }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: card, error } = await supabase
    .from('board_cards')
    .insert({
      board_id: boardId,
      card_type: cardType,
      title: null,
      data_json: { content: '', position },
      position,
      created_by: user?.id ?? null,
    })
    .select('id, card_type, title, data_json, position')
    .single();
  revalidatePath('/');
  if (error) return { error: error.message };
  return { card: card as { id: string; card_type: string; title: string | null; data_json: Record<string, unknown>; position: number } };
}
