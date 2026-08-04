import 'server-only';
import { randomUUID } from 'node:crypto';
import { preferenceApi, paymentApi, isLiveMode } from '@/lib/mercadopago/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { publicEnv } from '@/lib/env';
import type { PaymentStatus } from '@/types/database';

/**
 * Crea la preferencia de Mercado Pago para el anticipo de una orden y persiste
 * el registro de pago. El importe enviado a MP coincide exactamente con el
 * `amount_upfront` congelado en la orden.
 */
export async function createUpfrontPreference(orderId: string) {
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from('service_orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (error || !order) throw new Error('Orden inexistente');
  if (order.state !== 'awaiting_payment') throw new Error('La orden no está esperando pago');
  if (!order.amount_upfront || order.amount_upfront <= 0) throw new Error('Importe inválido');

  const pref = preferenceApi();
  if (!pref) throw new Error('Mercado Pago no está configurado');

  const idempotencyKey = randomUUID();
  const expiresIso = order.payment_deadline ?? new Date(Date.now() + 180_000).toISOString();

  const result = await pref.create({
    body: {
      items: [
        {
          id: `upfront-${orderId}`,
          title: 'Anticipo gruafy (reserva de grúa)',
          quantity: 1,
          unit_price: order.amount_upfront,
          currency_id: 'ARS',
        },
      ],
      external_reference: orderId,
      notification_url: `${publicEnv.appUrl}/api/payments/webhook`,
      back_urls: {
        success: `${publicEnv.appUrl}/cliente/solicitudes/${orderId}?pago=ok`,
        pending: `${publicEnv.appUrl}/cliente/solicitudes/${orderId}?pago=pendiente`,
        failure: `${publicEnv.appUrl}/cliente/solicitudes/${orderId}?pago=error`,
      },
      auto_return: 'approved',
      expires: true,
      expiration_date_to: expiresIso,
      binary_mode: true,
    },
    requestOptions: { idempotencyKey },
  });

  await admin.from('payments').insert({
    order_id: orderId,
    type: 'gruafy_upfront',
    mp_preference_id: result.id ?? null,
    external_reference: orderId,
    amount: order.amount_upfront,
    status: 'created',
    live_mode: isLiveMode(),
    idempotency_key: idempotencyKey,
  });

  // En test dirigimos al entorno sandbox (ahí funcionan las tarjetas y usuarios de
  // prueba); en producción, al checkout real. Evita el error "una de las partes es
  // de prueba" que aparece al abrir el checkout de producción con credenciales test.
  const checkoutUrl = isLiveMode()
    ? result.init_point
    : result.sandbox_init_point ?? result.init_point;

  return {
    preferenceId: result.id,
    checkoutUrl,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}

const STATUS_MAP: Record<string, PaymentStatus> = {
  approved: 'approved',
  authorized: 'approved',
  pending: 'pending',
  in_process: 'pending',
  in_mediation: 'pending',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'refunded',
};

/**
 * Procesa un pago consultado server-to-server. Idempotente: si el pago ya está
 * en estado final, no reprocesa. Actualiza `payments` y, si corresponde, avanza
 * la orden a `paid` registrando el evento.
 */
export async function reconcilePayment(mpPaymentId: string): Promise<void> {
  const api = paymentApi();
  if (!api) throw new Error('Mercado Pago no está configurado');

  const payment = await api.get({ id: mpPaymentId });
  const orderId = payment.external_reference;
  if (!orderId) return;

  const status = STATUS_MAP[payment.status ?? ''] ?? 'pending';
  const admin = createAdminClient();

  // Validaciones de consistencia: moneda e importe contra la orden.
  const { data: order } = await admin.from('service_orders').select('*').eq('id', orderId).single();
  if (!order) return;

  const amountOk =
    typeof payment.transaction_amount === 'number' &&
    order.amount_upfront != null &&
    Math.round(payment.transaction_amount) === order.amount_upfront;
  const currencyOk = payment.currency_id === 'ARS';

  // Upsert idempotente del pago por mp_payment_id.
  const { data: existing } = await admin
    .from('payments')
    .select('id,status')
    .eq('mp_payment_id', String(mpPaymentId))
    .maybeSingle();

  const normalized = {
    status: payment.status,
    status_detail: payment.status_detail,
    transaction_amount: payment.transaction_amount,
    currency_id: payment.currency_id,
    date_approved: payment.date_approved,
    payment_method_id: payment.payment_method_id,
  };

  // Registro del pago (idempotente por mp_payment_id). No cortamos acá: la
  // idempotencia real es por ESTADO de la orden (abajo), con update guardado.
  if (existing) {
    await admin
      .from('payments')
      .update({ status, normalized, live_mode: Boolean(payment.live_mode) })
      .eq('id', existing.id);
  } else {
    await admin.from('payments').insert({
      order_id: orderId,
      type: 'gruafy_upfront',
      mp_payment_id: String(mpPaymentId),
      mp_preference_id: null,
      external_reference: orderId,
      amount: Math.round(payment.transaction_amount ?? order.amount_upfront ?? 0),
      status,
      live_mode: Boolean(payment.live_mode),
      normalized,
    });
  }

  // Aprobado con importe y moneda correctos → paid. Update GUARDADO por estado:
  // solo transiciona si la orden sigue esperando pago (idempotente, y no pisa una
  // cancelación/expiración que haya entrado en la carrera).
  if (status === 'approved' && amountOk && currencyOk) {
    const { data: updated } = await admin
      .from('service_orders')
      .update({ state: 'paid', paid_at: new Date().toISOString() })
      .eq('id', orderId)
      .in('state', ['awaiting_payment', 'payment_pending'])
      .select('id');
    if (updated && updated.length > 0) {
      await admin.from('order_events').insert({
        order_id: orderId,
        to_state: 'paid',
        actor_role: null,
        event: 'Pago confirmado',
        meta: { mp_payment_id: String(mpPaymentId) },
      });
    }
  } else if (status === 'pending') {
    await admin
      .from('service_orders')
      .update({ state: 'payment_pending' })
      .eq('id', orderId)
      .eq('state', 'awaiting_payment');
  } else if (status === 'refunded' || status === 'cancelled') {
    // Contracargo/reembolso originado en MP sobre una orden ya pagada.
    const { data: updated } = await admin
      .from('service_orders')
      .update({ state: 'refund_pending' })
      .eq('id', orderId)
      .eq('state', 'paid')
      .select('id');
    if (updated && updated.length > 0) {
      await admin.from('order_events').insert({
        order_id: orderId,
        to_state: 'refund_pending',
        actor_role: null,
        event: 'Reembolso/contracargo notificado por Mercado Pago',
        meta: { mp_payment_id: String(mpPaymentId) },
      });
    }
  }
}
