'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

type Event = { id: string; title: string; description: string | null; start_at: string; end_at: string; visibility: string };

export function ScheduleView({
  workspaceSlug,
  projectSlug,
  projectId,
  events,
}: {
  workspaceSlug: string;
  projectSlug: string;
  projectId: string;
  events: Event[];
}) {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const firstDay = start.getDay();
  const padding = firstDay === 0 ? 6 : firstDay - 1;

  const eventsOnDate = (d: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_at), d));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonth(subMonths(month, 1))}>←</Button>
          <span className="flex items-center px-4 font-medium text-neutral-900">
            {format(month, 'MMMM yyyy', { locale: es })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setMonth(addMonths(month, 1))}>→</Button>
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="grid grid-cols-7 text-sm font-medium text-neutral-500 border-b border-neutral-200">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="p-2 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: padding }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-neutral-100" />
          ))}
          {days.map((d) => {
            const dayEvents = eventsOnDate(d);
            const selected = selectedDate && isSameDay(d, selectedDate);
            return (
              <div
                key={d.toISOString()}
                className={`min-h-[80px] border-b border-r border-neutral-100 p-1 ${selected ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
                onClick={() => setSelectedDate(d)}
              >
                <span className="text-sm font-medium text-neutral-700">{format(d, 'd')}</span>
                <ul className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <li key={e.id} className="text-xs truncate rounded bg-neutral-200 px-1 py-0.5" title={e.title}>
                      {e.title}
                    </li>
                  ))}
                  {dayEvents.length > 2 && <li className="text-xs text-neutral-500">+{dayEvents.length - 2}</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      {selectedDate && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-medium text-neutral-700">
            {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </h3>
          <ul className="mt-2 space-y-2">
            {eventsOnDate(selectedDate).map((e) => (
              <li key={e.id} className="text-sm">
                <span className="font-medium">{e.title}</span>
                <span className="text-neutral-500 ml-2">{formatDateTime(e.start_at)} – {formatDateTime(e.end_at)}</span>
              </li>
            ))}
          </ul>
          {eventsOnDate(selectedDate).length === 0 && <p className="text-neutral-500 text-sm">Sin eventos</p>}
        </div>
      )}
    </div>
  );
}
