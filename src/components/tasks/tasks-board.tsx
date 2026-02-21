'use client';

import { useState } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { updateTaskStatus, createTask } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/task-card';

type Task = { id: string; title: string; description: string | null; status: string; due_date: string | null; task_assignees: { user_id: string }[] };

export function TasksBoard({
  workspaceSlug,
  projectSlug,
  projectId,
  initialTasks,
  statuses,
}: {
  workspaceSlug: string;
  projectSlug: string;
  projectId: string;
  initialTasks: Task[];
  statuses: string[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showNew, setShowNew] = useState(false);

  const moveTask = async (taskId: string, newStatus: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    await updateTaskStatus(taskId, newStatus);
  };

  const addTask = async (title: string) => {
    const result = await createTask(projectId, { title, status: 'todo' });
    if (result.task) {
      setTasks((prev) => [...prev, result.task!]);
      setShowNew(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Tareas</h2>
        {!showNew ? (
          <Button size="sm" onClick={() => setShowNew(true)}>Nueva tarea</Button>
        ) : (
          <NewTaskForm onAdd={addTask} onCancel={() => setShowNew(false)} />
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            moveTask={moveTask}
            statuses={statuses}
          />
        ))}
      </div>
    </DndProvider>
  );
}

function TaskColumn({
  status,
  tasks,
  moveTask,
  statuses,
}: {
  status: string;
  tasks: Task[];
  moveTask: (id: string, newStatus: string) => void;
  statuses: string[];
}) {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: () => ({ status }),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });
  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      className="w-72 shrink-0 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 min-h-[120px]"
      style={{ backgroundColor: isOver ? 'rgb(245 245 245)' : undefined }}
    >
      <h3 className="text-sm font-medium text-neutral-600 uppercase tracking-wide mb-3">{status}</h3>
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onMove={(newStatus) => moveTask(t.id, newStatus)} statuses={statuses} />
        ))}
      </div>
    </div>
  );
}

function NewTaskForm({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <Button size="sm" onClick={() => title.trim() && onAdd(title.trim())}>Añadir</Button>
      <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
    </div>
  );
}
