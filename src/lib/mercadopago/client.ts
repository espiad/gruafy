import 'server-only';
import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';
import { serverEnv, paymentsMode } from '@/lib/env';

/**
 * Configura el SDK oficial de Mercado Pago según el modo activo (test/producción).
 * Devuelve null si faltan credenciales, para poder degradar con gracia en dev.
 */
export function getMpConfig(): MercadoPagoConfig | null {
  const mp = serverEnv.mp();
  if (!mp.accessToken) return null;
  return new MercadoPagoConfig({
    accessToken: mp.accessToken,
    options: { timeout: 8000 },
  });
}

export function isLiveMode(): boolean {
  return paymentsMode() === 'production';
}

export function preferenceApi() {
  const cfg = getMpConfig();
  return cfg ? new Preference(cfg) : null;
}

export function paymentApi() {
  const cfg = getMpConfig();
  return cfg ? new Payment(cfg) : null;
}

export function refundApi() {
  const cfg = getMpConfig();
  return cfg ? new PaymentRefund(cfg) : null;
}
