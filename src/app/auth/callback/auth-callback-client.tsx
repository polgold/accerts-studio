'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (!code) {
      router.replace('/login?error=missing_code');
      return;
    }

    const supabase = createClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: err }) => {
        if (err) {
          setError(err.message);
          return;
        }
        const nextPath = next.startsWith('/') ? next : '/';
        router.replace(nextPath);
      })
      .catch((e) => {
        setError(e?.message ?? 'Error al iniciar sesión');
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-neutral-600 mb-4">
            Si pediste el enlace en otro navegador o dispositivo, ábrelo en el mismo donde lo pediste.
          </p>
          <a href="/login" className="text-sm text-primary hover:underline">
            Volver a iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <p className="text-neutral-600">Completando inicio de sesión...</p>
    </div>
  );
}
