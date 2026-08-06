'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { assertTransition, type OrderState, type Actor } from '@/features/orders/state-machine';
import { isValidCuit, normalizePatente, isValidPatente, isValidDni } from '@/lib/validation/argentina';

type Result = { ok: boolean; error?: string; value?: unknown; needsReview?: boolean };

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
  // Vencimiento de documentación: si el admin puso una fecha y ya pasó, no se puede
  // operar hasta renovar (renovación de documentación pendiente).
  if (available) {
    const { data: venc } = await supabase
      .from('provider_documents')
      .select('expires_at')
      .eq('provider_id', provider.id)
      .eq('doc_type', 'vencimiento_docs')
      .maybeSingle();
    if (venc?.expires_at && new Date(venc.expires_at) < new Date()) {
      return { ok: false, error: 'Tu documentación venció. Renovala y escribinos a soporte para reactivarte.' };
    }
  }
  // Mínimo indispensable para operar: al menos un conductor activo con nombre y
  // teléfono (así el cliente sabe quién va y puede contactarlo). El resto —DNI,
  // licencia y foto— se reclama con un plazo de gracia y un aviso permanente, sin
  // bloquear el servicio (ver getCompliance).
  if (available) {
    const { data: activos } = await supabase
      .from('provider_members')
      .select('id, full_name, phone')
      .eq('provider_id', provider.id)
      .eq('status', 'active');
    if (!(activos ?? []).some((m) => m.full_name && m.phone)) {
      return {
        ok: false,
        error: 'Necesitás al menos un conductor con nombre y teléfono para ponerte disponible. Cargalo en Conductores.',
      };
    }
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

  // El conductor tiene que ser un miembro activo de ESTE proveedor. No exigimos la
  // documentación completa para no frenar el servicio: eso se reclama con plazo y
  // aviso permanente. Si no eligen, tomamos el primero (priorizando los completos).
  const { getDriversWithStatus } = await import('./drivers');
  const drivers = await getDriversWithStatus(supabase, provider.id);
  if (drivers.length === 0) {
    return { ok: false, error: 'No tenés conductores cargados. Agregá uno en Conductores.' };
  }
  let chosenDriver = driverId;
  if (chosenDriver) {
    if (!drivers.some((d) => d.id === chosenDriver)) {
      return { ok: false, error: 'El conductor elegido no es de tu equipo' };
    }
  } else {
    chosenDriver = (drivers.find((d) => d.complete) ?? drivers[0]!).id;
  }

  // La ventana de pago sale de la configuración de la plataforma (no del default
  // corto del RPC), para que el cliente tenga tiempo real de pagar en MP.
  const { getPlatformSettings } = await import('@/features/pricing/settings');
  const settings = await getPlatformSettings();

  const { data, error } = await supabase.rpc('accept_offer', {
    p_order_id: orderId,
    p_provider_id: provider.id,
    p_pay_seconds: settings.pago_cliente_segundos,
  });
  if (error) return { ok: false, error: 'No se pudo aceptar (¿ya la tomó otro?)' };
  if (data !== true) return { ok: false, error: 'La oferta ya no está disponible' };

  // Registra qué conductor está manejando (para mostrarle los datos correctos al
  // cliente). Guardado por provider_id: solo sobre la orden que este proveedor tomó.
  await supabase
    .from('service_orders')
    .update({ driver_id: chosenDriver })
    .eq('id', orderId)
    .eq('provider_id', provider.id);

  // Push al cliente: una grúa aceptó, hay que pagar el anticipo.
  try {
    const { data: ord } = await supabase.from('service_orders').select('client_id').eq('id', orderId).single();
    if (ord?.client_id) {
      const { sendPushToUser } = await import('@/lib/push/send');
      await sendPushToUser(ord.client_id, {
        title: '¡Una grúa aceptó! 🚗',
        body: 'Reservá con el anticipo para confirmar.',
        url: `/cliente/solicitudes/${orderId}`,
      });
    }
  } catch {
    /* best-effort */
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
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, state, provider_id, client_id')
    .eq('id', orderId)
    .single();
  if (!order) return { ok: false, error: 'Orden no encontrada' };
  // Solo el proveedor asignado a la orden puede avanzarla.
  if (order.provider_id !== provider.id) return { ok: false, error: 'Este servicio no es tuyo' };

  const actor: Actor = 'provider';
  let transition;
  try {
    transition = assertTransition(order.state as OrderState, to, actor);
  } catch {
    return { ok: false, error: 'Ese paso no es válido ahora' };
  }

  const patch: Partial<import('@/types/database').ServiceOrderRow> = { state: to };
  if (to === 'completed') patch.completed_at = new Date().toISOString();

  // Update guardado: solo si sigue en el estado que leímos y asignado a este
  // proveedor. Evita pisar cambios en carrera (cancelación admin, doble click).
  const { data: updated, error } = await supabase
    .from('service_orders')
    .update(patch)
    .eq('id', orderId)
    .eq('state', order.state)
    .eq('provider_id', provider.id)
    .select('id');
  if (error) return { ok: false, error: 'No pudimos actualizar el estado' };
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'El servicio cambió de estado. Actualizá la pantalla.' };
  }

  await supabase.from('order_events').insert({
    order_id: orderId,
    from_state: order.state as OrderState,
    to_state: to,
    actor_role: 'provider_owner',
    actor_id: user.id,
    event: transition.event,
  });

  // Push al cliente con el cambio de estado.
  const CLIENT_PUSH: Partial<Record<OrderState, string>> = {
    provider_en_route: 'Tu grúa va en camino 🚚 — recordá: máx. 2 personas',
    provider_arrived: 'Tu grúa llegó 📍',
    vehicle_loaded: 'Cargando tu vehículo 🔧',
    in_transit: 'En camino al destino 🛣️',
    completion_pending: 'Llegaron al destino 🏁',
    completed: 'Servicio finalizado ⭐ Dejá tu reseña',
  };
  if (order.client_id && CLIENT_PUSH[to]) {
    try {
      const { sendPushToUser } = await import('@/lib/push/send');
      await sendPushToUser(order.client_id, { title: 'gruafy', body: CLIENT_PUSH[to]!, url: `/cliente/solicitudes/${orderId}` });
    } catch {
      /* best-effort */
    }
  }

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

