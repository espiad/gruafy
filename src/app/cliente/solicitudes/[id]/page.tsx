import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/orders/status-badge';
import { PayButton } from '@/features/payments/pay-button';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { TrackingMap } from '@/components/maps/tracking-map';
import { ReviewForm } from '@/features/reviews/review-form';
import { formatDateTime, formatARS } from '@/lib/format';
import { STATE_LABELS, type OrderState } from '@/features/orders/state-machine';
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
  let lastLoc: { lat: number; lng: number; created_at: string } | null = null;
  if (revealed && order.provider_id) {
    const [{ data: p }, { data: loc }] = await Promise.all([
      supabase.from('provider_accounts').select('legal_name, contact_phone, rating_avg').eq('id', order.provider_id).single(),
      supabase.from('tracking_locations').select('lat, lng, created_at').eq('order_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    provider = p;
    lastLoc = loc;
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

      {state === 'searching_provider' && (
        <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-5 text-center">
          <Clock className="mx-auto h-6 w-6 animate-pulse-soft text-warning" />
          <p className="mt-2 font-medium">Buscando una grúa disponible cerca tuyo…</p>
          <p className="text-sm text-muted-foreground">Te avisamos apenas una acepte. No se cobra nada todavía.</p>
        </div>
      )}

      {state === 'awaiting_payment' && order.amount_upfront != null && (
        <div className="rounded-2xl border-2 border-brand-orange bg-brand-orange/5 p-5">
          <h2 className="font-semibold">¡Una grúa aceptó! Reservá con el anticipo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tenés unos minutos para pagar y confirmar la reserva.
          </p>
          <div className="mt-4">
            <PayButton orderId={order.id} amount={order.amount_upfront} />
          </div>
        </div>
      )}

      {revealed && provider && (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-5">
          <h2 className="font-semibold">Tu grúa</h2>
          <p className="mt-1 text-sm">
            <strong>{provider.legal_name}</strong> · ★ {provider.rating_avg.toFixed(1)}
          </p>
          {provider.contact_phone && (
            <a href={`tel:${provider.contact_phone}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-green">
              <Phone className="h-4 w-4" /> Llamar
            </a>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            El seguimiento en vivo en el mapa se activa mientras la grúa comparte su ubicación.
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

      {state === 'completed' && !hasReview && <ReviewForm orderId={order.id} />}

      {pricing && (
        <details className="rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer font-medium">Ver desglose del presupuesto</summary>
          <div className="mt-4">
            <QuoteBreakdownCard quote={pricing} />
          </div>
        </details>
      )}

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

      {order.amount_upfront != null && (
        <p className="text-center text-xs text-muted-foreground">
          Anticipo: {formatARS(order.amount_upfront)}
        </p>
      )}
    </div>
  );
}
