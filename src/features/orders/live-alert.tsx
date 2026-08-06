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
/** Un aviso por CADA estado del servicio: ninguno pasa desapercibido. */
const ALERTS: Record<string, string> = {
  searching_provider: '🔎 Buscando tu grúa…',
  awaiting_payment: '✅ ¡Una grúa aceptó! Reservá con el anticipo',
  payment_pending: '⏳ Estamos confirmando tu pago',
  paid: '💳 Pago confirmado — tu grúa está en camino',
  provider_en_route: '🚚 Tu grúa va en camino — recordá: máx. 2 personas',
  provider_arrived: '📍 Tu grúa llegó al punto de encuentro',
  vehicle_loaded: '🔧 Tu vehículo ya está cargado',
  in_transit: '🛣️ En camino al destino',
  completion_pending: '🏁 Llegaron al destino',
  completed: '⭐ Servicio finalizado — dejanos tu reseña',
  no_provider: '😕 No encontramos una grúa disponible',
  payment_expired: '⌛ Se venció el tiempo de pago',
  cancelled_by_client: '❌ La solicitud fue cancelada',
  cancelled_by_provider: '❌ La grúa canceló el servicio',
  cancelled_by_admin: '❌ El servicio fue cancelado',
};

export function StateAlert({ state }: { state: string }) {
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (prev.current !== null && prev.current !== state) {
      notify(ALERTS[state] ?? 'Tu servicio cambió de estado');
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