/**
 * Carga un adicional al servicio, VALIDÁNDOLO contra el catálogo configurado por
 * el admin (anti-fraude): la categoría debe existir y estar activa, el monto debe
 * respetar el modo (libre / fijo / rango) y no puede superarse el tope de cantidad
 * por categoría. Marca para revisión si supera el tope de auto-aprobación.
 */
export async function addExtra(input: z.infer<typeof extraSchema>): Promise<Result> {
  const parsed = extraSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };

  // La orden tiene que ser de este proveedor.
  const { data: order } = await supabase
    .from('service_orders')
    .select('id, provider_id, state')
    .eq('id', parsed.data.orderId)
    .single();
  if (!order || order.provider_id !== provider.id) return { ok: false, error: 'Este servicio no es tuyo' };
  // Los adicionales solo se cargan MIENTRAS el servicio está en curso: después de
  // cerrarlo (o si se canceló) no se puede inflar el total a cobrar.
  const EDITABLE: OrderState[] = ['paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending'];
  if (!EDITABLE.includes(order.state as OrderState)) {
    return { ok: false, error: 'El servicio ya está cerrado: no se pueden agregar adicionales.' };
  }

  const { getPlatformSettings } = await import('@/features/pricing/settings');
  const settings = await getPlatformSettings();

  // Validación contra el catálogo.
  const def = settings.adicionales.find((a) => a.key === parsed.data.category && a.activo);
  if (!def) return { ok: false, error: 'Ese adicional no está habilitado' };

  let amount = parsed.data.amount;
  if (def.mode === 'fijo') {
    amount = def.amount ?? 0; // el precio fijo lo pone el catálogo, no el gruero
  } else if (def.mode === 'rango') {
    const min = def.min ?? 0;
    const max = def.max ?? Number.MAX_SAFE_INTEGER;
    if (amount < min || amount > max) {
      return { ok: false, error: `El monto debe estar entre ${min} y ${max}` };
    }
  }
  // 'libre' no valida monto (queda a criterio, con el tope de auto-aprobación).

  // Tope de cantidad por categoría en esta orden.
  if (def.max_cantidad != null) {
    const { count } = await supabase
      .from('service_extras')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', parsed.data.orderId)
      .eq('category', def.label);
    if ((count ?? 0) >= def.max_cantidad) {
      return { ok: false, error: `Llegaste al máximo de ${def.max_cantidad} para "${def.label}"` };
    }
  }

  // Si el monto salió de algo que YA definió el admin (precio fijo o dentro de un
  // rango permitido), se aprueba solo: no tiene sentido mandar a revisión algo que
  // la propia plataforma autorizó. Solo el modo 'libre' —donde el gruero escribe
  // lo que quiere— queda sujeto al tope de auto-aprobación.
  const status =
    def.mode === 'libre' && amount > settings.extra_tope_auto ? 'needs_review' : 'auto_approved';
  const { error } = await supabase.from('service_extras').insert({
    order_id: parsed.data.orderId,
    category: def.label, // guardamos la etiqueta legible para mostrar en la liquidación
    reason: parsed.data.reason,
    amount,
    status,
  });
  if (error) return { ok: false, error: 'No pudimos cargar el adicional' };
  revalidatePath(`/proveedor/servicios/${parsed.data.orderId}`);
  revalidatePath(`/cliente/solicitudes/${parsed.data.orderId}`);
  // needsReview: el form avisa que ese monto todavía NO suma al total.
  return { ok: true, needsReview: status === 'needs_review' };
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
  phone: z.string().min(6, 'El teléfono es obligatorio'),
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

