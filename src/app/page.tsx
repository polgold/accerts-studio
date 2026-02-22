import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (user) {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspaces(slug)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();
    const slug = (member as { workspaces?: { slug: string } } | null)?.workspaces?.slug;
    if (slug) redirect(`/w/${slug}/projects`);
    redirect('/onboarding');
  }
  redirect('/login');
}
