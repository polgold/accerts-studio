import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl);
  const supabase = createServerClientForRouteHandler(request, response);
  await supabase.auth.signOut();
  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
