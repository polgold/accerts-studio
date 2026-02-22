import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Con solo cookieOptions, @supabase/ssr 0.1.0 deja cookies undefined y luego hace cookies.set() → error.
      // Pasamos cookies: {} para que use document.cookie con las opciones debajo.
      cookies: {},
      cookieOptions: { path: '/' },
    }
  );
}
