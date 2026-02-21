'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function ProjectHeader({
  workspaceSlug,
  projectSlug,
  projectTitle,
  projectStatus,
  tabs,
}: {
  workspaceSlug: string;
  projectSlug: string;
  projectTitle: string;
  projectStatus: string;
  tabs: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const base = `/w/${workspaceSlug}/p/${projectSlug}`;
  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">{projectTitle}</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            <span className="rounded bg-neutral-100 px-1.5 py-0.5">{projectStatus}</span>
          </p>
        </div>
      </div>
      <nav className="mt-4 flex gap-1 overflow-x-auto">
        {tabs.map(({ href, label }) => {
          const hrefFull = `${base}/${href}`;
          const active = pathname === hrefFull || (href !== 'overview' && pathname.startsWith(hrefFull));
          return (
            <Link
              key={href}
              href={hrefFull}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
