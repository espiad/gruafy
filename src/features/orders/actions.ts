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

  // Una moto tiene dos ruedas. El wizard ya limita el selector, pero la validación
  // real va acá: de lo contrario se puede mandar 4 por la API y cotizar dos dollys
  // sobre un vehículo que solo puede necesitar uno.
  if (data.conditions?.vehicle_type === 'moto' && (data.wheels_blocked ?? 0) > 2) {
    return { ok: false, error: 'Una moto tiene 2 ruedas: revisá cuántas no giran.' };
  }

  // Un cliente no puede tener dos auxilios en curso a la vez (evita duplicar el
  // pedido por doble toque / dos pestañas, y con eso doble grúa y doble cobro).
  const ACTIVE_STATES: import('@/types/database').OrderStateDb[] = [
    'searching_provider', 'provider_reserved', 'awaiting_payment', 'payment_pending',
    'paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending',
  ];
  const { data: enCurso } = await supabase
    .from('service_orders')
    .select('id')
    .eq('client_id', user.id)
    .in('state', ACTIVE_STATES)
    .limit(1);
  if (enCurso && enCurso.length > 0) {
    return { ok: false, error: 'Ya tenés un auxilio en curso. Abrilo desde Inicio o cancelalo antes de pedir otro.', orderId: enCurso[0]!.id };
  }

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

  // NO despachamos acá: primero el cliente sube la foto de la situación y recién
  // después llamamos a `startSearch`, así los grueros ya ven la foto en la oferta.
  revalidatePath('/cliente');
  return { ok: true, orderId: order.id };
}

/**
 * Dispara el despacho de ofertas a los grueros. Se llama DESPUÉS de subir la foto
 * de la situación para que la oferta ya la incluya. Verifica propiedad y estado.
 */
export async function startSearch(orderId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const { data: order } = await supabase
    .from('service_orders')
    .select('id, client_id, state')
    .eq('id', orderId)
    .single();
  if (!order || order.client_id !== user.id) return { ok: false, error: 'Orden no encontrada' };
  if (order.state !== 'searching_provider') return { ok: true, orderId }; // ya despachada o avanzó

  try {
    const { dispatchOrder } = await import('@/features/dispatch/service');
    await dispatchOrder(orderId);
  } catch {
    // Si el despacho falla, la orden queda en búsqueda y el admin puede asignar.
  }
  return { ok: true, orderId };
}

/** Cancela una orden del cliente (solo en estados cancelables). */
export async function cancelOrderByClient(orderId: string, reason?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, state, client_id')
    .eq('id', orderId)
    .single();
  if (!order || order.client_id !== user.id) return { ok: false, error: 'Orden no encontrada' };

  const cancelable = ['searching_provider', 'provider_reserved', 'awaiting_payment'];
  if (!cancelable.includes(order.state)) {
    return { ok: false, error: 'La solicitud ya no se puede cancelar' };
  }

  // Update guardado por estado: si en la carrera la orden avanzó (p. ej. pasó a
  // paid), no la pisamos. Solo registramos el evento si realmente cancelamos.
  const { data: updated } = await supabase
    .from('service_orders')
    .update({ state: 'cancelled_by_client', cancellation_reason: reason ?? 'Cancelada por el cliente' })
    .eq('id', orderId)
    .eq('state', order.state)
    .select('id');
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'La solicitud cambió de estado. Actualizá la pantalla.' };
  }
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
  const { data: closed } = await supabase
    .from('service_orders')
    .update({ state: 'no_provider' })
    .eq('id', orderId)
    .eq('state', 'searching_provider')
    .select('id');
  // Solo registramos el evento si de verdad cerramos la búsqueda (no si una grúa
  // aceptó en el mismo instante y la orden ya avanzó).
  if (closed && closed.length > 0) {
    await supabase.from('order_events').insert({
      order_id: orderId,
      from_state: 'searching_provider',
      to_state: 'no_provider',
      actor_role: 'client',
      event: 'Sin grúas disponibles',
    });
  }
  revalidatePath(`/cliente/solicitudes/${orderId}`);
  return { ok: true, orderId };
}

