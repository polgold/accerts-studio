import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/logout'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * Crea cliente Supabase en middleware (req/res). Solo para uso interno en updateSession
 * y en Route Handlers que deban escribir cookies en una respuesta concreta.
 */
export function createServerClientForMiddleware(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
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

/**
 * Refresca sesión (getUser) y protege /w/*: sin user redirige a /login?next=<path>.
 * Rutas públicas (no redirige): /login, /auth/callback, /logout.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClientForMiddleware(request, response);
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return response;
  }
  if (pathname.startsWith('/w/') && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
