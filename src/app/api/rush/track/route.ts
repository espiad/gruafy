import { NextResponse, type NextRequest } from 'next/server';
import { RUSH_EVENTS, rushDb, type RushEvent } from '@/features/rush/server';

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

function allowedOrigins(): string[] {
  return (process.env.RUSH_LANDING_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigins();
  // Sin configurar, se acepta cualquier origen (útil para probar). En producción
  // conviene setear RUSH_LANDING_ORIGIN con el dominio de Netlify.
  const allow = allowed.length === 0 ? '*' : origin && allowed.includes(origin) ? origin : allowed[0]!;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  const allowed = allowedOrigins();

  if (allowed.length > 0 && (!origin || !allowed.includes(origin))) {
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
