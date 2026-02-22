import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; error_description?: string };
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  const { next, error: urlError, error_description } = searchParams;
  if (user) redirect(next && next.startsWith('/') ? next : '/');
  const isLinkExpiredOrInvalid =
    urlError === 'access_denied' ||
    (typeof error_description === 'string' && (error_description.includes('Expired') || error_description.includes('invalid')));
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <Image
            src="/brand/accerts-logo.png"
            alt="Accerts"
            width={180}
            height={60}
            className="w-[180px] h-auto object-contain"
            priority
          />
          <h1 className="text-2xl font-semibold text-[var(--heading-color)] tracking-tight mt-6">Accerts Productions</h1>
          <p className="text-[var(--muted)] mt-1">Inicia sesión en tu cuenta</p>
        </div>
        {isLinkExpiredOrInvalid && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm text-center">
            El enlace expiró o ya fue usado. Pedí uno nuevo abajo (el enlace vale 1 hora).
          </div>
        )}
        <div className="bg-[var(--card-bg)] rounded-xl shadow-soft p-6 border border-[var(--border)]">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
