'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { signedDocUrl } from '@/lib/supabase/storage';
import { STATE_LABELS, isTerminal, type OrderState } from '@/features/orders/state-machine';

type Result = { ok: boolean; error?: string; value?: unknown };

/** Registra una acción del admin en la auditoría (antes/después sanitizado). */
async function audit(
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // La auditoría se escribe con service role (tabla sin policy de insert por diseño).
  const { createAdminClient } = await import('@/lib/supabase/admin');
  try {
    await createAdminClient()
      .from('admin_audit_logs')
      .insert({
        admin_id: user.id,
        action,
        entity,
        entity_id: entityId,
        before: (before ?? null) as never,
        after: (after ?? null) as never,
      });
  } catch {
    /* no bloquear la acción principal si falla la auditoría */
  }
}

async function ensureAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === 'admin';
}

/** URL firmada de corta duración para ver un documento privado (solo admin). */
export async function getSignedDocUrl(path: string): Promise<string | null> {
  if (!(await ensureAdmin())) return null;
  return signedDocUrl(path, 120);
}

const reviewDocSchema = z.object({
  docId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().max(300).optional(),
});

/** Aprueba o rechaza un documento de proveedor. */
export async function reviewDocument(input: z.infer<typeof reviewDocSchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = reviewDocSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  if (parsed.data.decision === 'rejected' && !parsed.data.note?.trim()) {
    return { ok: false, error: 'Al rechazar, el motivo es obligatorio' };
  }
  const supabase = await createClient();
  const { data: doc } = await supabase.from('provider_documents').select('id, provider_id, review_status').eq('id', parsed.data.docId).single();
  if (!doc) return { ok: false, error: 'Documento no encontrado' };

  await supabase
    .from('provider_documents')
    .update({ review_status: parsed.data.decision, admin_note: parsed.data.note ?? null })
    .eq('id', parsed.data.docId);
  await audit('review_document', 'provider_documents', parsed.data.docId, { review_status: doc.review_status }, { review_status: parsed.data.decision });
  revalidatePath(`/admin/proveedores/${doc.provider_id}`);
  return { ok: true };
}

const decisionSchema = z.object({
  providerId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected', 'suspended', 'under_review']),
  reason: z.string().max(300).optional(),
  /** Al aprobar: fecha de vencimiento de la documentación (opcional). */
  expireAt: z.string().optional(),
});

/** Aprueba, rechaza, suspende o pasa a revisión una cuenta de proveedor. */
export async function decideProvider(input: z.infer<typeof decisionSchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  if (parsed.data.decision === 'rejected' && !parsed.data.reason?.trim()) {
    return { ok: false, error: 'Al rechazar, el motivo es obligatorio' };
  }
  const supabase = await createClient();
  const { data: provider } = await supabase.from('provider_accounts').select('id, status, is_available').eq('id', parsed.data.providerId).single();
  if (!provider) return { ok: false, error: 'Proveedor no encontrado' };

  const patch: Partial<import('@/types/database').ProviderAccountRow> = {
    status: parsed.data.decision,
    rejection_reason: parsed.data.decision === 'rejected' ? (parsed.data.reason ?? null) : null,
  };
  // Si se suspende o rechaza, deja de estar disponible.
  if (parsed.data.decision !== 'approved') patch.is_available = false;

  await supabase.from('provider_accounts').update(patch).eq('id', parsed.data.providerId);

  if (parsed.data.decision === 'approved') {
    // Al aprobar el proveedor, se aprueban TODOS sus documentos pendientes.
    await supabase
      .from('provider_documents')
      .update({ review_status: 'approved' })
      .eq('provider_id', parsed.data.providerId)
      .eq('review_status', 'pending');
    // Plazo de gracia para completar DNI/licencia/foto de los conductores. No
    // bloquea el servicio: dispara el aviso con cuenta regresiva en el panel del
    // gruero, y vencido queda a criterio del admin suspender la cuenta.
    const { getPlatformSettings } = await import('@/features/pricing/settings');
    const cfg = await getPlatformSettings();
    const limite = new Date(Date.now() + (cfg.dias_gracia_documentacion ?? 7) * 86400000).toISOString();
    await supabase.from('provider_documents').delete().eq('provider_id', parsed.data.providerId).eq('doc_type', 'plazo_conductores');
    await supabase.from('provider_documents').insert({
      provider_id: parsed.data.providerId,
      owner_kind: 'provider',
      doc_type: 'plazo_conductores',
      storage_path: '(plazo de documentación de conductores)',
      expires_at: limite,
      review_status: 'approved',
    });

    // Fecha de vencimiento de documentación (opcional): la guardamos como un
    // "documento" especial con expires_at. Al vencer, se bloquea la operación.
    await supabase.from('provider_documents').delete().eq('provider_id', parsed.data.providerId).eq('doc_type', 'vencimiento_docs');
    if (parsed.data.expireAt) {
      await supabase.from('provider_documents').insert({
        provider_id: parsed.data.providerId,
        owner_kind: 'provider',
        doc_type: 'vencimiento_docs',
        storage_path: '(control de vencimiento)',
        expires_at: parsed.data.expireAt,
        review_status: 'approved',
      });
    }
  }

  await audit('decide_provider', 'provider_accounts', parsed.data.providerId, { status: provider.status }, { status: parsed.data.decision });
  revalidatePath('/admin/proveedores');
  revalidatePath(`/admin/proveedores/${parsed.data.providerId}`);
  return { ok: true };
}

