import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/orders/status-badge';
import { PayButton } from '@/features/payments/pay-button';
import { SimulatePaymentButton } from '@/features/payments/simulate-payment-button';
import { serverEnv } from '@/lib/env';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { TrackingMap } from '@/components/maps/tracking-map';
import { ReviewForm } from '@/features/reviews/review-form';
import { OrderAutoRefresh, SearchingCard, PaymentCountdown } from '@/features/orders/order-live';
import { StatusHero } from '@/features/orders/status-hero';
import { SupportButton } from '@/features/support/support-button';
import { InvoiceButtons } from '@/features/orders/invoice-buttons';
import { haversineMeters } from '@/lib/geo/distance';
import { formatDateTime, formatARS } from '@/lib/format';
import { STATE_LABELS, isTerminal, type OrderState } from '@/features/orders/state-machine';
import type { QuoteBreakdown } from '@/features/pricing/pricing';

const REVEAL_STATES: OrderState[] = [
  'paid',
  'provider_en_route',
  'provider_arrived',
  'vehicle_loaded',
  'in_transit',
  'completion_pending',
  'completed',
];

export default async function SolicitudDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase.from('service_orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const { data: events } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  const state = order.state as OrderState;
  const pricing = order.pricing as unknown as QuoteBreakdown | null;
  const revealed = REVEAL_STATES.includes(state);

  const TRACK_STATES: OrderState[] = ['provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit'];
  const showMap = TRACK_STATES.includes(state);

  let provider: { legal_name: string; contact_phone: string | null; rating_avg: number } | null = null;
  let driverName: string | null = null;
  let truckPatente: string | null = null;
  let lastLoc: { lat: number; lng: number; created_at: string } | null = null;
  if (revealed && order.provider_id) {
    // Datos del proveedor/conductor/grúa: se revelan al pagar. Con service role
    // porque el cliente no es miembro del proveedor (RLS), trayendo solo lo público.
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const [{ data: p }, { data: loc }, { data: drv }, { data: trk }] = await Promise.all([
      admin.from('provider_accounts').select('legal_name, contact_phone, rating_avg').eq('id', order.provider_id).single(),
      admin.from('tracking_locations').select('lat, lng, created_at').eq('order_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      order.driver_id
        ? admin.from('provider_members').select('full_name').eq('id', order.driver_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('tow_trucks').select('patente').eq('provider_id', order.provider_id).limit(1).maybeSingle(),
    ]);
    provider = p;
    lastLoc = loc;
    driverName = drv?.full_name ?? null;
    truckPatente = trk?.patente ?? null;
  }

  // ETA aproximado a la recogida mientras la grúa va en camino (última posición → A).
  let etaMin: number | null = null;
  if (state === 'provider_en_route' && lastLoc && order.origin_lat != null && order.origin_lng != null) {
    const meters = haversineMeters({ lat: lastLoc.lat, lng: lastLoc.lng }, { lat: order.origin_lat, lng: order.origin_lng });
    etaMin = Math.max(1, Math.round(meters / 1000 / 30 * 60)); // ~30 km/h
  }

  let hasReview = false;
  if (state === 'completed') {
    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', id);
    hasReview = (count ?? 0) > 0;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/cliente" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Tu solicitud</h1>
        <StatusBadge state={state} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span>
            <strong>Origen:</strong> {order.origin_address ?? '—'}
            <br />
            <strong>Destino:</strong> {order.dest_address ?? '—'}
          </span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Creada el {formatDateTime(order.created_at)}</p>
      </div>

      {/* Actualiza la vista sola en todo estado activo (búsqueda → pago → tracking → cierre). */}
      <OrderAutoRefresh active={!isTerminal(state)} intervalMs={3000} />

      {state !== 'searching_provider' && <StatusHero state={state} role="cliente" etaMin={etaMin} />}

      {state === 'searching_provider' && (
        <SearchingCard orderId={order.id} deadline={order.offer_deadline} />
      )}

      {state === 'awaiting_payment' && order.amount_upfront != null && (
        <div className="rounded-2xl border-2 border-brand-orange bg-brand-orange/5 p-5">
          <h2 className="font-semibold">¡Una grúa aceptó! Reservá con el anticipo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagá el anticipo para confirmar la reserva. El resto se lo abonás al gruero al finalizar.
          </p>
          <div className="mt-4 space-y-3">
            <PaymentCountdown deadline={order.payment_deadline} />
            {serverEnv.mp().accessToken ? (
              <PayButton orderId={order.id} amount={order.amount_upfront} />
            ) : (
              <SimulatePaymentButton orderId={order.id} amount={order.amount_upfront} />
            )}
          </div>
        </div>
      )}

      {state === 'payment_pending' && (
        <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-5 text-center">
          <p className="font-medium">Estamos confirmando tu pago…</p>
          <p className="text-sm text-muted-foreground">Puede tardar unos segundos. No cierres esta pantalla.</p>
        </div>
      )}

      {(state === 'no_provider' ||
        state === 'payment_expired' ||
        state === 'cancelled_by_client' ||
        state === 'cancelled_by_provider' ||
        state === 'cancelled_by_admin') && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h2 className="font-semibold">
            {state === 'no_provider'
              ? 'No encontramos una grúa disponible'
              : state === 'payment_expired'
                ? 'Se venció el tiempo de pago'
                : 'La solicitud fue cancelada'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {state === 'no_provider'
              ? 'Por ahora no hay grúas cerca. No se te cobró nada. Probá de nuevo en un rato.'
              : state === 'payment_expired'
                ? 'La reserva se liberó porque no llegó el pago a tiempo. Podés volver a pedir.'
                : 'No se te cobró nada. Cuando quieras, pedí una nueva grúa.'}
          </p>
          <Button asChild className="mt-4">
            <Link href="/cliente/solicitar">Pedir una grúa</Link>
          </Button>
        </div>
      )}

      {revealed && provider && (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-5">
          <h2 className="font-semibold">Tu grúa</h2>
          <p className="mt-1 text-sm">
            <strong>{provider.legal_name}</strong> · ★ {provider.rating_avg.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">
            {driverName ? `Conductor: ${driverName}` : ''}
            {driverName && truckPatente ? ' · ' : ''}
            {truckPatente ? `Grúa ${truckPatente}` : ''}
          </p>
          {provider.contact_phone && (
            <div className="mt-3 flex gap-2">
              <a href={`tel:${provider.contact_phone.replace(/\D/g, '')}`} className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-input py-2 text-sm font-medium hover:bg-accent">
                <Phone className="h-4 w-4" /> Llamar
              </a>
              <a href={`https://wa.me/${provider.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-green py-2 text-sm font-semibold text-brand-cream">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            El seguimiento en vivo se actualiza solo mientras la grúa comparte su ubicación.
          </p>
        </div>
      )}

      {showMap && (
        <TrackingMap
          orderId={order.id}
          origin={order.origin_lat != null && order.origin_lng != null ? { lat: order.origin_lat, lng: order.origin_lng } : null}
          dest={order.dest_lat != null && order.dest_lng != null ? { lat: order.dest_lat, lng: order.dest_lng } : null}
          initialProvider={lastLoc ? { lat: lastLoc.lat, lng: lastLoc.lng, at: lastLoc.created_at } : null}
        />
      )}

      {/* Ayuda humana durante estados activos (incl. esperas que solo admin cancela). */}
      {!isTerminal(state) && state !== 'searching_provider' && (
        <SupportButton role="cliente" orderId={order.id} stateLabel={STATE_LABELS[state]} />
      )}

      {state === 'completed' && (
        <InvoiceButtons
          orderId={order.id}
          providerPhone={provider?.contact_phone ?? null}
          providerName={provider?.legal_name ?? null}
          amountUpfront={order.amount_upfront}
          amountService={pricing?.saldo_estimado_gruero ?? null}
        />
      )}

      {state === 'completed' && !hasReview && <ReviewForm orderId={order.id} />}

      {pricing && state !== 'searching_provider' && (
        <details className="rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer font-medium">Ver desglose del presupuesto</summary>
          <div className="mt-4">
            <QuoteBreakdownCard quote={pricing} />
          </div>
        </details>
      )}

      {state !== 'searching_provider' && (
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Historial</h2>
        <ol className="space-y-2">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
              <div>
                <p className="font-medium">{e.event}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(e.created_at)}
                  {e.to_state ? ` · ${STATE_LABELS[e.to_state as OrderState]}` : ''}
                </p>
              </div>
            </li>
          ))}
          {(!events || events.length === 0) && (
            <li className="text-sm text-muted-foreground">Sin eventos todavía.</li>
          )}
        </ol>
      </section>
      )}

      {order.amount_upfront != null && state !== 'searching_provider' && (
        <p className="text-center text-xs text-muted-foreground">
          Anticipo: {formatARS(order.amount_upfront)}
        </p>
      )}
    </div>
  );
}
