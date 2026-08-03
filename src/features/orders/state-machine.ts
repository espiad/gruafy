/**
 * Máquina de estados de una orden de servicio.
 *
 * Centraliza qué transiciones son válidas, qué actor puede dispararlas y qué
 * evento se registra. Nunca se debe cambiar el estado desde el cliente sin pasar
 * por acá (y por las políticas de servidor). Cada transición se persiste en
 * `order_events`.
 */

export const ORDER_STATES = [
  'draft',
  'quoted',
  'searching_provider',
  'provider_reserved',
  'awaiting_payment',
  'payment_pending',
  'paid',
  'provider_en_route',
  'provider_arrived',
  'vehicle_loaded',
  'in_transit',
  'completion_pending',
  'completed',
  'no_provider',
  'payment_expired',
  'cancelled_by_client',
  'cancelled_by_provider',
  'cancelled_by_admin',
  'refund_pending',
  'refunded',
  'disputed',
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export type Actor = 'client' | 'provider' | 'admin' | 'system';

export interface Transition {
  from: OrderState;
  to: OrderState;
  actors: Actor[];
  /** Etiqueta legible del evento generado. */
  event: string;
}

/** Estados terminales: no admiten transiciones salientes. */
export const TERMINAL_STATES: OrderState[] = [
  'completed',
  'no_provider',
  'payment_expired',
  'cancelled_by_client',
  'cancelled_by_provider',
  'cancelled_by_admin',
  'refunded',
];

const CANCEL_TRANSITIONS: Transition[] = [
  { from: 'searching_provider', to: 'cancelled_by_client', actors: ['client'], event: 'Cancelada por el cliente' },
  { from: 'provider_reserved', to: 'cancelled_by_client', actors: ['client'], event: 'Cancelada por el cliente' },
  { from: 'awaiting_payment', to: 'cancelled_by_client', actors: ['client'], event: 'Cancelada por el cliente' },
  { from: 'provider_reserved', to: 'cancelled_by_provider', actors: ['provider'], event: 'Cancelada por el proveedor' },
  { from: 'paid', to: 'cancelled_by_provider', actors: ['provider', 'admin'], event: 'Cancelada por el proveedor' },
  { from: 'provider_en_route', to: 'cancelled_by_provider', actors: ['provider', 'admin'], event: 'Cancelada por el proveedor' },
];

export const TRANSITIONS: Transition[] = [
  { from: 'draft', to: 'quoted', actors: ['client', 'system'], event: 'Presupuesto calculado' },
  { from: 'quoted', to: 'searching_provider', actors: ['client'], event: 'Búsqueda de grúa iniciada' },
  { from: 'searching_provider', to: 'provider_reserved', actors: ['provider', 'system'], event: 'Grúa aceptó el servicio' },
  { from: 'searching_provider', to: 'no_provider', actors: ['system'], event: 'Sin grúas disponibles' },
  { from: 'provider_reserved', to: 'awaiting_payment', actors: ['system'], event: 'A la espera del pago' },
  { from: 'awaiting_payment', to: 'payment_pending', actors: ['system'], event: 'Pago pendiente en Mercado Pago' },
  { from: 'awaiting_payment', to: 'paid', actors: ['system'], event: 'Pago confirmado' },
  { from: 'payment_pending', to: 'paid', actors: ['system'], event: 'Pago confirmado' },
  { from: 'awaiting_payment', to: 'payment_expired', actors: ['system'], event: 'Venció el tiempo de pago' },
  { from: 'payment_pending', to: 'payment_expired', actors: ['system'], event: 'Venció el tiempo de pago' },
  // Cuando la reserva expira sin pago, se puede reintentar la búsqueda.
  { from: 'payment_expired', to: 'searching_provider', actors: ['system', 'admin'], event: 'Reintento de búsqueda' },
  { from: 'paid', to: 'provider_en_route', actors: ['provider'], event: 'La grúa va en camino' },
  { from: 'provider_en_route', to: 'provider_arrived', actors: ['provider'], event: 'La grúa llegó' },
  { from: 'provider_arrived', to: 'vehicle_loaded', actors: ['provider'], event: 'Vehículo cargado' },
  { from: 'vehicle_loaded', to: 'in_transit', actors: ['provider'], event: 'En camino al destino' },
  { from: 'in_transit', to: 'completion_pending', actors: ['provider'], event: 'Entrega confirmada, cierre pendiente' },
  { from: 'completion_pending', to: 'completed', actors: ['provider', 'client', 'system'], event: 'Servicio finalizado' },
  // Reembolsos (solo desde admin sobre pagos válidos).
  { from: 'paid', to: 'refund_pending', actors: ['admin'], event: 'Reembolso solicitado' },
  { from: 'cancelled_by_provider', to: 'refund_pending', actors: ['admin'], event: 'Reembolso solicitado' },
  { from: 'disputed', to: 'refund_pending', actors: ['admin'], event: 'Reembolso solicitado' },
  { from: 'refund_pending', to: 'refunded', actors: ['admin', 'system'], event: 'Reembolso acreditado' },
  // Disputas.
  { from: 'completion_pending', to: 'disputed', actors: ['client', 'admin'], event: 'Servicio en disputa' },
  { from: 'completed', to: 'disputed', actors: ['admin'], event: 'Servicio en disputa' },
  // Cancelación administrativa desde casi cualquier estado activo.
  ...(['searching_provider', 'provider_reserved', 'awaiting_payment', 'payment_pending', 'paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit'] as OrderState[]).map(
    (from): Transition => ({ from, to: 'cancelled_by_admin', actors: ['admin'], event: 'Cancelada por administración' }),
  ),
  ...CANCEL_TRANSITIONS,
];

/** Busca una transición válida. */
export function findTransition(from: OrderState, to: OrderState): Transition | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/** ¿El actor puede pasar la orden de `from` a `to`? */
export function canTransition(from: OrderState, to: OrderState, actor: Actor): boolean {
  const t = findTransition(from, to);
  return Boolean(t && t.actors.includes(actor));
}

/** Estados alcanzables por un actor desde `from` (para pintar botones válidos). */
export function nextStates(from: OrderState, actor: Actor): OrderState[] {
  return TRANSITIONS.filter((t) => t.from === from && t.actors.includes(actor)).map((t) => t.to);
}

export function isTerminal(state: OrderState): boolean {
  return TERMINAL_STATES.includes(state);
}

export class InvalidTransitionError extends Error {
  constructor(
    public from: OrderState,
    public to: OrderState,
    public actor: Actor,
  ) {
    super(`Transición inválida: ${from} → ${to} para ${actor}`);
    this.name = 'InvalidTransitionError';
  }
}

/** Valida y devuelve el evento, o arroja si la transición no está permitida. */
export function assertTransition(from: OrderState, to: OrderState, actor: Actor): Transition {
  const t = findTransition(from, to);
  if (!t || !t.actors.includes(actor)) throw new InvalidTransitionError(from, to, actor);
  return t;
}

/** Etiquetas legibles (rioplatense) para mostrar el estado al usuario. */
export const STATE_LABELS: Record<OrderState, string> = {
  draft: 'Borrador',
  quoted: 'Presupuestado',
  searching_provider: 'Buscando grúa',
  provider_reserved: 'Grúa reservada',
  awaiting_payment: 'Esperando tu pago',
  payment_pending: 'Pago en revisión',
  paid: 'Pago confirmado',
  provider_en_route: 'Va hacia vos',
  provider_arrived: 'Llegó',
  vehicle_loaded: 'Vehículo cargado',
  in_transit: 'En camino al destino',
  completion_pending: 'Cierre pendiente',
  completed: 'Servicio finalizado',
  no_provider: 'Sin grúas disponibles',
  payment_expired: 'Pago vencido',
  cancelled_by_client: 'Cancelado por el cliente',
  cancelled_by_provider: 'Cancelado por la grúa',
  cancelled_by_admin: 'Cancelado por administración',
  refund_pending: 'Reembolso en curso',
  refunded: 'Reembolsado',
  disputed: 'En disputa',
};
