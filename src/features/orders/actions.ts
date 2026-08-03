'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings, toPricingSettings } from '@/features/pricing/settings';
import { quote } from '@/features/pricing/pricing';
import { createOrderSchema, type CreateOrderInput } from './schema';

interface ActionResult {
  ok: boolean;
  error?: string;
  orderId?: string;
}

/**
 * Crea una orden a partir del presupuesto confirmado por el cliente.
 * Congela el snapshot económico y el importe del anticipo, luego pasa la orden a
 * `searching_provider`. El despacho de ofertas se dispara aparte.
 */
export async function createOrder(input: CreateOrderInput): Promise<ActionResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const settings = await getPlatformSettings();
  const breakdown = quote(
    { distanceMeters: data.distance_meters, dollys: data.dollys },
    toPricingSettings(settings),
  );

  // Vehículo: usa el existente o crea uno nuevo del cliente (máximo 3 por cuenta).
  let vehicleId = data.vehicle_id ?? null;
  if (!vehicleId && data.vehicle) {
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', user.id)
      .is('deleted_at', null);
    if ((count ?? 0) >= 3) {
      return { ok: false, error: 'Llegaste al máximo de 3 vehículos. Borrá uno para agregar otro.' };
    }
    const { data: v, error: vErr } = await supabase
      .from('vehicles')
      .insert({
        client_id: user.id,
        brand: data.vehicle.brand,
        model: data.vehicle.model,
        year: data.vehicle.year ?? null,
        patente: data.vehicle.patente,
        gearbox: data.vehicle.gearbox,
        gearbox_locked: data.vehicle.gearbox_locked ?? null,
        has_keys: data.vehicle.has_keys ?? null,
        color: data.vehicle.color ?? null,
      })
      .select('id')
      .single();
    if (vErr) return { ok: false, error: 'No pudimos guardar el vehículo' };
    vehicleId = v.id;
  }

  const { data: order, error } = await supabase
    .from('service_orders')
    .insert({
      client_id: user.id,
      vehicle_id: vehicleId,
      origin_address: data.origin.address,
      origin_lat: data.origin.lat,
      origin_lng: data.origin.lng,
      dest_address: data.dest.address,
      dest_lat: data.dest.lat,
      dest_lng: data.dest.lng,
      dollys: data.dollys,
      wheels_blocked: data.wheels_blocked,
      conditions: data.conditions,
      distance_meters: data.distance_meters,
      duration_seconds: data.duration_seconds,
      pricing: breakdown as unknown as import('@/types/database').Json,
      amount_upfront: breakdown.pago_inicial_cliente,
      state: 'searching_provider',
      searching_at: new Date().toISOString(),
      offer_deadline: new Date(Date.now() + settings.oferta_proveedor_segundos * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (error || !order) return { ok: false, error: 'No pudimos crear la solicitud' };

  await supabase.from('order_events').insert({
    order_id: order.id,
    from_state: 'quoted',
    to_state: 'searching_provider',
    actor_role: 'client',
    event: 'Búsqueda de grúa iniciada',
  });

  // Despacho de ofertas a proveedores cercanos (usa service role, salta RLS de forma controlada).
  try {
    const { dispatchOrder } = await import('@/features/dispatch/service');
    await dispatchOrder(order.id);
  } catch {
    // Si el despacho falla (p. ej. sin service role en dev), la orden queda en
    // búsqueda y el admin puede asignar manualmente. No rompemos el flujo del cliente.
  }

  revalidatePath('/cliente');
  return { ok: true, orderId: order.id };
}

/** Cancela una orden del cliente (solo en estados cancelables). */
export async function cancelOrderByClient(orderId: string, reason?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('service_orders')
    .select('id, state, client_id')
    .eq('id', orderId)
    .single();
  if (!order) return { ok: false, error: 'Orden no encontrada' };

  const cancelable = ['searching_provider', 'provider_reserved', 'awaiting_payment'];
  if (!cancelable.includes(order.state)) {
    return { ok: false, error: 'La solicitud ya no se puede cancelar' };
  }

  await supabase
    .from('service_orders')
    .update({ state: 'cancelled_by_client', cancellation_reason: reason ?? 'Cancelada por el cliente' })
    .eq('id', orderId);
  await supabase.from('order_events').insert({
    order_id: orderId,
    from_state: order.state,
    to_state: 'cancelled_by_client',
    actor_role: 'client',
    event: 'Cancelada por el cliente',
  });
  revalidatePath(`/cliente/solicitudes/${orderId}`);
  return { ok: true, orderId };
}

/**
 * Cierra la búsqueda si venció la ventana de oferta sin que nadie aceptara.
 * La llama el cliente desde su pantalla cuando el countdown llega a cero.
 * Idempotente y con guard: si ya la tomó una grúa, no la pisa.
 */
export async function resolveSearchTimeout(orderId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, state, offer_deadline, client_id')
    .eq('id', orderId)
    .single();
  if (!order || order.client_id !== user.id) return { ok: false, error: 'Orden no encontrada' };
  if (order.state !== 'searching_provider') return { ok: true, orderId }; // ya avanzó
  if (order.offer_deadline && new Date(order.offer_deadline) > new Date()) {
    return { ok: false, error: 'Todavía hay tiempo' };
  }

  // Solo pasa a no_provider si sigue en búsqueda (evita pisar una aceptación al límite).
  await supabase
    .from('service_orders')
    .update({ state: 'no_provider' })
    .eq('id', orderId)
    .eq('state', 'searching_provider');
  await supabase.from('order_events').insert({
    order_id: orderId,
    from_state: 'searching_provider',
    to_state: 'no_provider',
    actor_role: 'client',
    event: 'Sin grúas disponibles',
  });
  revalidatePath(`/cliente/solicitudes/${orderId}`);
  return { ok: true, orderId };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
