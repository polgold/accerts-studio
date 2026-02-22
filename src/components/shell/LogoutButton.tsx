'use client';

export function LogoutButton() {
  return (
    <form action="/logout" method="post">
      <button type="submit" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        Salir
      </button>
    </form>
  );
}
