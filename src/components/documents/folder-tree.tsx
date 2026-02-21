'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

function buildTree(folders: { id: string; name: string; parent_id: string | null; position: number }[]) {
  const byParent: Record<string, { id: string; name: string; position: number }[]> = {};
  folders.forEach((f) => {
    const key = f.parent_id ?? 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push({ id: f.id, name: f.name, position: f.position });
  });
  Object.keys(byParent).forEach((k) => byParent[k].sort((a, b) => a.position - b.position));
  return byParent;
}

export function FolderTree({
  workspaceSlug,
  projectSlug,
  folders,
  selectedFolderId,
}: {
  workspaceSlug: string;
  projectSlug: string;
  folders: { id: string; name: string; parent_id: string | null; position: number }[];
  selectedFolderId: string;
}) {
  const pathname = usePathname();
  const base = `/w/${workspaceSlug}/p/${projectSlug}/documents`;
  const tree = buildTree(folders);

  function renderNode(parentKey: string, depth: number) {
    const children = tree[parentKey];
    if (!children || children.length === 0) return null;
    return (
      <ul className={depth > 0 ? 'ml-3 mt-1' : ''}>
        {children.map((node) => {
          const href = `${base}?folder=${node.id}`;
          const active = selectedFolderId === node.id;
          return (
            <li key={node.id}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                  active ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
                )}
              >
                {active ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                {node.name}
              </Link>
              {renderNode(node.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <nav className="rounded-lg border border-neutral-200 bg-white p-2">
      <Link
        href={`${base}?folder=root`}
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
          selectedFolderId === 'root' ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
        )}
      >
        <Folder className="h-4 w-4" />
        Todos
      </Link>
      {renderNode('root', 0)}
    </nav>
  );
}
