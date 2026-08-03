import { describe, it, expect } from 'vitest';
import { quote, billableKm, DEFAULT_PRICING } from '@/features/pricing/pricing';

describe('billableKm', () => {
  it('redondea hacia arriba al paso configurado, mínimo 1', () => {
    expect(billableKm(0)).toBe(1);
    expect(billableKm(500)).toBe(1);
    expect(billableKm(1000)).toBe(1);
    expect(billableKm(1200)).toBe(2);
    expect(billableKm(9900)).toBe(10);
    expect(billableKm(10000)).toBe(10);
  });
});

describe('quote', () => {
  it('calcula el desglose de 10 km sin dollys con los defaults', () => {
    const q = quote({ distanceMeters: 10_000, dollys: 0 }, DEFAULT_PRICING);
    // subtotal = 35000 + 10*2500 = 60000
    expect(q.subtotal_proveedor).toBe(60_000);
    // comisión = 20% de 60000 = 12000
    expect(q.comision_gruafy).toBe(12_000);
    // fee mp = 12000 * 0.0629 = 754.8 -> 755
    expect(q.fee_mp).toBe(755);
    // iva fee = 755 * 0.21 = 158.55 -> 159
    expect(q.iva_fee_mp).toBe(159);
    // pago inicial = 12000 + 755 + 159 = 12914
    expect(q.pago_inicial_cliente).toBe(12_914);
    // iva gruero = 60000 * 0.21 = 12600 ; saldo = 72600
    expect(q.iva_gruero).toBe(12_600);
    expect(q.saldo_estimado_gruero).toBe(72_600);
  });

  it('suma los dollys al subtotal', () => {
    const q = quote({ distanceMeters: 5_000, dollys: 1 }, DEFAULT_PRICING);
    // 35000 + 5*2500 + 120000 = 167500
    expect(q.subtotal_proveedor).toBe(167_500);
    expect(q.costo_dollys).toBe(120_000);
  });

  it('la comisión es exactamente el 20% del subtotal', () => {
    const q = quote({ distanceMeters: 23_400, dollys: 2 }, DEFAULT_PRICING);
    expect(q.comision_gruafy).toBe(Math.round(q.subtotal_proveedor * 0.2));
  });

  it('el importe del anticipo es entero (compatible con Mercado Pago)', () => {
    const q = quote({ distanceMeters: 7_777, dollys: 0 }, DEFAULT_PRICING);
    expect(Number.isInteger(q.pago_inicial_cliente)).toBe(true);
  });
});
