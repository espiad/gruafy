import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/orders/status-badge';
import { PayButton } from '@/features/payments/pay-button';
import { SimulatePaymentButton } from '@/features/payments/simulate-payment-button';
import { serverEnv, publicEnv } from '@/lib/env';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { TrackingMap } from '@/components/maps/tracking-map-lazy';
import { ReviewForm } from '@/features/reviews/review-form';
import { OrderAutoRefresh, OrderRealtime, SearchingCard, PaymentCountdown, CancelAwaitingPayment } from '@/features/orders/order-live';
import { StateAlert } from '@/features/orders/live-alert';
import { FocusDetails } from '@/components/ui/focus-details';
import { Star, ShieldCheck } from 'lucide-react';
import { StatusHero } from '@/features/orders/status-hero';
import { SupportButton } from '@/features/support/support-button';
import { EmergencyButton } from '@/features/support/emergency-button';
import { InvoiceButtons } from '@/features/orders/invoice-buttons';
import { InsuranceGuide } from '@/features/orders/insurance-guide';
import { SettlementCard, type SettlementExtra } from '@/features/orders/settlement-card';
import { LowRatingActions } from '@/features/orders/low-rating-actions';
import { PassengersCheck } from '@/features/orders/passengers-check';
import { ShareTrackingButton } from '@/features/orders/share-tracking-button';
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

