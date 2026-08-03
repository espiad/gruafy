import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_PRICING, type PricingSettings } from './pricing';

export interface PlatformValues extends PricingSettings {
  max_pasajeros: number;
  oferta_proveedor_segundos: number;
  pago_cliente_segundos: number;
  radio_busqueda_km: number;
  extras_categorias: string[];
  extra_tope_auto: number;
}

export const DEFAULT_PLATFORM: PlatformValues = {
  ...DEFAULT_PRICING,
  max_pasajeros: 2,
  oferta_proveedor_segundos: 120,
  pago_cliente_segundos: 180,
  radio_busqueda_km: 25,
  extras_categorias: [
    'peajes',
    'espera',
    'dollys_no_informados',
    'ruedas_bloqueadas',
    'condicion_distinta',
    'acceso_especial',
  ],
  extra_tope_auto: 60000,
};

/** Carga los parámetros de la plataforma desde la DB, con fallback a defaults. */
export async function getPlatformSettings(): Promise<PlatformValues> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('platform_settings').select('values').eq('id', 1).single();
    if (data?.values) return { ...DEFAULT_PLATFORM, ...(data.values as Partial<PlatformValues>) };
  } catch {
    /* sin DB configurada: usamos defaults */
  }
  return DEFAULT_PLATFORM;
}

/** Extrae solo los campos de precio para el motor de `quote`. */
export function toPricingSettings(v: PlatformValues): PricingSettings {
  return {
    movida_base: v.movida_base,
    precio_km: v.precio_km,
    dolly: v.dolly,
    comision_gruafy: v.comision_gruafy,
    iva_gruero: v.iva_gruero,
    fee_mp: v.fee_mp,
    iva_fee_mp: v.iva_fee_mp,
    km_redondeo: v.km_redondeo,
  };
}
