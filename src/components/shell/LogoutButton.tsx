'use client';

export function LogoutButton() {
  return (
    <form action="/logout" method="post">
      <button type="submit" className="text-sm text-neutral-600 hover:text-neutral-900">
        Salir
      </button>
    </form>
  );
}
