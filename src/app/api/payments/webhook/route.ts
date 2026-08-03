import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhookSignature } from '@/lib/mercadopago/webhook';
import { reconcilePayment } from '@/features/payments/service';

/**
 * Webhook de Mercado Pago. Verifica la firma, responde rápido y reconcilia el
 * pago con una consulta server-to-server (única fuente de verdad). Idempotente.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');

  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    action?: string;
    data?: { id?: string };
  };

  // El id del recurso puede venir en el body o en el query (?data.id=).
  const dataId = body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id');

  const valid = verifyWebhookSignature({ xSignature, xRequestId, dataId });
  if (!valid) {
    // Firma inválida: no procesamos. 401 para que MP reintente si fue un problema transitorio.
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const topic = body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  if (topic !== 'payment' || !dataId) {
    // Otros topics (merchant_order, etc.) se aceptan sin procesar.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    await reconcilePayment(dataId);
  } catch (err) {
    // Ante un fallo (posiblemente transitorio), devolvemos 500 para que Mercado
    // Pago REINTENTE. reconcilePayment es idempotente, así que reintentar es seguro.
    // Si respondiéramos 200, MP lo daría por procesado y un pago aprobado podría
    // quedar sin confirmar la orden.
    console.error('[mp-webhook] error reconciliando pago', dataId, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'reintentar' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
