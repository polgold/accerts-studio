import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/invite'];
const SHARED_LINK_PREFIX = '/s/';

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => p === pathname)) return true;
  if (pathname.startsWith(SHARED_LINK_PREFIX)) return true;
  if (pathname.startsWith('/api/')) return true;
  return false;
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/w/') || pathname === '/onboarding';
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClientForRouteHandler(request, response);
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
