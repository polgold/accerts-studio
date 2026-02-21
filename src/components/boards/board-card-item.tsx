'use client';

import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { cn } from '@/lib/utils';

const CARD_TYPE = 'BOARD_CARD';

type Card = { id: string; card_type: string; title: string | null; data_json: Record<string, unknown>; position: number };

export function BoardCardItem({
  card,
  index,
  onMove,
  total,
}: {
  card: Card;
  index: number;
  onMove: (newPosition: number) => void;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: CARD_TYPE,
    item: { id: card.id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const [, drop] = useDrop({
    accept: CARD_TYPE,
    hover(item: { id: string; index: number }) {
      if (item.id === card.id) return;
      onMove(item.index <= index ? index : index + 1);
    },
  });
  drag(drop(ref));

  const content = card.card_type === 'text'
    ? (card.data_json.content as string) || card.title || 'Nota'
    : card.card_type === 'link'
    ? (card.data_json.url as string) || 'Link'
    : card.title || card.card_type;

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-neutral-200 bg-white p-4 shadow-soft min-w-[180px] max-w-[280px] cursor-move',
        isDragging && 'opacity-50'
      )}
    >
      <span className="text-xs text-neutral-400 uppercase">{card.card_type}</span>
      <p className="mt-1 text-sm text-neutral-900 break-words">{content}</p>
    </div>
  );
}
