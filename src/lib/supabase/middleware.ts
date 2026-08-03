import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv, hasSupabaseConfig } from '@/lib/env';

/**
 * Refresca la sesión de Supabase en cada request y protege las áreas privadas.
 * Si Supabase no está configurado, deja pasar (la app pública sigue funcionando).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabaseConfig) return response;

  const supabase = createServerClient(publicEnv.supabaseUrl!, publicEnv.supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPrivate =
    path.startsWith('/cliente') || path.startsWith('/proveedor') || path.startsWith('/admin');

  if (isPrivate && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/ingresar';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return response;
}
