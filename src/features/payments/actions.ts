'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';

const schema = z.object({ orderId: z.string().uuid() });

/**
 * Pago SIMULADO para pruebas/QA. Solo funciona cuando Mercado Pago NO está
 * configurado (entorno de demo). En cuanto se cargan credenciales de MP, esta
 * acción se desactiva y el pago real toma su lugar. Deja registro claro de que
 * fue un pago de prueba (no es un cobro real).
 */
export async function simulatePayment(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Datos inválidos' };

  // Candado: si MP está configurado, no se permite simular (se usa el pago real).
  if (serverEnv.mp().accessToken) {
    return { ok: false as const, error: 'Mercado Pago está activo: usá el pago real.' };
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
  await admin
    .from('service_orders')
    .update({ state: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id);
  await admin.from('order_events').insert({
    order_id: order.id,
    from_state: order.state,
    to_state: 'paid',
    actor_role: null,
    event: 'Pago confirmado (prueba)',
  });

  revalidatePath(`/cliente/solicitudes/${order.id}`);
  return { ok: true as const };
}
