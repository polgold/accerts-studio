import { createServerClient } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const loginUrl = new URL('/login', request.url);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(loginUrl);
  const supabase = createServerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    loginUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(loginUrl);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(loginUrl);
  }

  let redirectUrl: URL;
  if (next && next.startsWith('/')) {
    redirectUrl = new URL(next, request.url);
  } else {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspaces(slug)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();
    const slug = (member as { workspaces?: { slug: string } } | null)?.workspaces?.slug;
    if (slug) {
      redirectUrl = new URL(`/w/${slug}/projects`, request.url);
    } else {
      redirectUrl = new URL('/onboarding', request.url);
    }
  }

  return NextResponse.redirect(redirectUrl, { headers: response.headers });
}
