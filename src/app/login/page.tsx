import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; error_description?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { next, error: urlError, error_description } = searchParams;
  if (user) redirect(next && next.startsWith('/') ? next : '/');
  const isLinkExpiredOrInvalid =
    urlError === 'access_denied' ||
    (typeof error_description === 'string' && (error_description.includes('Expired') || error_description.includes('invalid')));
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Accerts Productions</h1>
          <p className="text-neutral-500 mt-1">Inicia sesión en tu cuenta</p>
        </div>
        {isLinkExpiredOrInvalid && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm text-center">
            El enlace expiró o ya fue usado. Pedí uno nuevo abajo (el enlace vale 1 hora).
          </div>
        )}
        <div className="bg-white rounded-xl shadow-soft p-6 border border-neutral-200">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
