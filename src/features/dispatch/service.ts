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
    .select('id, state, offer_deadline, origin_lat, origin_lng')
    .eq('id', orderId)
    .single();
  if (!order || order.state !== 'searching_provider') return { offers: 0 };

  // Grúas aprobadas y disponibles. Traemos su última ubicación por si el radio
  // está activo.
  const { data: allProviders } = await admin
    .from('provider_accounts')
    .select('id, owner_id, last_lat, last_lng')
    .eq('status', 'approved')
    .eq('is_available', true)
    .is('deleted_at', null);

  // Excluimos los rechazados por el cliente ("buscar otro"). Pero si al excluir no
  // queda ninguno, ofrecemos a todos igual (mejor que dejarlo sin grúa).
  let providers = (allProviders ?? []).filter((p) => !exclude.includes(p.id));
  if (providers.length === 0) providers = allProviders ?? [];

  // Filtro por radio, solo si el admin lo activó. Red de seguridad: si al filtrar
  // por distancia no queda ninguna grúa (todas lejos o sin ubicación cargada),
  // ofrecemos a todas igual — mejor eso que dejar al cliente sin grúa.
  if (settings.radio_busqueda_activo && order.origin_lat != null && order.origin_lng != null) {
    const { haversineMeters } = await import('@/lib/geo/distance');
    const radioM = (settings.radio_busqueda_km ?? 25) * 1000;
    const cerca = providers.filter(
      (p) =>
        p.last_lat != null &&
        p.last_lng != null &&
        haversineMeters(
          { lat: order.origin_lat as number, lng: order.origin_lng as number },
          { lat: p.last_lat, lng: p.last_lng },
        ) <= radioM,
    );
    if (cerca.length > 0) providers = cerca;
  }

  if (!providers || providers.length === 0) {
    // Nadie disponible: no se cobra y se informa. Verificamos que el estado haya
    // cambiado de verdad; si no, la orden se quedaría "buscando" para siempre.
    const { data: cerrada } = await admin
      .from('service_orders')
      .update({ state: 'no_provider' })
      .eq('id', orderId)
      .eq('state', 'searching_provider')
      .select('id');
    if (cerrada && cerrada.length > 0) {
      await admin.from('order_events').insert({
        order_id: orderId,
        from_state: 'searching_provider',
        to_state: 'no_provider',
        actor_role: null,
        event: 'Sin grúas disponibles',
      });
    }
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
  // UPSERT, no INSERT. `provider_offers` tiene unique (order_id, provider_id) y
  // `rejectAndResearch` marca las viejas como 'expired' sin borrarlas: al re-ofertar
  // el mismo pedido, el INSERT chocaba con esas filas y —al ser un único INSERT de
  // varias filas— fallaba ENTERO. Resultado: "Buscar otra grúa" no creaba ninguna
  // oferta, los grueros recibían el push y su panel estaba vacío, y el cliente
  // esperaba la ventana completa para que le dijeran que no había grúas.
  const { data: creadas, error: errOfertas } = await admin
    .from('provider_offers')
    .upsert(rows, { onConflict: 'order_id,provider_id' })
    .select('id');
  if (errOfertas || !creadas || creadas.length === 0) {
    // Sin ofertas no hay a quién avisarle: no mandamos push prometiendo un pedido
    // que nadie va a poder tomar.
    await admin.from('order_events').insert({
      order_id: orderId,
      actor_role: null,
      event: `No se pudieron crear las ofertas: ${errOfertas?.message ?? 'sin filas'}`,
    });
    return { offers: 0 };
  }

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
