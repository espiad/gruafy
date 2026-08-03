import 'server-only';
import crypto from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Verifica la firma HMAC del webhook de Mercado Pago.
 *
 * MP envía el header `x-signature` con la forma "ts=<ts>,v1=<hash>" y un
 * `x-request-id`. El manifiesto a firmar es:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * y se compara el HMAC-SHA256 con la clave secreta del webhook.
 */
export function verifyWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = serverEnv.mp().webhookSecret;
  if (!secret) return false;
  const { xSignature, xRequestId, dataId } = params;
  if (!xSignature || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k?.trim() ?? '', v?.trim() ?? ''];
    }),
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // El id numérico va en minúscula según la documentación de MP.
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId ?? ''};ts:${ts};`;
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  } catch {
    return false;
  }
}