/**
 * Sube la foto de la situación (auxilio) de una orden del cliente. La imagen ya
 * viene comprimida del navegador y sacada con la cámara en el momento. Se guarda
 * con service role (el bucket está scopeado a proveedores) y se registra el path
 * en `conditions.situation_photo_path` para que el gruero la vea antes de aceptar.
 */
export async function uploadSituationPhoto(orderId: string, formData: FormData): Promise<ActionResult> {
  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Foto inválida' };
  if (file.size > 3 * 1024 * 1024) return { ok: false, error: 'La foto es muy pesada' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, client_id, conditions')
    .eq('id', orderId)
    .single();
  if (!order || order.client_id !== user.id) return { ok: false, error: 'Orden no encontrada' };

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const path = `orders/${orderId}/situacion-${Date.now()}.jpg`;
  const { error: upErr } = await admin.storage.from('documents').upload(path, file, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upErr) return { ok: false, error: 'No pudimos subir la foto' };

  const conditions = { ...((order.conditions as Record<string, unknown>) ?? {}), situation_photo_path: path };
  await admin
    .from('service_orders')
    .update({ conditions: conditions as import('@/types/database').Json })
    .eq('id', orderId);
  return { ok: true, orderId };
}

/**
 * El cliente rechaza a la grúa que aceptó (p. ej. por reputación baja) y vuelve a
 * buscar EXCLUYENDO a ese proveedor. Si al excluirlo no queda ninguno disponible,
 * el despacho igual se lo vuelve a ofrecer (mejor que quedarse sin grúa). Solo
 * válido antes de pagar (awaiting_payment).
 */
export async function rejectAndResearch(orderId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, client_id, state, provider_id, conditions')
    .eq('id', orderId)
    .single();
  if (!order || order.client_id !== user.id) return { ok: false, error: 'Orden no encontrada' };
  if (order.state !== 'awaiting_payment') return { ok: false, error: 'Ya no se puede cambiar de grúa' };
  if (!order.provider_id) return { ok: false, error: 'Sin grúa asignada' };

  const prevConditions = (order.conditions as Record<string, unknown>) ?? {};
  const excluded = Array.isArray(prevConditions.excluded_providers)
    ? (prevConditions.excluded_providers as string[])
    : [];
  const nextExcluded = Array.from(new Set([...excluded, order.provider_id]));

  const { getPlatformSettings } = await import('@/features/pricing/settings');
  const settings = await getPlatformSettings();
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  // Liberamos al proveedor y volvemos a búsqueda (service role: pasa el trigger).
  const { data: reset } = await admin
    .from('service_orders')
    .update({
      state: 'searching_provider',
      provider_id: null,
      driver_id: null,
      reserved_at: null,
      payment_deadline: null,
      searching_at: new Date().toISOString(),
      offer_deadline: new Date(Date.now() + settings.oferta_proveedor_segundos * 1000).toISOString(),
      conditions: { ...prevConditions, excluded_providers: nextExcluded } as import('@/types/database').Json,
    })
    .eq('id', orderId)
    .eq('state', 'awaiting_payment')
    .select('id');
  if (!reset || reset.length === 0) return { ok: false, error: 'La orden cambió de estado. Actualizá.' };

  // Cerramos las ofertas anteriores y re-despachamos excluyendo al rechazado.
  await admin.from('provider_offers').update({ status: 'expired' }).eq('order_id', orderId).eq('status', 'pending');
  await admin.from('order_events').insert({
    order_id: orderId,
    from_state: 'awaiting_payment',
    to_state: 'searching_provider',
    actor_role: 'client',
    event: 'El cliente pidió otra grúa',
  });
  try {
    const { dispatchOrder } = await import('@/features/dispatch/service');
    await dispatchOrder(orderId, nextExcluded);
  } catch {
    /* si falla, queda en búsqueda */
  }
  revalidatePath(`/cliente/solicitudes/${orderId}`);
  return { ok: true, orderId };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
