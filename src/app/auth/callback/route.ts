import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClientForRouteHandler(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=auth&message=${encodeURIComponent(error.message)}`, request.url));
  }

  return response;
}
