'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  Settings,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: 'projects', label: 'Proyectos', icon: FolderKanban },
  { href: 'projects/new', label: 'Nuevo proyecto', icon: PlusCircle, manageOnly: true },
  { href: 'search', label: 'Buscar', icon: Search },
  { href: 'settings/members', label: 'Miembros', icon: Settings, manageOnly: true },
];

export function WorkspaceSidebar({
  workspaceSlug,
  workspaceName,
  canManage = false,
}: {
  workspaceSlug: string;
  workspaceName: string;
  canManage?: boolean;
}) {
  const pathname = usePathname();
  const base = `/w/${workspaceSlug}`;
  const navFiltered = nav.filter((item) => !('manageOnly' in item && item.manageOnly) || canManage);
  return (
    <aside className="w-56 border-r border-neutral-200 bg-white flex flex-col">
      <div className="p-4 border-b border-neutral-200">
        <Link href={base} className="font-semibold text-neutral-900 tracking-tight">
          {workspaceName}
        </Link>
        <p className="text-xs text-neutral-500 mt-0.5">/{workspaceSlug}</p>
      </div>
      <nav className="p-2 flex-1">
        {navFiltered.map(({ href, label, icon: Icon }) => {
          const hrefFull = href === 'dashboard' ? base : `${base}/${href}`;
          const active = href === 'dashboard' ? pathname === base || pathname === `${base}/dashboard` : pathname.startsWith(hrefFull);
          return (
            <Link
              key={href}
              href={hrefFull}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                active ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