const settingsSchema = z.record(
  z.string(),
  z.union([z.number(), z.boolean(), z.array(z.number()), z.array(z.string())]),
);

/** Actualiza los parámetros de la plataforma (versiona y audita). Solo órdenes nuevas. */
export async function updateSettings(values: Record<string, unknown>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: 'Parámetros inválidos' };
  const supabase = await createClient();
  const { data: current } = await supabase.from('platform_settings').select('version, values').eq('id', 1).single();
  const nextVersion = (current?.version ?? 0) + 1;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // MERGE sobre lo existente (no reemplazo): así guardar los parámetros numéricos
  // no pisa el catálogo de adicionales ni otras claves no incluidas en el form.
  const mergedValues = { ...((current?.values as Record<string, unknown>) ?? {}), ...parsed.data };
  await supabase
    .from('platform_settings')
    .update({ values: mergedValues as never, version: nextVersion, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
    .eq('id', 1);
  await audit('update_settings', 'platform_settings', '1', current?.values, mergedValues);
  revalidatePath('/admin/configuracion');
  return { ok: true };
}

const adicionalSchema = z
  .object({
    key: z.string().min(1).max(40),
    label: z.string().min(1).max(60),
    mode: z.enum(['libre', 'fijo', 'rango']),
    amount: z.coerce.number().int().min(0).optional(),
    min: z.coerce.number().int().min(0).optional(),
    max: z.coerce.number().int().min(0).optional(),
    max_cantidad: z.coerce.number().int().min(1).max(20).optional(),
    activo: z.boolean(),
  })
  .refine((a) => a.mode !== 'fijo' || (a.amount ?? 0) > 0, { message: 'El precio fijo debe ser mayor a 0' })
  .refine((a) => a.mode !== 'rango' || ((a.min ?? 0) >= 0 && (a.max ?? 0) > (a.min ?? 0)), {
    message: 'En rango, el máximo debe ser mayor al mínimo',
  });

/** Actualiza SOLO el catálogo de adicionales (merge sobre el resto de settings). */
export async function updateAdicionales(catalog: unknown[]): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = z.array(adicionalSchema).max(20).safeParse(catalog);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Catálogo inválido' };

  // Claves únicas.
  const keys = parsed.data.map((a) => a.key);
  if (new Set(keys).size !== keys.length) return { ok: false, error: 'Hay claves de adicional repetidas' };

  const supabase = await createClient();
  const { data: current } = await supabase.from('platform_settings').select('version, values').eq('id', 1).single();
  const nextVersion = (current?.version ?? 0) + 1;
  const mergedValues = { ...((current?.values as Record<string, unknown>) ?? {}), adicionales: parsed.data };
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from('platform_settings')
    .update({ values: mergedValues as never, version: nextVersion, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
    .eq('id', 1);
  await audit('update_adicionales', 'platform_settings', '1', current?.values, mergedValues);
  revalidatePath('/admin/configuracion');
  return { ok: true };
}

const setPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

const adminCompanySchema = z.object({
  providerId: z.string().uuid(),
  legal_name: z.string().min(2),
  cuit: z.string().min(6),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().min(6),
});

/** El admin corrige los datos de la empresa (razón social, CUIT, contacto). */
export async function adminUpdateProvider(input: z.infer<typeof adminCompanySchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = adminCompanySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('provider_accounts')
    .update({
      legal_name: parsed.data.legal_name,
      cuit: parsed.data.cuit.replace(/\D/g, ''),
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone,
    })
    .eq('id', parsed.data.providerId);
  if (error) return { ok: false, error: 'No pudimos guardar los cambios' };
  await audit('admin_update_provider', 'provider_accounts', parsed.data.providerId, null, parsed.data);
  revalidatePath(`/admin/proveedores/${parsed.data.providerId}`);
  return { ok: true };
}

/** El admin corrige el email de login de un usuario (lo pusieron mal, etc.). */
export async function adminSetUserEmail(userId: string, email: string): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  if (!/.+@.+\..+/.test(email)) return { ok: false, error: 'Email inválido' };
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
  if (error) return { ok: false, error: 'No pudimos cambiar el email (¿ya está en uso?)' };
  await audit('admin_set_email', 'auth.users', userId, null, { email });
  return { ok: true };
}

const adminMemberSchema = z.object({
  memberId: z.string().uuid(),
  full_name: z.string().min(2, 'Ingresá el nombre'),
  dni: z.string().optional(),
  phone: z.string().min(6, 'El teléfono es obligatorio'),
});

/** El admin corrige los datos de un conductor. */
export async function adminUpdateMember(input: z.infer<typeof adminMemberSchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = adminMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('provider_members')
    .update({ full_name: parsed.data.full_name, dni: parsed.data.dni || null, phone: parsed.data.phone })
    .eq('id', parsed.data.memberId)
    .select('provider_id')
    .maybeSingle();
  if (error || !updated) return { ok: false, error: 'No pudimos guardar el conductor' };
  await audit('admin_update_member', 'provider_members', parsed.data.memberId, null, parsed.data);
  revalidatePath(`/admin/proveedores/${updated.provider_id}`);
  return { ok: true };
}

const adminTruckSchema = z.object({
  truckId: z.string().uuid(),
  patente: z.string().min(3, 'Patente inválida'),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().int().optional().catch(undefined),
  capacity: z.string().optional(),
});

/** El admin corrige los datos de una grúa. */
export async function adminUpdateTruck(input: z.infer<typeof adminTruckSchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = adminTruckSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('tow_trucks')
    .update({
      patente: parsed.data.patente.toUpperCase().replace(/\s/g, ''),
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      year: parsed.data.year ?? null,
      capacity: parsed.data.capacity || null,
    })
    .eq('id', parsed.data.truckId)
    .select('provider_id')
    .maybeSingle();
  if (error || !updated) return { ok: false, error: 'No pudimos guardar la grúa' };
  await audit('admin_update_truck', 'tow_trucks', parsed.data.truckId, null, parsed.data);
  revalidatePath(`/admin/proveedores/${updated.provider_id}`);
  return { ok: true };
}

/** El admin cambia la contraseña de un usuario (soporte). Usa la Admin Auth API. */
export async function adminSetPassword(input: z.infer<typeof setPasswordSchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.userId, { password: parsed.data.password });
  if (error) return { ok: false, error: 'No pudimos cambiar la contraseña' };
  await audit('set_password', 'auth.users', parsed.data.userId, null, { changed: true });
  return { ok: true };
}

