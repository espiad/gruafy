'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  orderId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

/**
 * El cliente califica el servicio finalizado. Actualiza el promedio del proveedor
 * de forma transaccional simple (recalcula desde las reseñas existentes).
 */
export async function submitReview(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Datos inválidos' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'No autenticado' };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, client_id, provider_id, state')
    .eq('id', parsed.data.orderId)
    .single();
  if (!order || order.client_id !== user.id) return { ok: false as const, error: 'Orden no encontrada' };
  if (order.state !== 'completed') return { ok: false as const, error: 'Solo podés calificar servicios finalizados' };

  const { error } = await supabase.from('reviews').insert({
    order_id: order.id,
    author_id: user.id,
    target_provider_id: order.provider_id,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: false as const, error: 'Ya dejaste una reseña' };
    return { ok: false as const, error: 'No pudimos guardar la reseña' };
  }

  // Recalcular rating del proveedor con service role (el autor no es el dueño).
  if (order.provider_id) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('target_provider_id', order.provider_id);
    const list = reviews ?? [];
    const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      await createAdminClient()
        .from('provider_accounts')
        .update({ rating_avg: Math.round(avg * 100) / 100, rating_count: list.length })
        .eq('id', order.provider_id);
    } catch {
      /* si no hay service role, la reseña igual se guardó */
    }
  }

  revalidatePath(`/cliente/solicitudes/${order.id}`);
  return { ok: true as const };
}
