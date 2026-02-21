'use client';

import { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { formatDate } from '@/lib/utils';

type Task = { id: string; title: string; description: string | null; status: string; due_date: string | null; task_assignees: { user_id: string }[] };

export function TaskCard({
  task,
  onMove,
  statuses,
}: {
  task: Task;
  onMove: (newStatus: string) => void;
  statuses: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { id: task.id, status: task.status },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult() as { status?: string } | null;
      if (dropResult?.status && dropResult.status !== task.status) onMove(dropResult.status);
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  drag(ref);

  return (
    <div
      ref={ref}
      className="rounded-lg border border-neutral-200 bg-white p-3 shadow-soft cursor-move hover:border-neutral-300"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <p className="font-medium text-neutral-900 text-sm">{task.title}</p>
      {task.due_date && <p className="text-xs text-neutral-500 mt-1">{formatDate(task.due_date)}</p>}
    </div>
  );
}