/**
 * Reembolso total de un pago aprobado (solo admin, con confirmación explícita).
 * Registra el reembolso, lo procesa en Mercado Pago si hay credenciales, y audita.
 */
export async function refundPayment(paymentId: string, reason: string, confirm: boolean): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  if (!confirm) return { ok: false, error: 'Falta confirmación' };
  if (!reason.trim()) return { ok: false, error: 'El motivo es obligatorio' };

  // Los pagos/reembolsos se administran con service role (tablas gestionadas por servidor).
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: payment } = await admin.from('payments').select('*').eq('id', paymentId).single();
  if (!payment) return { ok: false, error: 'Pago no encontrado' };
  if (payment.status !== 'approved') return { ok: false, error: 'Solo se reembolsan pagos aprobados' };

  const { data: refund } = await admin
    .from('refunds')
    .insert({ payment_id: paymentId, amount: payment.amount, reason, status: 'pending' })
    .select('id')
    .single();

  let processed = false;
  try {
    if (payment.mp_payment_id) {
      const { refundApi } = await import('@/lib/mercadopago/client');
      const api = refundApi();
      if (api) {
        await api.create({ payment_id: Number(payment.mp_payment_id) });
        processed = true;
      }
    }
  } catch {
    // Falló el reembolso en MP: queda 'pending' para reintento manual.
  }

  if (refund) {
    await admin.from('refunds').update({ status: processed ? 'processed' : 'failed' }).eq('id', refund.id);
  }
  await admin.from('payments').update({ status: processed ? 'refunded' : payment.status }).eq('id', paymentId);

  // El estado de la orden solo se mueve si el servicio NO se prestó. Reembolsar el
  // anticipo de un servicio ya cumplido no lo "des-completa": eso borraría que el
  // gruero trabajó. Antes se intentaba igual y el trigger lo rechazaba en silencio.
  const { data: ord } = await admin
    .from('service_orders')
    .select('state')
    .eq('id', payment.order_id)
    .single();
  const estadoPrevio = ord?.state as OrderState | undefined;
  const mueveEstado = estadoPrevio != null && estadoPrevio !== 'completed' && estadoPrevio !== 'refunded';
  const nuevoEstado: OrderState = processed ? 'refunded' : 'refund_pending';
  let estadoOk = true;
  if (mueveEstado) {
    const { data: upd } = await admin
      .from('service_orders')
      .update({ state: nuevoEstado })
      .eq('id', payment.order_id)
      .eq('state', estadoPrevio)
      .select('id');
    estadoOk = Boolean(upd && upd.length > 0);
  }
  await admin.from('order_events').insert({
    order_id: payment.order_id,
    from_state: estadoPrevio ?? null,
    to_state: mueveEstado && estadoOk ? nuevoEstado : null,
    actor_role: 'admin',
    event: `${processed ? 'Reembolso acreditado' : 'Reembolso en curso'}: ${reason}`,
  });
  await audit('refund_payment', 'payments', paymentId, { status: payment.status }, { status: processed ? 'refunded' : 'refund_pending' });
  revalidatePath('/admin/pagos');
  revalidatePath('/admin/reembolsos');
  return { ok: processed, error: processed ? undefined : 'El reembolso quedó pendiente (revisá Mercado Pago).' };
}