export default async function SolicitudDetalle({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_id?: string; collection_id?: string; pago?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  let { data: order } = await supabase.from('service_orders').select('*').eq('id', id).single();
  if (!order) notFound();

  // Al volver de Mercado Pago, confirmamos el pago server-to-server (fuente de
  // verdad: consulta directa a MP). El retorno del navegador solo nos da el id.
  const mpPaymentId = sp.payment_id || sp.collection_id;
  if (mpPaymentId && (order.state === 'awaiting_payment' || order.state === 'payment_pending')) {
    try {
      const { reconcilePayment } = await import('@/features/payments/service');
      await reconcilePayment(mpPaymentId);
      const { data: refreshed } = await supabase.from('service_orders').select('*').eq('id', id).single();
      if (refreshed) order = refreshed;
    } catch {
      /* si falla, el webhook o un reintento lo resuelven */
    }
  }

  const { data: events } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  const state = order.state as OrderState;
  const pricing = order.pricing as unknown as QuoteBreakdown | null;
  const revealed = REVEAL_STATES.includes(state);
  const mpConfigured = Boolean(serverEnv.mp().accessToken);

  const { getPlatformSettings } = await import('@/features/pricing/settings');
  const settings = await getPlatformSettings();
  const maxPasajeros = settings.max_pasajeros;
  const puedeSimular = settings.permitir_pago_simulado !== false;
  const ventanaPagoSeg = settings.pago_cliente_segundos;

  const TRACK_STATES: OrderState[] = ['provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit'];
  const showMap = TRACK_STATES.includes(state);

  let provider: { legal_name: string; contact_phone: string | null; rating_avg: number } | null = null;
  let driverName: string | null = null;
  let truckPatente: string | null = null;
  let driverPhotoUrl: string | null = null;
  let lastLoc: { lat: number; lng: number; created_at: string } | null = null;
  if (revealed && order.provider_id) {
    // Datos del proveedor/conductor/grúa: se revelan al pagar. Con service role
    // porque el cliente no es miembro del proveedor (RLS), trayendo solo lo público.
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const [{ data: p }, { data: loc }, { data: drv }, { data: trk }] = await Promise.all([
      admin.from('provider_accounts').select('legal_name, contact_phone, rating_avg, last_lat, last_lng, last_location_at').eq('id', order.provider_id).single(),
      admin.from('tracking_locations').select('lat, lng, created_at').eq('order_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      order.driver_id
        ? admin.from('provider_members').select('full_name').eq('id', order.driver_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('tow_trucks').select('patente').eq('provider_id', order.provider_id).limit(1).maybeSingle(),
    ]);
    provider = p;
    // Fallback: si todavía no hay puntos de tracking del viaje, usamos la última
    // ubicación conocida de la grúa (de cuando se puso disponible / se movió).
    lastLoc =
      loc ??
      (p?.last_lat != null && p?.last_lng != null
        ? { lat: p.last_lat, lng: p.last_lng, created_at: p.last_location_at ?? new Date().toISOString() }
        : null);
    driverName = drv?.full_name ?? null;
    truckPatente = trk?.patente ?? null;

    // Foto del conductor (rescatista) para que el cliente vea a quién esperar.
    if (order.driver_id) {
      const { data: photoDoc } = await admin
        .from('provider_documents')
        .select('storage_path')
        .eq('member_id', order.driver_id)
        .eq('doc_type', 'foto')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (photoDoc?.storage_path) {
        const { data: signed } = await admin.storage.from('documents').createSignedUrl(photoDoc.storage_path, 3600);
        driverPhotoUrl = signed?.signedUrl ?? null;
      }
    }
  }

  // Confianza pre-pago: antes de que el cliente pague ya sabemos qué grúa aceptó.
  // Le mostramos reputación y patente (para decidir con confianza), pero NO el
  // teléfono ni el contacto: eso se revela recién cuando paga.
  let prepay: { legal_name: string; rating_avg: number; rating_count: number; truckPatente: string | null; driverPhotoUrl: string | null } | null = null;
  if ((state === 'awaiting_payment' || state === 'payment_pending') && order.provider_id) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const [{ data: p }, { data: trk }, { data: photoDoc }] = await Promise.all([
      admin.from('provider_accounts').select('legal_name, rating_avg, rating_count').eq('id', order.provider_id).single(),
      admin.from('tow_trucks').select('patente').eq('provider_id', order.provider_id).limit(1).maybeSingle(),
      order.driver_id
        ? admin.from('provider_documents').select('storage_path').eq('member_id', order.driver_id).eq('doc_type', 'foto').order('created_at', { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    let dPhoto: string | null = null;
    if (photoDoc?.storage_path) {
      const { data: signed } = await admin.storage.from('documents').createSignedUrl(photoDoc.storage_path, 3600);
      dPhoto = signed?.signedUrl ?? null;
    }
    if (p) {
      prepay = {
        legal_name: p.legal_name,
        rating_avg: p.rating_avg,
        rating_count: p.rating_count,
        truckPatente: trk?.patente ?? null,
        driverPhotoUrl: dPhoto,
      };
    }
  }

  // Adicionales del servicio, para la liquidación (qué pagarle al gruero).
  const SETTLEMENT_STATES: OrderState[] = ['provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending', 'completed'];
  let extras: SettlementExtra[] = [];
  if (SETTLEMENT_STATES.includes(state)) {
    const { data } = await supabase
      .from('service_extras')
      .select('id, category, reason, amount, status')
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    extras = (data ?? []) as SettlementExtra[];
  }

  // ETA aproximado a la recogida mientras la grúa va en camino (última posición → A).
  let etaMin: number | null = null;
  if (state === 'provider_en_route' && lastLoc && order.origin_lat != null && order.origin_lng != null) {
    const meters = haversineMeters({ lat: lastLoc.lat, lng: lastLoc.lng }, { lat: order.origin_lat, lng: order.origin_lng });
    etaMin = Math.max(1, Math.round(meters / 1000 / 30 * 60)); // ~30 km/h
  }

  // Los adicionales aprobados forman parte de lo que el cliente realmente paga:
  // el comprobante para el seguro los omitía y subdeclaraba el reintegro.
  const extrasAprobados = extras.filter((e) => e.status !== 'rejected').reduce((a, e) => a + e.amount, 0);


  let myReview: { rating: number; comment: string | null } | null = null;
  let vehicleLabel: string | null = null;
  if (state === 'completed') {
    const [{ data: r }, { data: v }] = await Promise.all([
      supabase.from('reviews').select('rating, comment').eq('order_id', id).maybeSingle(),
      order.vehicle_id
        ? supabase.from('vehicles').select('brand, model, year, patente, color').eq('id', order.vehicle_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    myReview = r ?? null;
    if (v) {
      vehicleLabel = [v.color, v.brand, v.model, v.year, v.patente ? `(${v.patente})` : null]
        .filter(Boolean)
        .join(' ');
    }
  }

  // Al terminar el servicio, dejamos visibles SOLO la reseña y los comprobantes/
  // reintegro. El resto (contacto de la grúa, liquidación) queda plegado: sigue a un
  // toque, pero no compite con lo único que el cliente tiene que hacer ahora.
  const esCompletado = state === 'completed';

  // Tarjeta de contacto con la grúa. La extraemos para poder mostrarla suelta durante
  // el servicio y plegada una vez terminado, sin duplicar el markup.
  const grueroContact =
    revealed && provider ? (
      <div className="rounded-2xl border border-success/40 bg-success/5 p-4">
        <div className="flex items-center gap-3">
          {driverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={driverPhotoUrl} alt={driverName ?? 'Conductor'} className="h-14 w-14 shrink-0 rounded-full border border-border object-cover" />
          )}
          <div>
            <p className="text-sm">
              <strong>{provider.legal_name}</strong> · ★ {provider.rating_avg.toFixed(1)}
              {truckPatente ? ` · Grúa ${truckPatente}` : ''}
            </p>
            {driverName && <p className="text-xs text-muted-foreground">Te rescata: {driverName}</p>}
          </div>
        </div>
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
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/cliente" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <StatusBadge state={state} />
      </div>

      {/* Actualiza la vista sola en todo estado activo (búsqueda → pago → tracking → cierre). */}
      {!isTerminal(state) && <OrderRealtime orderId={order.id} />}
      <OrderAutoRefresh active={!isTerminal(state)} intervalMs={4000} />
      {/* Aviso perceptible (beep + vibración + título) al cambiar a un estado clave. */}
      <StateAlert state={state} />

      {/* FOCO: el estado actual, grande, arriba de todo. Una sola cosa que mirar. */}
      {state === 'searching_provider' ? (
        <SearchingCard orderId={order.id} deadline={order.offer_deadline} />
      ) : (
        <StatusHero state={state} role="cliente" etaMin={etaMin} />
      )}

      {/* Quién te va a asistir: reputación y patente, para que pagues con confianza. */}
      {prepay && (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            <h2 className="font-semibold">Una grúa te aceptó</h2>
          </div>
          <div className="mt-2 flex items-center gap-3">
            {prepay.driverPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prepay.driverPhotoUrl} alt="Conductor" className="h-12 w-12 shrink-0 rounded-full border border-border object-cover" />
            )}
            <p className="text-sm">
              <strong>{prepay.legal_name}</strong>
              {prepay.driverPhotoUrl && <span className="block text-xs text-muted-foreground">Así vas a reconocer a quien te asiste</span>}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {prepay.rating_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />
                {prepay.rating_avg.toFixed(1)} · {prepay.rating_count} servicio{prepay.rating_count === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-brand-orange" /> Grúa nueva en la red
              </span>
            )}
            {prepay.truckPatente && <span>· Patente {prepay.truckPatente}</span>}
          </div>
          {prepay.rating_count >= 1 && prepay.rating_avg <= 2 ? (
            <div className="mt-3 rounded-md bg-warning/15 p-2.5">
              <p className="text-xs text-warning-foreground">
                Esta grúa tiene una reputación baja ({prepay.rating_avg.toFixed(1)}★). Mirá sus reseñas,
                buscá otra, o continuá con el pago acá abajo.
              </p>
              {order.provider_id && (
                <LowRatingActions orderId={order.id} providerId={order.provider_id} providerName={prepay.legal_name} />
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Vas a ver su ubicación en vivo y sus datos de contacto apenas confirmes el anticipo.
            </p>
          )}
        </div>
      )}

      {/* Resultado que devuelve Mercado Pago al volver al navegador. Estaba
          declarado en searchParams pero no se leía: a quien le rechazaban la
          tarjeta le aparecía otra vez la misma pantalla de cobro, sin una sola
          palabra de que el pago había fallado. */}
      {sp.pago === 'error' && state === 'awaiting_payment' && (
        <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-4">
          <p className="font-semibold text-destructive">No se pudo completar el pago</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mercado Pago rechazó la operación y <strong>no se te cobró nada</strong>. Probá otra vez o
            con otro medio de pago; la reserva sigue en pie hasta que se acabe el tiempo.
          </p>
        </div>
      )}
      {sp.pago === 'pendiente' && state !== 'paid' && (
        <div className="rounded-2xl border-2 border-warning bg-warning/10 p-4">
          <p className="font-semibold">Tu pago quedó pendiente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mercado Pago todavía lo está procesando. Apenas lo confirme te avisamos y la grúa sale.
            No hace falta que pagues de nuevo.
          </p>
        </div>
      )}

      {state === 'awaiting_payment' && order.amount_upfront != null && (
        <div className="rounded-2xl border-2 border-brand-orange bg-brand-orange/5 p-5">
          <h2 className="font-semibold">Reservá con el anticipo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagá el anticipo para confirmar la reserva. El resto se lo abonás al gruero al finalizar.
          </p>
          <div className="mt-4 space-y-3">
            <PaymentCountdown deadline={order.payment_deadline} windowSeconds={ventanaPagoSeg} />
            {mpConfigured ? (
              <>
                <PayButton orderId={order.id} amount={order.amount_upfront} />
                {/* En modo test, red de seguridad para la demo (no cobra de verdad). */}
                {puedeSimular && (
                  <SimulatePaymentButton orderId={order.id} amount={order.amount_upfront} context="fallback" />
                )}
              </>
            ) : (
              <SimulatePaymentButton orderId={order.id} amount={order.amount_upfront} />
            )}
            <CancelAwaitingPayment orderId={order.id} />
          </div>
        </div>
      )}

      {state === 'payment_pending' && (
        <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-5 text-center">
          <p className="font-medium">Estamos confirmando tu pago…</p>
          <p className="text-sm text-muted-foreground">Puede tardar unos segundos. No cierres esta pantalla.</p>
        </div>
      )}

      {/* Reembolsos y disputas. Antes estos tres estados no tenían NADA: el cliente
          al que le devolvían la plata abría su pedido y veía una pantalla en blanco,
          sin monto, sin explicación y sin siquiera un botón de soporte. */}
      {(state === 'refund_pending' || state === 'refunded' || state === 'disputed') && (
        <div className="rounded-2xl border-2 border-brand-orange bg-brand-orange/5 p-6 text-center">
          <h2 className="font-display text-xl">
            {state === 'refunded'
              ? 'Te devolvimos el anticipo'
              : state === 'refund_pending'
                ? 'Tu devolución está en camino'
                : 'Estamos revisando este servicio'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {state === 'refunded'
              ? 'La devolución ya salió de nuestro lado. Según tu banco o tarjeta puede tardar unos días hábiles en aparecerte.'
              : state === 'refund_pending'
                ? 'Estamos procesando la devolución del anticipo con Mercado Pago. Te avisamos cuando se acredite.'
                : 'Hubo un reclamo sobre este servicio y lo está viendo una persona del equipo. Te contactamos apenas tengamos una respuesta.'}
          </p>
          {order.amount_upfront != null && state !== 'disputed' && (
            <p className="mt-3 text-base font-semibold">
              Importe: {formatARS(order.amount_upfront)}
            </p>
          )}
          {order.cancellation_reason && (
            <div className="mx-auto mt-4 max-w-md rounded-xl bg-card p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo</p>
              <p className="mt-1 text-base">{order.cancellation_reason}</p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/cliente">Volver al inicio</Link>
            </Button>
          </div>
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
                : 'No se te cobró nada.'}
          </p>
          {/* El motivo, bien visible: si lo canceló la grúa o el admin, el cliente
              tiene derecho a saber por qué sin ir a buscarlo al historial. */}
          {order.cancellation_reason && (state === 'cancelled_by_provider' || state === 'cancelled_by_admin' || state === 'cancelled_by_client') && (
            <div className="mx-auto mt-4 max-w-md rounded-xl bg-muted p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo</p>
              <p className="mt-1 text-base">{order.cancellation_reason}</p>
            </div>
          )}
          {/* Si ya había pagado y la baja no fue suya, lo que necesita saber es qué
              pasa con su plata y con su auto. Antes solo veía "la solicitud fue
              cancelada" y quedaba sin saber si había perdido el anticipo. */}
          {order.amount_upfront != null &&
            (state === 'cancelled_by_admin' || state === 'cancelled_by_provider') && (
              <div className="mx-auto mt-4 max-w-md rounded-xl border border-brand-green/30 bg-brand-green/5 p-4 text-left">
                <p className="text-sm font-semibold">Qué pasa ahora</p>
                <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                  <li>· Te devolvemos el anticipo de {formatARS(order.amount_upfront)} completo.</li>
                  <li>· Te vamos a llamar de soporte para ver cómo seguís con tu vehículo.</li>
                  <li>· No tenés que pagarle nada al gruero.</li>
                </ul>
                {publicEnv.whatsapp && (
                  <a
                    href={`https://wa.me/${publicEnv.whatsapp}?text=${encodeURIComponent(
                      `Hola, me cancelaron el servicio ${order.id.slice(0, 8)} y necesito ayuda.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="h-4 w-4" /> Escribinos ahora
                  </a>
                )}
              </div>
            )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/cliente/solicitar">Pedir una grúa</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/cliente">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Terminado: lo primero es la reseña, en grande. Es LA acción de esta pantalla. */}
      {state === 'completed' && !myReview && <ReviewForm orderId={order.id} />}
      {state === 'completed' && myReview && (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm font-medium">Tu reseña</p>
          <span className="mt-1 inline-flex justify-center" aria-label={`${myReview.rating} de 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={n <= myReview!.rating ? 'h-5 w-5 fill-brand-orange text-brand-orange' : 'h-5 w-5 text-muted-foreground/40'} />
            ))}
          </span>
          {myReview.comment && <p className="mt-2 text-sm text-muted-foreground">{myReview.comment}</p>}
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/cliente">Volver al inicio</Link>
          </Button>
        </div>
      )}

      {/* Seguimiento en vivo: el mapa ES el objetivo mientras la grúa se mueve. */}
      {showMap && (
        <>
          <TrackingMap
            orderId={order.id}
            origin={order.origin_lat != null && order.origin_lng != null ? { lat: order.origin_lat, lng: order.origin_lng } : null}
            dest={order.dest_lat != null && order.dest_lng != null ? { lat: order.dest_lat, lng: order.dest_lng } : null}
            initialProvider={lastLoc ? { lat: lastLoc.lat, lng: lastLoc.lng, at: lastLoc.created_at } : null}
          />
          <ShareTrackingButton orderId={order.id} />
        </>
      )}

      {/* Contacto con la grúa: suelto mientras dura el servicio, plegado al terminar. */}
      {grueroContact &&
        (esCompletado ? (
          <FocusDetails summary="Datos de la grúa que te asistió">{grueroContact}</FocusDetails>
        ) : (
          grueroContact
        ))}

      {/* Liquidación: qué pagarle al gruero (saldo + adicionales). Al terminar, plegada. */}
      {SETTLEMENT_STATES.includes(state) && pricing && (
        esCompletado ? (
          <FocusDetails summary="Detalle de lo que pagaste">
            <SettlementCard saldoBase={pricing.saldo_estimado_gruero ?? 0} extras={extras} role="cliente" anticipo={order.amount_upfront} />
          </FocusDetails>
        ) : (
          <SettlementCard saldoBase={pricing.saldo_estimado_gruero ?? 0} extras={extras} role="cliente" anticipo={order.amount_upfront} />
        )
      )}

      {/* Cupo del vehículo: hay que responderlo, no alcanza con avisar. */}
      {(state === 'paid' || state === 'provider_en_route') && (
        <PassengersCheck orderId={order.id} max={maxPasajeros} />
      )}

      {/* Ayuda humana durante estados activos (incl. esperas que solo admin cancela). */}
      {!isTerminal(state) && state !== 'searching_provider' && (
        <>
          <SupportButton role="cliente" orderId={order.id} stateLabel={STATE_LABELS[state]} />
          <EmergencyButton />
        </>
      )}

      {/* Comprobantes y reintegro: VISIBLE al terminar, junto con la reseña. Son las
          dos únicas cosas que el cliente quiere a mano recién cerrado el servicio. */}
      {state === 'completed' && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Comprobantes y reintegro del seguro</h2>
          <InvoiceButtons
            orderId={order.id}
            providerPhone={provider?.contact_phone ?? null}
            providerName={provider?.legal_name ?? null}
            amountUpfront={order.amount_upfront}
            amountService={pricing ? pricing.saldo_estimado_gruero + extrasAprobados : null}
          />
          <InsuranceGuide
            orderId={order.id}
            originAddress={order.origin_address}
            destAddress={order.dest_address}
            completedAt={order.completed_at}
            vehicle={vehicleLabel}
            providerName={provider?.legal_name ?? null}
            amountUpfront={order.amount_upfront}
            amountService={pricing ? pricing.saldo_estimado_gruero + extrasAprobados : null}
          />
        </div>
      )}

      {/* Todo lo secundario, plegado: no distrae del paso actual, pero está a un toque. */}
      <FocusDetails summary="Ver detalles del viaje">
        <div>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
            <span>
              <strong>Origen:</strong> {order.origin_address ?? '—'}
              <br />
              <strong>Destino:</strong> {order.dest_address ?? '—'}
            </span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Creada el {formatDateTime(order.created_at)}</p>
          {order.amount_upfront != null && (
            <p className="mt-1 text-xs text-muted-foreground">Anticipo pagado a gruafy: {formatARS(order.amount_upfront)}</p>
          )}
        </div>

        {pricing && (
          <div>
            <p className="mb-2 text-sm font-medium">Desglose del presupuesto</p>
            {/* Con los adicionales: sin esto, esta misma pantalla mostraba dos
                "Total del servicio" distintos (acá sin extras, arriba con ellos). */}
            <QuoteBreakdownCard
              quote={pricing}
              extrasTotal={extras.filter((e) => e.status !== 'rejected').reduce((a, e) => a + e.amount, 0)}
            />
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">Historial</p>
          <ol className="space-y-2">
            {(events ?? []).map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
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
        </div>
      </FocusDetails>
    </div>
  );
}
