import { createServerClient } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  const supabase = createServerClient(request, response);
  await supabase.auth.signOut();
  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
