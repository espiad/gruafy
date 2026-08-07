import type { OrderState } from './state-machine';
import { cn } from '@/lib/utils';
import { GruafyMark } from '@/components/brand/logo';

type Tone = 'orange' | 'green' | 'success' | 'warning' | 'muted';

interface Copy {
  emoji: string;
  /** Muestra el isotipo de gruafy en vez del emoji (no existe emoji de grúa). */
  mark?: boolean;
  title: string;
  sub: string;
  tone: Tone;
  pulse?: boolean;
}

/** Textos por estado, según quién mira (cliente o gruero). */
function copyFor(state: OrderState, role: 'cliente' | 'gruero', etaMin?: number | null): Copy | null {
  const eta = etaMin && etaMin > 0 ? `Llega en ${etaMin} min aprox. ` : '';
  const client: Partial<Record<OrderState, Copy>> = {
    awaiting_payment: { emoji: '🎉', title: '¡Una grúa aceptó tu pedido!', sub: 'Reservala pagando el anticipo acá abajo.', tone: 'orange', pulse: true },
    payment_pending: { emoji: '⏳', title: 'Confirmando tu pago…', sub: 'Puede tardar unos segundos. No cierres esta pantalla.', tone: 'warning', pulse: true },
    paid: { emoji: '✅', title: '¡Pago confirmado! Tu grúa ya viene', sub: 'Abajo tenés quién te va a buscar y su contacto.', tone: 'success' },
    provider_en_route: { emoji: '🚚', mark: true, title: 'Tu grúa va en camino', sub: `${eta}Seguila en vivo en el mapa.`, tone: 'success', pulse: true },
    provider_arrived: { emoji: '📍', title: '¡Tu grúa llegó!', sub: 'Acercate y coordiná con el conductor.', tone: 'success' },
    vehicle_loaded: { emoji: '🔧', title: 'Cargando tu vehículo', sub: 'En instantes salen hacia el destino.', tone: 'green' },
    in_transit: { emoji: '🛣️', mark: true, title: 'En camino al destino', sub: 'Seguí el recorrido en vivo.', tone: 'success', pulse: true },
    completion_pending: { emoji: '🏁', title: 'Llegaron al destino', sub: 'Pagale el saldo al gruero. Apenas cierre el servicio vas a poder dejarle tu reseña.', tone: 'green' },
    completed: { emoji: '⭐', title: 'Servicio finalizado', sub: '¡Gracias por usar gruafy! Dejá tu reseña.', tone: 'green' },
  };
  const provider: Partial<Record<OrderState, Copy>> = {
    awaiting_payment: { emoji: '⏳', title: 'Esperando el pago del cliente', sub: 'No arranques hasta confirmar. Se actualiza solo.', tone: 'warning', pulse: true },
    payment_pending: { emoji: '⏳', title: 'Confirmando el pago…', sub: 'Un momento. Se actualiza solo.', tone: 'warning', pulse: true },
    paid: { emoji: '✅', title: '¡El cliente pagó! Ya podés salir', sub: 'Tenés sus datos y la ruta abajo. Iniciá el viaje.', tone: 'success', pulse: true },
    provider_en_route: { emoji: '🚚', mark: true, title: 'Vas en camino a la recogida', sub: 'Compartí tu ubicación y avisá cuando llegues.', tone: 'success' },
    provider_arrived: { emoji: '📍', title: 'Llegaste a la recogida', sub: 'Confirmá la carga cuando esté todo listo.', tone: 'success' },
    vehicle_loaded: { emoji: '🔧', title: 'Vehículo cargado', sub: 'Iniciá el viaje al destino.', tone: 'green' },
    in_transit: { emoji: '🛣️', mark: true, title: 'En camino al destino', sub: 'Confirmá la entrega al llegar.', tone: 'green' },
    completion_pending: { emoji: '🏁', title: 'Entregado', sub: 'Cerrá el servicio para finalizar.', tone: 'green' },
    completed: { emoji: '⭐', title: 'Servicio finalizado', sub: '¡Buen trabajo!', tone: 'green' },
  };
  return (role === 'cliente' ? client : provider)[state] ?? null;
}

const TONE: Record<Tone, string> = {
  orange: 'bg-brand-orange text-brand-ink',
  green: 'bg-brand-green text-brand-cream',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning/20 text-brand-ink border-2 border-warning',
  muted: 'bg-muted text-muted-foreground',
};

/**
 * Cartel grande y animado con el estado actual. Se re-anima en cada cambio
 * (key por estado) para que la transición sea imposible de pasar por alto.
 */
export function StatusHero({
  state,
  role,
  etaMin,
}: {
  state: OrderState;
  role: 'cliente' | 'gruero';
  etaMin?: number | null;
}) {
  const c = copyFor(state, role, etaMin);
  if (!c) return null;
  return (
    <div key={state} className={cn('animate-fade-in rounded-3xl p-5 shadow-sm sm:p-6', TONE[c.tone])}>
      <div className="flex items-center gap-4">
        {c.mark ? (
          <GruafyMark className={cn('h-10 w-auto shrink-0 sm:h-12', c.pulse && 'animate-pulse-soft')} />
        ) : (
          <span className={cn('text-4xl sm:text-5xl', c.pulse && 'animate-pulse-soft')} aria-hidden>
            {c.emoji}
          </span>
        )}
        <div>
          <h2 className="font-display text-xl leading-tight sm:text-2xl">{c.title}</h2>
          <p className="mt-1 text-sm opacity-90">{c.sub}</p>
        </div>
      </div>
    </div>
  );
}
