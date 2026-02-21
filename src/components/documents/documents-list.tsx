'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Image, Video, File } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  image: Image,
  video_link: Video,
  text: FileText,
  screenplay: FileText,
  call_sheet: FileText,
  shot_list: FileText,
  storyboard: Image,
  moodboard: Image,
  other: File,
};

export function DocumentsList({
  workspaceSlug,
  projectSlug,
  documents,
  filters,
}: {
  workspaceSlug: string;
  projectSlug: string;
  documents: { id: string; title: string; doc_type: string; visibility: string; pinned: boolean; folder_id: string | null; updated_at: string }[];
  filters: { folder?: string; type?: string; q?: string };
}) {
  const router = useRouter();
  const base = `/w/${workspaceSlug}/p/${projectSlug}/documents`;
  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const Icon = typeIcons[doc.doc_type] ?? File;
        return (
          <Link
            key={doc.id}
            href={`${base}/${doc.id}`}
            className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-soft hover:border-neutral-300 transition-colors"
          >
            <div className="rounded-lg bg-neutral-100 p-2">
              <Icon className="h-5 w-5 text-neutral-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 truncate">{doc.title}</span>
                {doc.pinned && <span className="text-xs text-neutral-400">Fijado</span>}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">{doc.doc_type} · {doc.visibility}</p>
            </div>
            <span className="text-xs text-neutral-400 shrink-0">{formatDateTime(doc.updated_at)}</span>
          </Link>
        );
      })}
      {documents.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 py-12 text-center text-neutral-500">
          No hay documentos en esta carpeta.
        </div>
      )}
    </div>
  );
}
