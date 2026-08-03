import { describe, it, expect } from 'vitest';
import {
  isValidCuit,
  isValidDni,
  isValidPatente,
  normalizePatente,
  isValidVehicleYear,
} from '@/lib/validation/argentina';

describe('isValidCuit', () => {
  it('acepta CUITs con dígito verificador correcto', () => {
    expect(isValidCuit('30-71659554-0')).toBe(true);
    expect(isValidCuit('20-12345678-6')).toBe(true);
  });
  it('rechaza CUITs con dígito verificador incorrecto o longitud errónea', () => {
    expect(isValidCuit('30-71659554-9')).toBe(false);
    expect(isValidCuit('123')).toBe(false);
    expect(isValidCuit('')).toBe(false);
  });
});

describe('isValidDni', () => {
  it('acepta 7 u 8 dígitos', () => {
    expect(isValidDni('1234567')).toBe(true);
    expect(isValidDni('12.345.678')).toBe(true);
  });
  it('rechaza longitudes fuera de rango', () => {
    expect(isValidDni('123')).toBe(false);
    expect(isValidDni('123456789')).toBe(false);
  });
});

describe('patente', () => {
  it('normaliza a mayúsculas sin espacios', () => {
    expect(normalizePatente(' ab 123 cd ')).toBe('AB123CD');
  });
  it('acepta formato viejo y Mercosur (auto y moto)', () => {
    expect(isValidPatente('AAA123')).toBe(true);
    expect(isValidPatente('AB123CD')).toBe(true);
    expect(isValidPatente('A123BCD')).toBe(true);
  });
  it('rechaza formatos inválidos', () => {
    expect(isValidPatente('12AB')).toBe(false);
    expect(isValidPatente('ABCDEF')).toBe(false);
  });
});

describe('isValidVehicleYear', () => {
  it('acepta años razonables', () => {
    expect(isValidVehicleYear(2020, 2026)).toBe(true);
    expect(isValidVehicleYear(1950, 2026)).toBe(true);
  });
  it('rechaza años fuera de rango', () => {
    expect(isValidVehicleYear(1900, 2026)).toBe(false);
    expect(isValidVehicleYear(2030, 2026)).toBe(false);
  });
});
