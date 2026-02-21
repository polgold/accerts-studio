import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/components/auth/onboarding-form';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspaces(slug)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();
  const slug = (member as { workspaces?: { slug: string } } | null)?.workspaces?.slug;
  if (slug) redirect(`/w/${slug}/dashboard`);
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Bienvenido a Accerts</h1>
          <p className="text-neutral-500 mt-1">Crea un workspace o únete a uno existente</p>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-6 border border-neutral-200">
          <OnboardingForm userId={user.id} />
        </div>
      </div>
    </div>
  );
}
