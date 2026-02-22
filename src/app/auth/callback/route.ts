import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { NextResponse, type NextRequest } from 'next/server';

const LOGIN_PATH = '/login';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const loginUrl = new URL(LOGIN_PATH, request.url);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(loginUrl);
  const supabase = createServerClientForRouteHandler(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(loginUrl);
  }

  const safeNext =
    next && next.startsWith('/') && !next.startsWith('//')
      ? next
      : null;
  const redirectUrl = safeNext
    ? new URL(safeNext, request.url)
    : loginUrl;

  return NextResponse.redirect(redirectUrl, { headers: response.headers });
}
