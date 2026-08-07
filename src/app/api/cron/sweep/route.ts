import { NextResponse, type NextRequest } from 'next/server';

/**
 * Barredor de órdenes vencidas. Lo dispara Vercel Cron (cada minuto). Cierra
 * búsquedas sin grúa y libera reservas sin pago, del lado del servidor, sin
 * depender de que el cliente tenga la pestaña abierta. Protegido por CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Falla CERRADO: sin CRON_SECRET configurado, el endpoint queda deshabilitado.
  // Antes el guard era `if (secret && ...)`, o sea que la falta de la variable lo
  // dejaba abierto a cualquiera para expirar reservas ajenas.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data, error } = await createAdminClient().rpc('sweep_expired_orders');
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, swept: data });
  } catch (err) {
    console.error('[cron/sweep]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
