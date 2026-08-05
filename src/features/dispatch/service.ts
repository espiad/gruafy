import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlatformSettings } from '@/features/pricing/settings';

/**
 * Despacho por difusión (broadcast).
 *
 * El pedido se ofrece a TODOS los proveedores aprobados y disponibles al mismo
 * tiempo, con una ventana común (por defecto 2 minutos). El primero que acepta se
 * lo lleva; la aceptación es atómica (RPC `accept_offer` con bloqueo), así que aunque
 * varios toquen "Aceptar" a la vez, solo uno reserva la orden y el resto ve que ya
 * fue tomada. No se usa cercanía: para el volumen actual, que todos tengan la chance
 * es más justo y efectivo que rankear por distancia.
 */
export async function dispatchOrder(orderId: string, exclude: string[] = []): Promise<{ offers: number }> {
  const admin = createAdminClient();
  const settings = await getPlatformSettings();

  const { data: order } = await admin
    .from('service_orders')
    .select('id, state, offer_deadline')
    .eq('id', orderId)
    .single();
  if (!order || order.state !== 'searching_provider') return { offers: 0 };

  // Todos los proveedores aprobados y disponibles (sin filtro de distancia).
  const { data: allProviders } = await admin
    .from('provider_accounts')
    .select('id, owner_id')
    .eq('status', 'approved')
    .eq('is_available', true)
    .is('deleted_at', null);

  // Excluimos los rechazados por el cliente ("buscar otro"). Pero si al excluir no
  // queda ninguno, ofrecemos a todos igual (mejor que dejarlo sin grúa).
  let providers = (allProviders ?? []).filter((p) => !exclude.includes(p.id));
  if (providers.length === 0) providers = allProviders ?? [];

  if (!providers || providers.length === 0) {
    // Nadie disponible: no se cobra y se informa.
    await admin.from('service_orders').update({ state: 'no_provider' }).eq('id', orderId);
    await admin.from('order_events').insert({
      order_id: orderId,
      from_state: 'searching_provider',
      to_state: 'no_provider',
      actor_role: null,
      event: 'Sin grúas disponibles',
    });
    return { offers: 0 };
  }

  // Ventana común de aceptación (misma expiración para todos).
  const expiresAt =
    order.offer_deadline ??
    new Date(Date.now() + settings.oferta_proveedor_segundos * 1000).toISOString();

  const rows = providers.map((p, i) => ({
    order_id: orderId,
    provider_id: p.id,
    rank: i,
    expires_at: expiresAt,
    status: 'pending' as const,
  }));
  await admin.from('provider_offers').insert(rows);

  // Notifica a todos los dueños (por usuario, no por cuenta).
  const ownerIds = providers.map((p) => p.owner_id).filter(Boolean) as string[];
  await admin.from('notifications').insert(
    ownerIds.map((id) => ({
      user_id: id,
      type: 'new_offer',
      title: 'Nuevo pedido disponible',
      body: 'Tenés 2 minutos para aceptar un servicio.',
      link: '/proveedor',
    })),
  );

  // Push a los grueros: entró un pedido nuevo (aunque tengan la app cerrada).
  try {
    const { sendPushToUser } = await import('@/lib/push/send');
    await Promise.all(
      ownerIds.map((id) =>
        sendPushToUser(id, { title: '🚗 Nuevo pedido en gruafy', body: 'Tenés 2 minutos para aceptarlo.', url: '/proveedor' }),
      ),
    );
  } catch {
    /* best-effort */
  }

  return { offers: rows.length };
}
