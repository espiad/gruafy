'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { pagoSimuladoHabilitado } from '@/features/pricing/settings';

const schema = z.object({ orderId: z.string().uuid() });

/**
 * Pago SIMULADO para pruebas/QA y para la demo. Habilitado en modo `test`
 * (aunque Mercado Pago esté configurado, para no depender de MP en vivo durante
 * una presentación) y BLOQUEADO en producción, donde solo vale el pago real.
 * Deja registro claro de que fue un pago de prueba (no es un cobro real).
 */
export async function simulatePayment(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Datos inválidos' };

  // Candado del lado del servidor: ocultar el botón no alcanza, porque una server
  // action se puede invocar igual. Si el admin lo apagó, acá se rechaza.
  if (!(await pagoSimuladoHabilitado())) {
    return { ok: false as const, error: 'El pago simulado está desactivado: usá Mercado Pago.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'No autenticado' };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, client_id, state, amount_upfront')
    .eq('id', parsed.data.orderId)
    .single();
  if (!order || order.client_id !== user.id) return { ok: false as const, error: 'Orden no encontrada' };
  if (order.state !== 'awaiting_payment' && order.state !== 'payment_pending') {
    return { ok: false as const, error: 'La orden no está esperando pago' };
  }

  // Escrituras con service role (pagos/eventos son gestionados por servidor).
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  await admin.from('payments').insert({
    order_id: order.id,
    type: 'gruafy_upfront',
    external_reference: order.id,
    amount: order.amount_upfront ?? 0,
    status: 'approved',
    live_mode: false,
    normalized: { simulated: true, note: 'Pago de prueba (Mercado Pago no configurado)' },
  });
  const { data: updated } = await admin
    .from('service_orders')
    .update({ state: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id)
    .in('state', ['awaiting_payment', 'payment_pending'])
    .select('id');
  if (updated && updated.length > 0) {
    await admin.from('order_events').insert({
      order_id: order.id,
      from_state: order.state,
      to_state: 'paid',
      actor_role: null,
      event: 'Pago confirmado (prueba)',
    });
  }

  revalidatePath(`/cliente/solicitudes/${order.id}`);
  return { ok: true as const };
}
