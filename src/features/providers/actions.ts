'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { assertTransition, type OrderState, type Actor } from '@/features/orders/state-machine';
import { isValidCuit, normalizePatente, isValidPatente, isValidDni } from '@/lib/validation/argentina';

type Result = { ok: boolean; error?: string; value?: unknown };

async function providerOf(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('provider_accounts')
    .select('id, owner_id, status')
    .eq('owner_id', userId)
    .maybeSingle();
  return data;
}

/** Cambia disponibilidad. No permite disponible si la cuenta no está aprobada. */
export async function setAvailability(available: boolean, lat?: number, lng?: number): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'No tenés una cuenta de proveedor' };
  if (available && provider.status !== 'approved') {
    return { ok: false, error: 'Tu cuenta todavía no está aprobada' };
  }
  const patch: Partial<import('@/types/database').ProviderAccountRow> = { is_available: available };
  if (available && lat != null && lng != null) {
    patch.last_lat = lat;
    patch.last_lng = lng;
    patch.last_location_at = new Date().toISOString();
  }
  const { error } = await supabase.from('provider_accounts').update(patch).eq('id', provider.id);
  if (error) return { ok: false, error: 'No pudimos actualizar la disponibilidad' };
  revalidatePath('/proveedor');
  return { ok: true };
}

/** Actualiza la última ubicación conocida del proveedor (para el despacho). */
export async function updateProviderLocation(lat: number, lng: number): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };
  await supabase
    .from('provider_accounts')
    .update({ last_lat: lat, last_lng: lng, last_location_at: new Date().toISOString() })
    .eq('id', provider.id);
  return { ok: true };
}

/** Acepta una oferta de forma atómica (RPC con bloqueo) y fija el conductor asignado. */
export async function acceptOffer(orderId: string, driverId?: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };

  const { data, error } = await supabase.rpc('accept_offer', {
    p_order_id: orderId,
    p_provider_id: provider.id,
  });
  if (error) return { ok: false, error: 'No se pudo aceptar (¿ya la tomó otro?)' };
  if (data !== true) return { ok: false, error: 'La oferta ya no está disponible' };

  // Registra qué conductor está manejando (para mostrarle los datos correctos al cliente).
  if (driverId) {
    await supabase.from('service_orders').update({ driver_id: driverId }).eq('id', orderId);
  }

  revalidatePath('/proveedor');
  revalidatePath(`/proveedor/servicios/${orderId}`);
  return { ok: true, value: true };
}

/** Rechaza la oferta del proveedor para una orden. */
export async function rejectOffer(orderId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };
  await supabase
    .from('provider_offers')
    .update({ status: 'rejected' })
    .eq('order_id', orderId)
    .eq('provider_id', provider.id)
    .eq('status', 'pending');
  revalidatePath('/proveedor');
  return { ok: true };
}

/** Avanza el estado de un servicio validando la máquina de estados. */
export async function advanceOrderState(orderId: string, to: OrderState): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, state, provider_id')
    .eq('id', orderId)
    .single();
  if (!order) return { ok: false, error: 'Orden no encontrada' };

  const actor: Actor = 'provider';
  let transition;
  try {
    transition = assertTransition(order.state as OrderState, to, actor);
  } catch {
    return { ok: false, error: 'Ese paso no es válido ahora' };
  }

  const patch: Partial<import('@/types/database').ServiceOrderRow> = { state: to };
  if (to === 'completed') patch.completed_at = new Date().toISOString();

  const { error } = await supabase.from('service_orders').update(patch).eq('id', orderId);
  if (error) return { ok: false, error: 'No pudimos actualizar el estado' };

  await supabase.from('order_events').insert({
    order_id: orderId,
    from_state: order.state as OrderState,
    to_state: to,
    actor_role: 'provider_owner',
    actor_id: user.id,
    event: transition.event,
  });
  revalidatePath(`/proveedor/servicios/${orderId}`);
  revalidatePath(`/cliente/solicitudes/${orderId}`);
  return { ok: true };
}

const extraSchema = z.object({
  orderId: z.string().uuid(),
  category: z.string().min(1),
  reason: z.string().min(3, 'Explicá el motivo'),
  amount: z.coerce.number().int().min(0),
});

/** Carga un adicional al servicio. Marca para revisión si supera el tope. */
export async function addExtra(input: z.infer<typeof extraSchema>): Promise<Result> {
  const parsed = extraSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const supabase = await createClient();
  const { getPlatformSettings } = await import('@/features/pricing/settings');
  const settings = await getPlatformSettings();
  const status = parsed.data.amount > settings.extra_tope_auto ? 'needs_review' : 'auto_approved';
  const { error } = await supabase.from('service_extras').insert({
    order_id: parsed.data.orderId,
    category: parsed.data.category,
    reason: parsed.data.reason,
    amount: parsed.data.amount,
    status,
  });
  if (error) return { ok: false, error: 'No pudimos cargar el adicional' };
  revalidatePath(`/proveedor/servicios/${parsed.data.orderId}`);
  return { ok: true };
}

