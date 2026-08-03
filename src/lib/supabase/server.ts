import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Cliente de Supabase para Server Components, Route Handlers y Server Actions.
 * Lee/escribe la sesión mediante cookies SSR seguras (HttpOnly).
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl!, publicEnv.supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Invocado desde un Server Component: el middleware refresca la sesión.
        }
      },
    },
  });
}
