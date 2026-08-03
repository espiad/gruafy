import { describe, it, expect } from 'vitest';
import {
  canTransition,
  assertTransition,
  nextStates,
  isTerminal,
  InvalidTransitionError,
} from '@/features/orders/state-machine';

describe('máquina de estados', () => {
  it('permite el camino feliz del proveedor', () => {
    expect(canTransition('searching_provider', 'provider_reserved', 'provider')).toBe(true);
    expect(canTransition('paid', 'provider_en_route', 'provider')).toBe(true);
    expect(canTransition('provider_en_route', 'provider_arrived', 'provider')).toBe(true);
    expect(canTransition('in_transit', 'completion_pending', 'provider')).toBe(true);
  });

  it('bloquea saltos inválidos de estado', () => {
    expect(canTransition('paid', 'completed', 'provider')).toBe(false);
    expect(canTransition('searching_provider', 'in_transit', 'provider')).toBe(false);
  });

  it('respeta el actor autorizado', () => {
    // El cliente no puede avanzar el recorrido.
    expect(canTransition('paid', 'provider_en_route', 'client')).toBe(false);
    // Solo el sistema confirma el pago.
    expect(canTransition('awaiting_payment', 'paid', 'system')).toBe(true);
    expect(canTransition('awaiting_payment', 'paid', 'client')).toBe(false);
  });

  it('assertTransition arroja en transición inválida', () => {
    expect(() => assertTransition('paid', 'completed', 'provider')).toThrow(InvalidTransitionError);
  });

  it('nextStates lista destinos válidos por actor', () => {
    const next = nextStates('paid', 'provider');
    expect(next).toContain('provider_en_route');
  });

  it('reconoce estados terminales', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('refunded')).toBe(true);
    expect(isTerminal('paid')).toBe(false);
  });

  it('el admin puede cancelar desde estados activos', () => {
    expect(canTransition('paid', 'cancelled_by_admin', 'admin')).toBe(true);
    expect(canTransition('in_transit', 'cancelled_by_admin', 'admin')).toBe(true);
  });
});
