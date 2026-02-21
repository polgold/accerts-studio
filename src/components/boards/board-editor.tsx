'use client';

import { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { updateBoard, updateBoardCardPositions, addBoardCard } from '@/app/actions/boards';
import { Button } from '@/components/ui/button';
import { BoardCardItem } from '@/components/boards/board-card-item';
import { cn } from '@/lib/utils';

type Card = { id: string; card_type: string; title: string | null; data_json: Record<string, unknown>; position: number };

export function BoardEditor({
  workspaceSlug,
  projectSlug,
  board,
  initialCards,
}: {
  workspaceSlug: string;
  projectSlug: string;
  board: { id: string; title: string; mode: string; visibility: string };
  initialCards: Card[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [mode, setMode] = useState(board.mode);
  const [adding, setAdding] = useState(false);

  const toggleMode = useCallback(async () => {
    const next = mode === 'freeform' ? 'columns' : 'freeform';
    const err = await updateBoard(board.id, { mode: next });
    if (!err.error) setMode(next);
  }, [board.id, mode]);

  const moveCard = useCallback(async (cardId: string, newPosition: number) => {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === cardId);
      if (idx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(Math.min(newPosition, next.length), 0, item);
      return next.map((c, i) => ({ ...c, position: i }));
    });
    const reordered = [...cards];
    const idx = reordered.findIndex((c) => c.id === cardId);
    if (idx >= 0) {
      const [item] = reordered.splice(idx, 1);
      reordered.splice(Math.min(newPosition, reordered.length), 0, item);
      await updateBoardCardPositions(board.id, reordered.map((c) => c.id));
    }
  }, [board.id, cards]);

  const addCard = useCallback(async (cardType: string) => {
    const err = await addBoardCard(board.id, cardType, cards.length);
    if (!err.error && err.card) {
      setCards((prev) => [...prev, { ...err.card!, position: prev.length }]);
      setAdding(false);
    }
  }, [board.id, cards.length]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">{board.title}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleMode}>
            Modo: {mode === 'freeform' ? 'Freeform' : 'Columnas'}
          </Button>
          <div className="relative">
            <Button size="sm" onClick={() => setAdding((a) => !a)}>Añadir carta</Button>
            {adding && (
              <div className="absolute right-0 top-full mt-1 rounded-lg border border-neutral-200 bg-white py-1 shadow-card z-10 min-w-[140px]">
                {['text', 'image', 'link', 'checklist', 'column'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                    onClick={() => addCard(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className={cn(
          'flex-1 rounded-xl border border-neutral-200 bg-neutral-50/50 overflow-auto p-4',
          mode === 'columns' && 'flex gap-4'
        )}
      >
        {mode === 'freeform' ? (
          <div className="flex flex-wrap gap-4 content-start">
            {cards.map((card, index) => (
              <BoardCardItem
                key={card.id}
                card={card}
                index={index}
                onMove={(newPos) => moveCard(card.id, newPos)}
                total={cards.length}
              />
            ))}
          </div>
        ) : (
          cards.map((card, index) => (
            <BoardCardItem
              key={card.id}
              card={card}
              index={index}
              onMove={(newPos) => moveCard(card.id, newPos)}
              total={cards.length}
            />
          ))
        )}
      </div>
    </DndProvider>
  );
}
