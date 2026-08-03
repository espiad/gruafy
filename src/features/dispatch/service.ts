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
export async function dispatchOrder(orderId: string): Promise<{ offers: number }> {
  const admin = createAdminClient();
  const settings = await getPlatformSettings();

  const { data: order } = await admin
    .from('service_orders')
    .select('id, state, offer_deadline')
    .eq('id', orderId)
    .single();
  if (!order || order.state !== 'searching_provider') return { offers: 0 };

  // Todos los proveedores aprobados y disponibles (sin filtro de distancia).
  const { data: providers } = await admin
    .from('provider_accounts')
    .select('id, owner_id')
    .eq('status', 'approved')
    .eq('is_available', true)
    .is('deleted_at', null);

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
  await admin.from('notifications').insert(
    providers
      .filter((p) => p.owner_id)
      .map((p) => ({
        user_id: p.owner_id as string,
        type: 'new_offer',
        title: 'Nuevo pedido disponible',
        body: 'Tenés 2 minutos para aceptar un servicio.',
        link: '/proveedor',
      })),
  );

  return { offers: rows.length };
}
