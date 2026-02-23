'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, Settings, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({
  workspaceSlug,
  workspaceName,
  hasSettings = true,
}: {
  workspaceSlug: string;
  workspaceName: string;
  hasSettings?: boolean;
}) {
  const pathname = usePathname();
  const base = `/w/${workspaceSlug}`;
  const projectsHref = `${base}/projects`;
  const settingsMembersHref = `${base}/settings/members`;
  const settingsConnectorsHref = `${base}/settings/connectors`;

  return (
    <aside className="w-56 border-r flex flex-col shrink-0 bg-[var(--sidebar-bg)] border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)] flex flex-col gap-3">
        <Link href={base} className="flex items-center">
          <Image
            src="/brand/accerts-logo.png"
            alt="Accerts"
            width={140}
            height={44}
            className="h-9 w-auto object-contain object-left"
          />
        </Link>
        <div>
          <Link href={base} className="font-heading font-semibold text-[var(--heading-color)] tracking-tight text-sm block">
            {workspaceName}
          </Link>
          <p className="text-xs text-[var(--muted)] mt-0.5">/{workspaceSlug}</p>
        </div>
      </div>
      <nav className="p-2 flex-1">
        <Link
          href={projectsHref}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === projectsHref || pathname.startsWith(`${base}/p/`)
              ? 'bg-[var(--card-bg)] text-[var(--accent)] font-medium'
              : 'text-[var(--foreground)] hover:bg-[var(--card-bg)] hover:text-[var(--white)]'
          )}
        >
          <FolderKanban className="h-4 w-4 shrink-0" />
          Proyectos
        </Link>
        {hasSettings && (
          <>
            <Link
              href={settingsMembersHref}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname === settingsMembersHref
                  ? 'bg-[var(--card-bg)] text-[var(--accent)] font-medium'
                  : 'text-[var(--foreground)] hover:bg-[var(--card-bg)] hover:text-[var(--white)]'
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              Configuración
            </Link>
            <Link
              href={settingsConnectorsHref}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname === settingsConnectorsHref
                  ? 'bg-[var(--card-bg)] text-[var(--accent)] font-medium'
                  : 'text-[var(--foreground)] hover:bg-[var(--card-bg)] hover:text-[var(--white)]'
              )}
            >
              <Plug className="h-4 w-4 shrink-0" />
              Conectores
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