/** Cancela administrativamente una orden. */
export async function adminCancelOrder(orderId: string, reason: string): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  if (!reason.trim()) return { ok: false, error: 'El motivo es obligatorio' };
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('service_orders')
    .select('id, state, client_id, provider_id')
    .eq('id', orderId)
    .single();
  if (!order) return { ok: false, error: 'Orden no encontrada' };
  if (isTerminal(order.state as OrderState)) {
    return { ok: false, error: `El servicio ya está cerrado (${STATE_LABELS[order.state as OrderState]}). No se puede cancelar de nuevo.` };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  // CRÍTICO: hay que CONFIRMAR que la fila cambió. El trigger de integridad rechaza
  // transiciones no declaradas (incluso con service role) y, si no miramos el
  // resultado, la UI dice "cancelado" mientras el servicio sigue vivo para el gruero.
  const { data: updated, error: updErr } = await admin
    .from('service_orders')
    .update({ state: 'cancelled_by_admin', cancellation_reason: reason })
    .eq('id', orderId)
    .eq('state', order.state) // no pisar un cambio de estado concurrente
    .select('id');
  if (updErr || !updated || updated.length === 0) {
    return {
      ok: false,
      error: `No se pudo cancelar desde "${STATE_LABELS[order.state as OrderState]}". ${updErr?.message ?? 'El estado cambió mientras cancelabas: recargá y probá de nuevo.'}`,
    };
  }

  await admin.from('order_events').insert({
    order_id: orderId,
    from_state: order.state,
    to_state: 'cancelled_by_admin',
    actor_role: 'admin',
    event: `Cancelada por administración: ${reason}`,
  });

  // Avisar a las dos puntas. Si el servicio estaba en curso hay plata de por medio,
  // así que el motivo tiene que llegarles, no quedar solo en el panel del admin.
  const destinatarios: { user_id: string; link: string }[] = [];
  if (order.client_id) destinatarios.push({ user_id: order.client_id, link: `/cliente/solicitudes/${orderId}` });
  if (order.provider_id) {
    const { data: owner } = await admin
      .from('provider_members')
      .select('user_id')
      .eq('provider_id', order.provider_id)
      .eq('role', 'owner')
      .maybeSingle();
    if (owner?.user_id) destinatarios.push({ user_id: owner.user_id, link: `/proveedor/servicios/${orderId}` });
  }
  if (destinatarios.length > 0) {
    await admin.from('notifications').insert(
      destinatarios.map((d) => ({
        user_id: d.user_id,
        type: 'order_cancelled',
        title: 'Servicio cancelado por gruafy',
        body: reason,
        link: d.link,
      })),
    );
  }

  await audit('cancel_order', 'service_orders', orderId, { state: order.state }, { state: 'cancelled_by_admin', reason });
  revalidatePath('/admin/servicios');
  revalidatePath(`/admin/servicios/${orderId}`);
  revalidatePath(`/cliente/solicitudes/${orderId}`);
  revalidatePath(`/proveedor/servicios/${orderId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Adicionales cargados por administración
// ---------------------------------------------------------------------------

const adminExtraSchema = z.object({
  orderId: z.string().uuid(),
  label: z.string().trim().min(3, 'Poné un nombre para el adicional').max(60),
  reason: z.string().trim().min(3, 'Explicá el motivo').max(200),
  amount: z.number().int().positive('El monto tiene que ser mayor a cero').max(5_000_000),
});

/**
 * Carga un adicional PERSONALIZADO a un servicio en curso. El gruero solo puede
 * usar el catálogo cerrado (anti-fraude); cualquier caso raro se resuelve por
 * soporte y lo carga un admin acá, quedando visible para las dos partes.
 */
export async function adminAddExtra(input: z.infer<typeof adminExtraSchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = adminExtraSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const { orderId, label, reason, amount } = parsed.data;

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('service_orders')
    .select('id, state, client_id, provider_id')
    .eq('id', orderId)
    .single();
  if (!order) return { ok: false, error: 'Orden no encontrada' };

  const ABIERTOS: OrderState[] = [
    'paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending',
  ];
  if (!ABIERTOS.includes(order.state as OrderState)) {
    return { ok: false, error: `El servicio está ${STATE_LABELS[order.state as OrderState]}: solo se cargan adicionales mientras está en curso.` };
  }

  const { error } = await admin.from('service_extras').insert({
    order_id: orderId,
    // El prefijo deja claro de dónde salió, para que ni el cliente ni el gruero
    // crean que el otro lo inventó.
    category: `${label} (cargado por gruafy)`,
    reason,
    amount,
    status: 'auto_approved',
  });
  if (error) return { ok: false, error: 'No pudimos cargar el adicional' };

  const destinatarios: { user_id: string; link: string }[] = [];
  if (order.client_id) destinatarios.push({ user_id: order.client_id, link: `/cliente/solicitudes/${orderId}` });
  if (order.provider_id) {
    const { data: owner } = await admin
      .from('provider_members')
      .select('user_id')
      .eq('provider_id', order.provider_id)
      .eq('role', 'owner')
      .maybeSingle();
    if (owner?.user_id) destinatarios.push({ user_id: owner.user_id, link: `/proveedor/servicios/${orderId}` });
  }
  if (destinatarios.length > 0) {
    await admin.from('notifications').insert(
      destinatarios.map((d) => ({
        user_id: d.user_id,
        type: 'extra_added',
        title: 'Se agregó un adicional al servicio',
        body: `${label}: ${reason}`,
        link: d.link,
      })),
    );
  }

  await audit('add_extra', 'service_extras', orderId, null, { label, amount, reason });
  revalidatePath(`/admin/servicios/${orderId}`);
  revalidatePath(`/cliente/solicitudes/${orderId}`);
  revalidatePath(`/proveedor/servicios/${orderId}`);
  return { ok: true };
}

/** Quita un adicional cargado por error (del gruero o del propio admin). */
export async function adminRemoveExtra(extraId: string, orderId: string): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: gone, error } = await admin
    .from('service_extras')
    .delete()
    .eq('id', extraId)
    .select('id');
  if (error || !gone || gone.length === 0) return { ok: false, error: 'No pudimos quitarlo' };
  await audit('remove_extra', 'service_extras', extraId, { orderId }, null);
  revalidatePath(`/admin/servicios/${orderId}`);
  revalidatePath(`/cliente/solicitudes/${orderId}`);
  revalidatePath(`/proveedor/servicios/${orderId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Gestión de usuarios y administradores
// ---------------------------------------------------------------------------

/**
 * Cuenta de administración que NO se puede degradar por ningún medio. Es el
 * cierre anti-lockout: sin esto, un admin podría quitarse el rol a sí mismo (o
 * quitárselo al dueño) y dejar la plataforma sin nadie que la administre.
 */
const ADMIN_PROTEGIDO = 'juanpedimeolaa@gmail.com';

export interface UsuarioAdminRow {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  protegido: boolean;
}

/** Lista de usuarios con su mail (el mail vive en auth, no en profiles). */
export async function listUsers(query = ''): Promise<UsuarioAdminRow[]> {
  if (!(await ensureAdmin())) return [];
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emails = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? '']));
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, role, first_name, last_name')
    .order('created_at', { ascending: false });

  const q = query.trim().toLowerCase();
  return (profiles ?? [])
    .map((p) => {
      const email = emails.get(p.id) ?? '';
      return {
        id: p.id,
        email,
        role: p.role as string,
        first_name: p.first_name,
        last_name: p.last_name,
        protegido: email.toLowerCase() === ADMIN_PROTEGIDO,
      };
    })
    .filter((u) =>
      !q ||
      u.email.toLowerCase().includes(q) ||
      `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase().includes(q),
    );
}

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['client', 'provider_owner', 'admin']),
});

/**
 * Cambia el rol de un usuario. Pasar a `provider_owner` habilita el alta de
 * proveedor; volver a `client` NO borra la cuenta de proveedor, solo le saca el
 * acceso al panel (para poder revertirlo sin perder datos).
 */
export async function setUserRole(input: z.infer<typeof roleSchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  const { userId, role } = parsed.data;

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  const { data: target } = await admin.auth.admin.getUserById(userId);
  const email = (target?.user?.email ?? '').toLowerCase();
  const { data: prev } = await admin.from('profiles').select('role').eq('id', userId).single();
  if (!prev) return { ok: false, error: 'Usuario no encontrado' };

  // El dueño de la plataforma no puede perder el admin (ni por error propio).
  if (email === ADMIN_PROTEGIDO && role !== 'admin') {
    return { ok: false, error: 'Esta cuenta es la administración principal: no se le puede quitar el rol.' };
  }
  // Si alguien deja de ser proveedor, no puede quedar con servicios en curso.
  if (prev.role === 'provider_owner' && role !== 'provider_owner') {
    const { data: cuenta } = await admin
      .from('provider_accounts')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();
    if (cuenta) {
      const { count } = await admin
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', cuenta.id)
        .in('state', ['paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending']);
      if ((count ?? 0) > 0) {
        return { ok: false, error: `Tiene ${count} servicio(s) en curso: cerralos o cancelalos antes de cambiarle el rol.` };
      }
      // Se baja de la calle para no seguir recibiendo ofertas.
      await admin.from('provider_accounts').update({ is_available: false }).eq('id', cuenta.id);
    }
  }

  const { data: upd, error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id');
  if (error || !upd || upd.length === 0) return { ok: false, error: 'No pudimos cambiar el rol' };

  await audit('set_user_role', 'profiles', userId, { role: prev.role }, { role });
  revalidatePath('/admin/usuarios');
  return { ok: true };
}

const nuevoAdminSchema = z.object({
  email: z.string().trim().email('Mail inválido'),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres'),
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
});

/**
 * Alta de un administrador nuevo con mail y contraseña. Queda con el mail
 * confirmado para que pueda entrar en el acto (lo crea un admin, no hay que
 * verificar que el mail exista). Tiene exactamente los mismos permisos.
 */
export async function createAdminUser(input: z.infer<typeof nuevoAdminSchema>): Promise<Result> {
  if (!(await ensureAdmin())) return { ok: false, error: 'No autorizado' };
  const parsed = nuevoAdminSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const { email, password, firstName, lastName } = parsed.data;

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName ?? '', last_name: lastName ?? '' },
  });
  if (error || !created?.user) {
    const ya = (error?.message ?? '').toLowerCase().includes('already');
    return { ok: false, error: ya ? 'Ya existe un usuario con ese mail. Cambiale el rol desde la lista.' : (error?.message ?? 'No pudimos crear el usuario') };
  }

  // El trigger de alta crea el profile con rol 'client': lo promovemos a admin.
  const { error: rolErr } = await admin
    .from('profiles')
    .upsert({ id: created.user.id, role: 'admin', first_name: firstName ?? null, last_name: lastName ?? null });
  if (rolErr) return { ok: false, error: 'Se creó el usuario pero no pudimos darle el rol admin.' };

  await audit('create_admin', 'profiles', created.user.id, null, { email });
  revalidatePath('/admin/usuarios');
  return { ok: true };
}