const editCompanySchema = z.object({
  legal_name: z.string().min(2, 'Ingresá la razón social'),
  cuit: z.string().refine(isValidCuit, 'CUIT inválido'),
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  contact_phone: z.string().min(6, 'Teléfono inválido'),
});

/** Edita los datos de la empresa del proveedor (razón social, CUIT, contacto). */
export async function editProviderCompany(input: z.infer<typeof editCompanySchema>): Promise<Result> {
  const parsed = editCompanySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };

  const { error } = await supabase
    .from('provider_accounts')
    .update({
      legal_name: parsed.data.legal_name,
      cuit: parsed.data.cuit.replace(/\D/g, ''),
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone,
    })
    .eq('id', provider.id);
  if (error) return { ok: false, error: 'No pudimos guardar los cambios' };
  revalidatePath('/proveedor/perfil');
  return { ok: true };
}

const editTruckSchema = z.object({
  truckId: z.string().uuid(),
  patente: z.string().transform(normalizePatente).refine(isValidPatente, 'Patente de grúa inválida'),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().int().optional().catch(undefined),
  capacity: z.string().optional(),
});

/** Edita los datos de una grúa del proveedor. */
export async function editTruck(input: z.infer<typeof editTruckSchema>): Promise<Result> {
  const parsed = editTruckSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };

  const { data: updated, error } = await supabase
    .from('tow_trucks')
    .update({
      patente: parsed.data.patente,
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      year: parsed.data.year ?? null,
      capacity: parsed.data.capacity || null,
    })
    .eq('id', parsed.data.truckId)
    .eq('provider_id', provider.id)
    .select('id');
  if (error) return { ok: false, error: 'No pudimos guardar la grúa' };
  if (!updated || updated.length === 0) return { ok: false, error: 'Grúa no encontrada' };
  revalidatePath('/proveedor/perfil');
  return { ok: true };
}

/**
 * Elimina un conductor del equipo. Nunca al conductor dueño (es el titular de la
 * cuenta) ni a uno que esté asignado a un servicio en curso. Sus documentos se
 * borran con él.
 */
export async function deleteDriver(memberId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };
  const provider = await providerOf(user.id);
  if (!provider) return { ok: false, error: 'Sin proveedor' };

  const { data: member } = await supabase
    .from('provider_members')
    .select('id, role, full_name')
    .eq('id', memberId)
    .eq('provider_id', provider.id)
    .maybeSingle();
  if (!member) return { ok: false, error: 'Conductor no encontrado' };
  if (member.role === 'owner') {
    return { ok: false, error: 'No se puede eliminar al conductor dueño de la cuenta.' };
  }

  // No borrar a alguien que está manejando un servicio activo.
  const ACTIVOS: import('@/types/database').OrderStateDb[] = [
    'awaiting_payment', 'payment_pending', 'paid', 'provider_en_route',
    'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending',
  ];
  const { data: enCurso } = await supabase
    .from('service_orders')
    .select('id')
    .eq('driver_id', memberId)
    .in('state', ACTIVOS)
    .limit(1);
  if (enCurso && enCurso.length > 0) {
    return { ok: false, error: 'Ese conductor tiene un servicio en curso. Cerralo antes de eliminarlo.' };
  }

  // Documentos del conductor (licencia y foto) primero.
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: docs } = await admin
    .from('provider_documents')
    .select('id, storage_path')
    .eq('member_id', memberId);
  const paths = (docs ?? []).map((d) => d.storage_path).filter((p) => p && !p.startsWith('('));
  if (paths.length) await admin.storage.from('documents').remove(paths);
  await admin.from('provider_documents').delete().eq('member_id', memberId);

  const { error } = await admin.from('provider_members').delete().eq('id', memberId);
  if (error) return { ok: false, error: 'No pudimos eliminar el conductor' };

  revalidatePath('/proveedor/equipo');
  revalidatePath('/proveedor');
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
