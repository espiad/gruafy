import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // `rushfrankia` y `api/rush` (analíticas de RUSH × Frankia, ajenas a gruafy) quedan
  // fuera: no usan la auth de gruafy y así la ingesta de eventos no paga una
  // llamada a Supabase Auth en cada visita.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|rushfrankia|api/rush|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
