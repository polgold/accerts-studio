import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { acceptInvite } from '@/app/actions/workspace';
import { InviteAcceptForm } from '@/components/auth/invite-accept-form';

export default async function InvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!token) redirect('/login');
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-neutral-600">Inicia sesión para aceptar la invitación.</p>
          <a href={`/login?redirect=/invite?token=${encodeURIComponent(token)}`} className="mt-4 inline-block text-sm font-medium text-neutral-900 underline">Ir a login</a>
        </div>
      </div>
    );
  }
  const result = await acceptInvite(token);
  if (result.workspaceSlug) redirect(`/w/${result.workspaceSlug}/dashboard`);
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-soft p-6 border border-neutral-200">
        {result.error ? (
          <p className="text-red-600 text-center">{result.error}</p>
        ) : (
          <p className="text-neutral-600 text-center">Procesando...</p>
        )}
        <a href="/" className="mt-4 block text-center text-sm font-medium text-neutral-900 underline">Volver al inicio</a>
      </div>
    </div>
  );
}
