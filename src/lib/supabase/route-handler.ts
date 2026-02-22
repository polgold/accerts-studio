import { type NextRequest, type NextResponse } from 'next/server';
import { createServerClientForMiddleware } from '@/lib/supabase/middleware';

/** Cliente Supabase para Route Handlers que escriben cookies en la respuesta (auth callback, logout, debug). */
export function createServerClientForRouteHandler(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClientForMiddleware(request, response);
}
