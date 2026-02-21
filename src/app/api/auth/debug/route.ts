import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint temporal para comprobar persistencia de sesión (usar solo en desarrollo/debug).
 * Devuelve hasSession y datos de usuario leyendo cookies con el cliente SSR.
 */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Supabase env not configured', hasSession: false, userId: null, email: null },
      { status: 503 }
    );
  }
  const response = NextResponse.json({ hasSession: false, userId: null, email: null });
  const supabase = createServerClientForRouteHandler(request, response);
  const { data: { user } } = await supabase.auth.getUser();
  const body = { hasSession: !!user, userId: user?.id ?? null, email: user?.email ?? null };
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: response.headers,
  });
}
