import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/');
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Accerts Productions</h1>
          <p className="text-neutral-500 mt-1">Inicia sesión en tu cuenta</p>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-6 border border-neutral-200">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
