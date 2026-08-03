'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { signedDocUrl } from '@/lib/supabase/storage';

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
  await supabase.from('admin_audit_logs').insert({
    admin_id: user.id,
    action,
    entity,
    entity_id: entityId,
    before: (before ?? null) as never,
    after: (after ?? null) as never,
  });
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
  await audit('decide_provider', 'provider_accounts', parsed.data.providerId, { status: provider.status }, { status: parsed.data.decision });
  revalidatePath('/admin/proveedores');
  revalidatePath(`/admin/proveedores/${parsed.data.providerId}`);
  return { ok: true };
}

const settingsSchema = z.record(z.string(), z.union([z.number(), z.array(z.number()), z.array(z.string())]));

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

  await supabase
    .from('platform_settings')
    .update({ values: parsed.data as never, version: nextVersion, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
    .eq('id', 1);
  await audit('update_settings', 'platform_settings', '1', current?.values, parsed.data);
  revalidatePath('/admin/configuracion');
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

  const supabase = await createClient();
  const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).single();
  if (!payment) return { ok: false, error: 'Pago no encontrado' };
  if (payment.status !== 'approved') return { ok: false, error: 'Solo se reembolsan pagos aprobados' };

  const { data: refund } = await supabase
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
    await supabase.from('refunds').update({ status: processed ? 'processed' : 'failed' }).eq('id', refund.id);
  }
  await supabase.from('payments').update({ status: processed ? 'refunded' : payment.status }).eq('id', paymentId);
  await supabase.from('service_orders').update({ state: processed ? 'refunded' : 'refund_pending' }).eq('id', payment.order_id);
  await supabase.from('order_events').insert({
    order_id: payment.order_id,
    to_state: processed ? 'refunded' : 'refund_pending',
    actor_role: 'admin',
    event: processed ? 'Reembolso acreditado' : 'Reembolso en curso',
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
  const { data: order } = await supabase.from('service_orders').select('id, state').eq('id', orderId).single();
  if (!order) return { ok: false, error: 'Orden no encontrada' };

  await supabase.from('service_orders').update({ state: 'cancelled_by_admin', cancellation_reason: reason }).eq('id', orderId);
  await supabase.from('order_events').insert({
    order_id: orderId,
    from_state: order.state,
    to_state: 'cancelled_by_admin',
    actor_role: 'admin',
    event: 'Cancelada por administración',
  });
  await audit('cancel_order', 'service_orders', orderId, { state: order.state }, { state: 'cancelled_by_admin' });
  revalidatePath('/admin/servicios');
  return { ok: true };
}
