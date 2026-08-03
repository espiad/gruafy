import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';

const SECRET = 'test-webhook-secret-123';

beforeAll(() => {
  process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
});

function sign(dataId: string, requestId: string, ts: string): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

describe('verifyWebhookSignature', () => {
  it('acepta una firma válida', async () => {
    const { verifyWebhookSignature } = await import('@/lib/mercadopago/webhook');
    const xSignature = sign('123456', 'req-abc', '1700000000');
    expect(
      verifyWebhookSignature({ xSignature, xRequestId: 'req-abc', dataId: '123456' }),
    ).toBe(true);
  });

  it('rechaza una firma manipulada', async () => {
    const { verifyWebhookSignature } = await import('@/lib/mercadopago/webhook');
    const xSignature = sign('123456', 'req-abc', '1700000000').replace(/v1=.*/, 'v1=deadbeef');
    expect(
      verifyWebhookSignature({ xSignature, xRequestId: 'req-abc', dataId: '123456' }),
    ).toBe(false);
  });

  it('rechaza si falta el header de firma', async () => {
    const { verifyWebhookSignature } = await import('@/lib/mercadopago/webhook');
    expect(verifyWebhookSignature({ xSignature: null, xRequestId: 'r', dataId: '1' })).toBe(false);
  });

  it('rechaza si cambia el id del recurso', async () => {
    const { verifyWebhookSignature } = await import('@/lib/mercadopago/webhook');
    const xSignature = sign('123456', 'req-abc', '1700000000');
    expect(
      verifyWebhookSignature({ xSignature, xRequestId: 'req-abc', dataId: '999999' }),
    ).toBe(false);
  });
});
