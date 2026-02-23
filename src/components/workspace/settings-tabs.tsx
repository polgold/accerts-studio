'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: 'members', label: 'Miembros' },
  { href: 'connectors', label: 'Conectores' },
];

export function SettingsTabs({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-4 border-b border-neutral-200 mb-6">
      {tabs.map((t) => {
        const href = `${base}/${t.href}`;
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={t.href}
            href={href}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              active
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
