import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_PRICING, type PricingSettings } from './pricing';

export type AdicionalMode = 'libre' | 'fijo' | 'rango';

/** Definición de un tipo de adicional configurable por el admin (anti-fraude). */
export interface AdicionalDef {
  key: string;
  label: string;
  mode: AdicionalMode;
  /** Precio fijo (modo 'fijo'). */
  amount?: number;
  /** Rango permitido (modo 'rango'). */
  min?: number;
  max?: number;
  /** Máxima cantidad de líneas de este adicional por servicio. */
  max_cantidad?: number;
  activo: boolean;
}

export interface PlatformValues extends PricingSettings {
  max_pasajeros: number;
  oferta_proveedor_segundos: number;
  pago_cliente_segundos: number;
  radio_busqueda_km: number;
  extras_categorias: string[];
  extra_tope_auto: number;
  adicionales: AdicionalDef[];
  /** Días de gracia para completar DNI, licencia y foto de los conductores. */
  dias_gracia_documentacion: number;
}

export const DEFAULT_PLATFORM: PlatformValues = {
  ...DEFAULT_PRICING,
  max_pasajeros: 2,
  oferta_proveedor_segundos: 120,
  // Ventana para pagar el anticipo. Debe alcanzar para entrar a Checkout Pro,
  // loguearse en Mercado Pago y confirmar: 3 min era demasiado corto y la
  // preferencia expiraba durante el pago. 10 min es un margen realista.
  pago_cliente_segundos: 600,
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
  dias_gracia_documentacion: 7,
  // Catálogo de adicionales (anti-fraude). El gruero solo puede cargar de acá y
  // dentro de los límites. El admin lo edita desde Configuración.
  adicionales: [
    { key: 'peaje', label: 'Peaje', mode: 'rango', min: 1000, max: 20000, max_cantidad: 5, activo: true },
    { key: 'espera', label: 'Espera (por hora)', mode: 'rango', min: 5000, max: 30000, max_cantidad: 6, activo: true },
    { key: 'zanja', label: 'Sacar de zanja / cuneta', mode: 'rango', min: 20000, max: 150000, max_cantidad: 1, activo: true },
    { key: 'acceso', label: 'Acceso especial (cochera, subsuelo)', mode: 'rango', min: 5000, max: 80000, max_cantidad: 1, activo: true },
    { key: 'otro', label: 'Otro (a convenir con el cliente)', mode: 'libre', max_cantidad: 3, activo: true },
  ],
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

/**
 * Igual que `getPlatformSettings`, pero para páginas PÚBLICAS (visitante sin
 * sesión). La RLS de `platform_settings` solo permite leer a usuarios autenticados,
 * así que acá usamos service role: se exponen únicamente los valores de precio, que
 * de todos modos se le muestran al público en el simulador.
 */
export async function getPublicPlatformSettings(): Promise<PlatformValues> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data } = await createAdminClient()
      .from('platform_settings')
      .select('values')
      .eq('id', 1)
      .single();
    if (data?.values) return { ...DEFAULT_PLATFORM, ...(data.values as Partial<PlatformValues>) };
  } catch {
    /* sin service role: usamos defaults */
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
