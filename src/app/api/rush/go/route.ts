import { NextResponse } from 'next/server';
import { allowedOrigins, getTicketUrl } from '@/features/rush/server';

/**
 * Redirector del botón de preventa de la landing RUSH × Frankia.
 *
 * El botón no salta a un link guardado en la página: viene acá y redirigimos al
 * link vigente, leído de la base EN EL MOMENTO del clic y sin caché. Así un cambio
 * desde el dashboard rige al instante, aunque el visitante tenga la landing abierta
 * desde antes o haya vuelto con "atrás" (el navegador restaura la página vieja).
 */
export const dynamic = 'force-dynamic';

const NO_CACHE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
  let url = '';
  try {
    url = await getTicketUrl();
  } catch {
    url = '';
  }

  if (/^https?:\/\//i.test(url)) {
    return NextResponse.redirect(url, { status: 302, headers: NO_CACHE });
  }

  // Sin link cargado: volvemos a la landing (que avisa que todavía no está disponible).
  const landing = allowedOrigins()[0];
  if (landing) return NextResponse.redirect(landing, { status: 302, headers: NO_CACHE });
  return new NextResponse('La preventa todavía no está disponible.', {
    status: 200,
    headers: { ...NO_CACHE, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
