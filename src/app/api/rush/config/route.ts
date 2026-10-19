import { NextResponse, type NextRequest } from 'next/server';
import { corsHeaders, getTicketUrl } from '@/features/rush/server';

/**
 * Configuración pública de la landing RUSH × Frankia: devuelve SOLO la URL de la
 * ticketera (es pública por naturaleza: es a donde lleva el botón). Se edita desde
 * el dashboard privado /rushfrankia.
 *
 * Caché corta en el CDN: cada visita no golpea la base, y un cambio desde el
 * dashboard se ve en la landing en menos de un minuto.
 */

const METHODS = 'GET, OPTIONS';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin'), METHODS) });
}

export async function GET(req: NextRequest) {
  const headers = {
    ...corsHeaders(req.headers.get('origin'), METHODS),
    // La caché es SOLO del CDN (no golpear la base en cada visita). El navegador no
    // guarda nada: si lo hiciera, tras un cambio seguiría usando la URL vieja.
    'Cache-Control': 'no-store',
    'CDN-Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
  };
  try {
    const ticket_url = await getTicketUrl();
    return NextResponse.json({ ticket_url }, { headers });
  } catch {
    return NextResponse.json({ ticket_url: '' }, { status: 500, headers });
  }
}
