import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createUpfrontPreference } from '@/features/payments/service';

const bodySchema = z.object({ orderId: z.string().uuid() });

/**
 * Crea la preferencia de Mercado Pago para el anticipo de una orden del cliente
 * autenticado. La preferencia se crea SOLO desde el servidor.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  // La orden debe pertenecer al cliente autenticado (RLS ya lo restringe al leer).
  const { data: order } = await supabase
    .from('service_orders')
    .select('id, client_id, state')
    .eq('id', parsed.data.orderId)
    .single();
  if (!order || order.client_id !== user.id) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  try {
    const pref = await createUpfrontPreference(parsed.data.orderId);
    return NextResponse.json(pref);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creando la preferencia';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