const onboardingSchema = z.object({
  legal_name: z.string().min(2),
  cuit: z.string().refine(isValidCuit, 'CUIT inválido'),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().min(6),
  truck: z.object({
    patente: z.string().transform(normalizePatente).refine(isValidPatente, 'Patente de grúa inválida'),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.coerce.number().int().optional().catch(undefined),
    capacity: z.string().optional(),
  }),
  // Conductor dueño (base). Los adicionales se cargan después, ya aprobado.
  driver: z.object({
    full_name: z.string().min(2, 'Ingresá el nombre del conductor'),
    dni: z.string().refine((v) => !v || isValidDni(v), 'DNI inválido').optional(),
    phone: z.string().optional(),
  }),
});

/**
 * Crea (o actualiza) la cuenta de proveedor del usuario junto con su grúa y el
 * miembro dueño. Queda en `draft`; el envío a revisión es un paso aparte.
 */
export async function createProviderAccount(input: z.infer<typeof onboardingSchema>): Promise<Result> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  // Verificamos al usuario con su sesión…
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // …y hacemos las escrituras con service role (operación de servidor confiable,
  // con owner_id fijado al usuario verificado). Evita ambigüedades de RLS en el alta.
  const { createAdminClient } = await import('@/lib/supabase/admin');
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: 'El servidor no está configurado para el alta de proveedores.' };
  }

  const existing = await providerOf(user.id);
  let providerId = existing?.id;

  if (!providerId) {
    const { data, error } = await admin
      .from('provider_accounts')
      .insert({
        owner_id: user.id,
        legal_name: parsed.data.legal_name,
        cuit: parsed.data.cuit.replace(/\D/g, ''),
        contact_email: parsed.data.contact_email || null,
        contact_phone: parsed.data.contact_phone,
        status: 'draft',
      })
      .select('id')
      .single();
    if (error || !data) {
      return { ok: false, error: `No pudimos crear la cuenta${error ? `: ${error.message}` : ''}` };
    }
    providerId = data.id;

    await admin.from('provider_members').insert({
      provider_id: providerId,
      user_id: user.id,
      role: 'owner',
      full_name: parsed.data.driver.full_name,
      dni: parsed.data.driver.dni || null,
      phone: parsed.data.driver.phone || parsed.data.contact_phone,
    });
    await admin.from('profiles').update({ role: 'provider_owner' }).eq('id', user.id);
  }

  const { error: truckErr } = await admin.from('tow_trucks').insert({
    provider_id: providerId,
    patente: parsed.data.truck.patente,
    brand: parsed.data.truck.brand ?? null,
    model: parsed.data.truck.model ?? null,
    year: parsed.data.truck.year ?? null,
    capacity: parsed.data.truck.capacity ?? null,
  });
  if (truckErr) return { ok: false, error: `No pudimos guardar la grúa: ${truckErr.message}` };

  revalidatePath('/proveedor');
  return { ok: true, value: providerId };
}

const driverSchema = z.object({
  full_name: z.string().min(2, 'Ingresá el nombre'),
  dni: z.string().refine((v) => !v || isValidDni(v), 'DNI inválido').optional(),
  phone: z.string().optional(),
});

/** Agrega un conductor adicional (además del dueño). Máximo 4 adicionales. */
export async function addDriver(input: z.infer<typeof driverSchema>): Promise<Result> {
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };

  const { count } = await supabase
    .from('provider_members')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', provider.id)
    .eq('role', 'driver');
  if ((count ?? 0) >= 4) return { ok: false, error: 'Llegaste al máximo de 4 conductores adicionales' };

  const { error } = await supabase.from('provider_members').insert({
    provider_id: provider.id,
    role: 'driver',
    full_name: parsed.data.full_name,
    dni: parsed.data.dni || null,
    phone: parsed.data.phone || null,
  });
  if (error) return { ok: false, error: 'No pudimos agregar el conductor' };
  revalidatePath('/proveedor/equipo');
  return { ok: true };
}

/** Envía la cuenta a revisión del administrador. */
export async function submitProviderForReview(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };
  const { error } = await supabase
    .from('provider_accounts')
    .update({ status: 'submitted' })
    .eq('id', provider.id)
    .in('status', ['draft', 'rejected']);
  if (error) return { ok: false, error: 'No pudimos enviar a revisión' };
  revalidatePath('/proveedor/estado-solicitud');
  return { ok: true };
}
