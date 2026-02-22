import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Crea un cliente Supabase para middleware/route handlers que lee cookies del request
 * y escribe en el response para que la sesión persista (SSR cookie bridge).
 */
export function createServerClient(
  request: NextRequest,
  response: NextResponse
) {
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Record<string, unknown>)
          );
        },
      },
    }
  );
}

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/invite'];
const SHARED_LINK_PREFIX = '/s/';

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => p === pathname)) return true;
  if (pathname.startsWith(SHARED_LINK_PREFIX)) return true;
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  return false;
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/w/') || pathname === '/onboarding' || pathname === '/public-docs';
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(request, response);
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
