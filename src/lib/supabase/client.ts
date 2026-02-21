import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Necesario para que el code_verifier (OAuth/Google) esté disponible en /auth/callback
      cookieOptions: { path: '/' },
    }
  );
}
