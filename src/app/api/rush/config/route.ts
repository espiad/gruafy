import { NextResponse, type NextRequest } from 'next/server';
import { corsHeaders, getTicketUrl } from '@/features/rush/server';

/**
 * Configuración pública de la landing RUSH × Frankia.
 *
 * No expone el link real de la ticketera: si hay uno cargado, devuelve la dirección
 * del redirector /api/rush/go, que resuelve el link vigente en el momento del clic.
 * Así un cambio desde el dashboard rige al instante aunque la landing esté abierta
 * desde antes. `active` indica si el botón tiene que llevar a la preventa.
 *
 * Caché solo en el CDN (20s) para no golpear la base en cada visita; el navegador
 * no guarda nada.
 */

const METHODS = 'GET, OPTIONS';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin'), METHODS) });
}

export async function GET(req: NextRequest) {
  const headers = {
    ...corsHeaders(req.headers.get('origin'), METHODS),
    'Cache-Control': 'no-store',
    'CDN-Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
  };
  try {
    const active = /^https?:\/\//i.test(await getTicketUrl());
    const go = new URL('/api/rush/go', req.url).toString();
    // `ticket_url` se mantiene por compatibilidad con la primera versión del script.
    return NextResponse.json({ active, ticket_url: active ? go : '' }, { headers });
  } catch {
    return NextResponse.json({ active: false, ticket_url: '' }, { status: 500, headers });
  }
}
