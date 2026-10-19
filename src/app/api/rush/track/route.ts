import { NextResponse, type NextRequest } from 'next/server';
import { RUSH_EVENTS, corsHeaders, originAllowed, rushDb, type RushEvent } from '@/features/rush/server';

/**
 * Ingesta pública de eventos de la landing RUSH × Frankia (Netlify).
 * Recibe { t: tipo, v: id anónimo del visitante }. Sin IP ni datos personales.
 *
 * Protecciones: solo tipos permitidos, id con formato válido, cuerpo chico, origen
 * restringido al dominio de la landing (RUSH_LANDING_ORIGIN) y descarte de
 * duplicados idénticos en una ventana corta.
 */

const MAX_BODY = 512;
const DEDUP_MS = 2000;
const METHODS = 'POST, OPTIONS';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin'), METHODS) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin, METHODS);

  if (!originAllowed(origin)) {
    return new NextResponse(null, { status: 403, headers });
  }

  // Llega como text/plain (request "simple": sin preflight, ideal para sendBeacon).
  const raw = await req.text();
  if (!raw || raw.length > MAX_BODY) return new NextResponse(null, { status: 400, headers });

  let body: { t?: unknown; v?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400, headers });
  }

  const t = body.t;
  const v = body.v;
  if (typeof t !== 'string' || !RUSH_EVENTS.includes(t as RushEvent)) {
    return new NextResponse(null, { status: 400, headers });
  }
  if (typeof v !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(v)) {
    return new NextResponse(null, { status: 400, headers });
  }

  try {
    const db = rushDb();
    // Duplicado idéntico (mismo visitante, mismo evento) en los últimos 2s: es un
    // doble disparo o un doble toque, no una acción nueva.
    const { data: reciente } = await db
      .from('rush_events')
      .select('id')
      .eq('visitor_id', v)
      .eq('event_type', t)
      .gte('created_at', new Date(Date.now() - DEDUP_MS).toISOString())
      .limit(1);

    if (!reciente || reciente.length === 0) {
      await db.from('rush_events').insert({ event_type: t, visitor_id: v });
    }
  } catch {
    // La landing no espera respuesta: nunca devolvemos el detalle del error.
    return new NextResponse(null, { status: 500, headers });
  }

  return new NextResponse(null, { status: 204, headers });
}
