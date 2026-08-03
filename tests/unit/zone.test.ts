import { describe, it, expect } from 'vitest';
import { zoneFromAddress } from '@/lib/geo/distance';

/**
 * `zoneFromAddress` protege la privacidad de una persona varada: los grueros ven
 * la ZONA de recogida (localidad/partido), nunca la calle y el número exactos,
 * hasta que aceptan y el cliente paga.
 */
describe('zoneFromAddress', () => {
  it('descarta calle y número, deja localidad/CP/país', () => {
    const zona = zoneFromAddress('Av. Corrientes 1234, C1043 CABA, Argentina');
    expect(zona).toBe('C1043 CABA, Argentina');
    expect(zona).not.toContain('1234');
    expect(zona).not.toContain('Corrientes');
  });

  it('nunca deja ver el número de puerta', () => {
    const zona = zoneFromAddress('Malabia 777, Villa Crespo, CABA');
    expect(zona).not.toContain('777');
  });

  it('cae a un genérico cuando no hay dirección', () => {
    expect(zoneFromAddress(null)).toBe('Zona del AMBA');
    expect(zoneFromAddress(undefined)).toBe('Zona del AMBA');
    expect(zoneFromAddress('')).toBe('Zona del AMBA');
  });

  it('con una sola parte no expone nada', () => {
    expect(zoneFromAddress('Mi ubicación actual')).toBe('Zona del AMBA');
  });
});
