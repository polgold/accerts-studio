import { LogoutButton } from './LogoutButton';

export function Topbar() {
  return (
    <header className="flex items-center justify-end h-12 px-4 border-b border-[var(--border)] bg-[var(--topbar-bg)] shrink-0">
      <LogoutButton />
    </header>
  );
}
