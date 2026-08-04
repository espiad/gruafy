'use client';

import { useEffect, useRef } from 'react';
import { notify } from '@/lib/alerts';

/**
 * Avisa (beep + vibración + parpadeo de título) cuando aumenta la cantidad de
 * pedidos ofertados al gruero. El estado persiste entre `router.refresh()`, así
 * que compara contra el conteo anterior real: solo suena ante un pedido NUEVO.
 */
export function NewOfferAlert({ count }: { count: number }) {
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (prev.current !== null && count > prev.current) {
      notify('🚗 ¡Nuevo pedido en gruafy!');
    }
    prev.current = count;
  }, [count]);
  return null;
}

/**
 * Avisa al cliente cuando su solicitud entra en un estado importante (una grúa
 * aceptó, se confirmó el pago, la grúa llegó, se completó). Evita que se pierda
 * el cambio si dejó el teléfono a un lado.
 */
const ALERTS: Record<string, string> = {
  awaiting_payment: '✅ ¡Una grúa aceptó! Reservá con el anticipo',
  paid: '💳 Pago confirmado — tu grúa está en camino',
  provider_arrived: '📍 Tu grúa llegó al punto de encuentro',
  completed: '🏁 Servicio completado',
};

export function StateAlert({ state }: { state: string }) {
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (prev.current !== null && prev.current !== state && ALERTS[state]) {
      notify(ALERTS[state]);
    }
    prev.current = state;
  }, [state]);
  return null;
}

/**
 * Avisa (beep + vibración + título) cuando un conteo accionable aumenta. Genérico:
 * lo usa el admin para novedades (proveedores pendientes, servicios entrando).
 */
export function CountAlert({ count, message }: { count: number; message: string }) {
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (prev.current !== null && count > prev.current) {
      notify(message);
    }
    prev.current = count;
  }, [count, message]);
  return null;
}
