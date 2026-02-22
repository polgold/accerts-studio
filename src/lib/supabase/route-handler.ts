import { type NextRequest, type NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/middleware';

/** Cliente Supabase para Route Handlers (misma cookie bridge que middleware). */
export function createServerClientForRouteHandler(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(request, response);
}
