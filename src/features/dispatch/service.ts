import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { haversineMeters } from '@/lib/geo/distance';
import { getPlatformSettings } from '@/features/pricing/settings';

/**
 * Despacho de una orden: busca proveedores aprobados, disponibles y con ubicación
 * reciente dentro del radio, los ordena por cercanía al punto A y genera ofertas
 * secuenciales. Cada oferta vence de forma escalonada (rank * segundos_por_oferta),
 * de modo que se ofrece "de a uno" respetando el orden de cercanía.
 *
 * La aceptación es atómica vía el RPC `accept_offer` (bloqueo + constraint), así que
 * aunque varias ventanas se solapen, solo un proveedor puede reservar la orden.
 */
export async function dispatchOrder(orderId: string): Promise<{ offers: number }> {
  const admin = createAdminClient();
  const settings = await getPlatformSettings();

  const { data: order } = await admin
    .from('service_orders')
    .select('id, origin_lat, origin_lng, state')
    .eq('id', orderId)
    .single();
  if (!order || order.state !== 'searching_provider') return { offers: 0 };
  if (order.origin_lat == null || order.origin_lng == null) return { offers: 0 };

  // Ubicación considerada "reciente": última hora.
  const freshSince = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: providers } = await admin
    .from('provider_accounts')
    .select('id, last_lat, last_lng, last_location_at')
    .eq('status', 'approved')
    .eq('is_available', true)
    .is('deleted_at', null)
    .gte('last_location_at', freshSince);

  const origin = { lat: order.origin_lat, lng: order.origin_lng };
  const radiusM = settings.radio_busqueda_km * 1000;
  const offerSecs = settings.oferta_proveedor_segundos;

  const ranked = (providers ?? [])
    .filter((p) => p.last_lat != null && p.last_lng != null)
    .map((p) => ({ id: p.id, dist: haversineMeters(origin, { lat: p.last_lat!, lng: p.last_lng! }) }))
    .filter((p) => p.dist <= radiusM)
    .sort((a, b) => a.dist - b.dist);

  if (ranked.length === 0) {
    // Sin proveedores: no se cobra. La orden pasa a no_provider.
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

  const now = Date.now();
  const rows = ranked.map((p, i) => ({
    order_id: orderId,
    provider_id: p.id,
    rank: i,
    // Ventana escalonada: el rank i se ofrece de i*offerSecs a (i+1)*offerSecs.
    expires_at: new Date(now + (i + 1) * offerSecs * 1000).toISOString(),
    status: 'pending' as const,
  }));
  await admin.from('provider_offers').insert(rows);

  // Notificación al primer proveedor de la fila (al usuario DUEÑO, no a la cuenta).
  const { data: owner } = await admin
    .from('provider_accounts')
    .select('owner_id')
    .eq('id', ranked[0]!.id)
    .single();
  if (owner?.owner_id) {
    await admin.from('notifications').insert({
      user_id: owner.owner_id,
      type: 'new_offer',
      title: 'Nuevo pedido cerca tuyo',
      body: 'Tenés un servicio para aceptar.',
      link: '/proveedor',
    });
  }

  return { offers: rows.length };
}

/**
 * ¿Está la oferta de este proveedor "activa" ahora? (dentro de su ventana por rank
 * y con la orden todavía en búsqueda). Se usa para pintar el pedido accionable.
 */
export function isOfferActive(rank: number, createdAt: string, offerSecs: number): boolean {
  const start = new Date(createdAt).getTime();
  const now = Date.now();
  const from = start + rank * offerSecs * 1000;
  const to = start + (rank + 1) * offerSecs * 1000;
  return now >= from && now < to;
}
