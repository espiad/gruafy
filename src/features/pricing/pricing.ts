/**
 * Motor de precios de gruafy.
 *
 * Reglas cerradas (prompt maestro): la comisión de gruafy es el 20% del subtotal
 * estimado del proveedor, y se cobra por adelantado vía Mercado Pago junto con el
 * fee de procesamiento y su IVA. El saldo del servicio se paga directo al gruero.
 *
 * Los parámetros viven en `platform_settings` (DB). Acá se definen los defaults y
 * las fórmulas puras, para poder testearlas y congelar un snapshot por orden.
 */

export interface PricingSettings {
  movida_base: number; // ARS
  precio_km: number; // ARS por km facturable
  dolly: number; // ARS por dolly
  comision_gruafy: number; // fracción, ej 0.20
  iva_gruero: number; // fracción, ej 0.21
  fee_mp: number; // fracción, ej 0.0629
  iva_fee_mp: number; // fracción, ej 0.21
  km_redondeo: number; // paso de redondeo de km, ej 1
}

/** Defaults iniciales. Deben coincidir con la migración de `platform_settings`. */
export const DEFAULT_PRICING: PricingSettings = {
  movida_base: 35000,
  precio_km: 2500,
  dolly: 120000,
  comision_gruafy: 0.2,
  iva_gruero: 0.21,
  fee_mp: 0.0629,
  iva_fee_mp: 0.21,
  km_redondeo: 1,
};

export interface QuoteInput {
  /** Distancia de la ruta (punto A → punto B) en metros. */
  distanceMeters: number;
  /** Cantidad de dollys requeridos. */
  dollys: number;
}

export interface QuoteBreakdown {
  km_facturables: number;
  movida_base: number;
  costo_km: number;
  costo_dollys: number;
  /** Base sobre la que trabaja el gruero (sin IVA). */
  subtotal_proveedor: number;
  iva_gruero: number;
  /** Lo que percibe el gruero al finalizar (subtotal + IVA + extras aparte). */
  saldo_estimado_gruero: number;
  /** Comisión de gruafy = 20% del subtotal. */
  comision_gruafy: number;
  fee_mp: number;
  iva_fee_mp: number;
  /** Lo que paga el cliente AHORA por Mercado Pago. */
  pago_inicial_cliente: number;
  /** Snapshot de settings usado. */
  settings: PricingSettings;
}

/**
 * Redondeo de kilómetros: se convierte metros → km y se redondea hacia arriba al
 * paso configurado (`km_redondeo`), con un mínimo de 1 km facturable. Documentado
 * así para que el importe sea predecible y nunca menor al real.
 */
export function billableKm(distanceMeters: number, step = DEFAULT_PRICING.km_redondeo): number {
  const km = distanceMeters / 1000;
  const rounded = Math.ceil(km / step) * step;
  return Math.max(step, rounded);
}

export function money(n: number): number {
  // Importes en ARS enteros para evitar arrastre de centavos frente a MP.
  return Math.round(n);
}

/** Calcula el desglose completo de un presupuesto a partir de la distancia y dollys. */
export function quote(input: QuoteInput, settings: PricingSettings = DEFAULT_PRICING): QuoteBreakdown {
  const km_facturables = billableKm(input.distanceMeters, settings.km_redondeo);
  const dollys = Math.max(0, Math.floor(input.dollys));

  const movida_base = money(settings.movida_base);
  const costo_km = money(km_facturables * settings.precio_km);
  const costo_dollys = money(dollys * settings.dolly);

  const subtotal_proveedor = movida_base + costo_km + costo_dollys;
  const iva_gruero = money(subtotal_proveedor * settings.iva_gruero);
  const saldo_estimado_gruero = subtotal_proveedor + iva_gruero;

  const comision_gruafy = money(subtotal_proveedor * settings.comision_gruafy);
  const fee_mp = money(comision_gruafy * settings.fee_mp);
  const iva_fee_mp = money(fee_mp * settings.iva_fee_mp);
  const pago_inicial_cliente = comision_gruafy + fee_mp + iva_fee_mp;

  return {
    km_facturables,
    movida_base,
    costo_km,
    costo_dollys,
    subtotal_proveedor,
    iva_gruero,
    saldo_estimado_gruero,
    comision_gruafy,
    fee_mp,
    iva_fee_mp,
    pago_inicial_cliente,
    settings,
  };
}
