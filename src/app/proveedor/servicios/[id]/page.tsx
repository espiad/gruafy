import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, MessageCircle, User, Navigation, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/orders/status-badge';
import { ServiceActionsPanel } from '@/features/providers/service-actions-panel';
import { ExtraForm } from '@/features/providers/extra-form';
import { LocationSender } from '@/features/tracking/location-sender';
import { OrderAutoRefresh, OrderRealtime } from '@/features/orders/order-live';
import { StateAlert } from '@/features/orders/live-alert';
import { StatusHero } from '@/features/orders/status-hero';
import { FocusDetails } from '@/components/ui/focus-details';
import { SettlementCard, type SettlementExtra } from '@/features/orders/settlement-card';
import { ComplianceBanner } from '@/features/providers/compliance-banner';
import { SupportButton } from '@/features/support/support-button';
import { EmergencyButton } from '@/features/support/emergency-button';
import { getPlatformSettings } from '@/features/pricing/settings';
import { formatARS, formatDistance } from '@/lib/format';
import { STATE_LABELS, isTerminal, type OrderState } from '@/features/orders/state-machine';

// Incluye 'completed': al cerrar el servicio el gruero NO debe perder el contacto
// del cliente ni la dirección (los puede necesitar después).
const PAID_STATES: OrderState[] = ['paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending', 'completed'];
const ACTIVE_TRACK: OrderState[] = ['provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit'];

function digits(phone: string | null | undefined) {
  return (phone ?? '').replace(/\D/g, '');
}

export default async function ServicioPanel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase.from('service_orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const state = order.state as OrderState;
  const paid = PAID_STATES.includes(state);
  const settings = await getPlatformSettings();

  // Datos del cliente y vehículo solo después del pago. Con service role: el gruero
  // no es dueño de esos registros (la RLS de profiles/vehicles es "solo el titular"),
  // así que con el cliente normal venían vacíos y los botones de contacto nunca
  // aparecían. Es simétrico a que el cliente ve el contacto del gruero al pagar.
  let client: { first_name: string | null; last_name: string | null; phone: string | null } | null = null;
  let vehicle: { brand: string; model: string; year: number | null; patente: string; color: string | null } | null = null;
  let providerName: string | null = null;
  if (paid) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const [{ data: c }, { data: v }, { data: p }] = await Promise.all([
      admin.from('profiles').select('first_name, last_name, phone').eq('id', order.client_id).single(),
      order.vehicle_id
        ? admin.from('vehicles').select('brand, model, year, patente, color').eq('id', order.vehicle_id).single()
        : Promise.resolve({ data: null }),
      order.provider_id
        ? admin.from('provider_accounts').select('legal_name').eq('id', order.provider_id).single()
        : Promise.resolve({ data: null }),
    ]);
    client = c;
    vehicle = v;
    providerName = p?.legal_name ?? null;
  }

  const { data: extras } = await supabase
    .from('service_extras')
    .select('id, category, reason, amount, status')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  // Recordatorio de documentación pendiente, también durante el servicio.
  let compliance = null;
  if (order.provider_id) {
    const { data: prov } = await supabase.from('provider_accounts').select('id, created_at').eq('id', order.provider_id).maybeSingle();
    if (prov) {
      const { getCompliance } = await import('@/features/providers/drivers');
      compliance = await getCompliance(supabase, prov.id, settings.dias_gracia_documentacion, prov.created_at);
    }
  }

  const pricing = order.pricing as { saldo_estimado_gruero?: number } | null;
  const clientPhone = digits(client?.phone);

  // Factura al cliente por WhatsApp (al terminar). La foto/PDF de la factura la
  // adjunta el gruero en el chat; acá abrimos la conversación con el mensaje y el
  // total ya escritos. Solo si tenemos el teléfono del cliente.
  const extrasTotal = (extras ?? []).filter((e) => e.status !== 'rejected').reduce((a, e) => a + e.amount, 0);
  const totalGruero = (pricing?.saldo_estimado_gruero ?? 0) + extrasTotal;
  const facturaUrl =
    state === 'completed' && clientPhone
      ? `https://wa.me/${clientPhone}?text=${encodeURIComponent(
          `Hola${client?.first_name ? ' ' + client.first_name : ''}, te escribo por el servicio de grúa${providerName ? ` de ${providerName}` : ''} que hiciste con gruafy. Te adjunto la factura del servicio (total ${formatARS(totalGruero)}). ¡Gracias!`,
        )}`
      : null;

  // Navegación en Google Maps: gruero → recogida (A) → destino (B).
  const mapsUrl =
    paid && order.origin_lat != null && order.dest_lat != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.dest_lat},${order.dest_lng}&waypoints=${order.origin_lat},${order.origin_lng}&travelmode=driving`
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {!isTerminal(state) && <OrderRealtime orderId={order.id} />}
      {!isTerminal(state) && <OrderAutoRefresh active intervalMs={4000} />}
      {/* Aviso sonoro en CADA cambio de estado, también del lado del gruero. */}
      <StateAlert state={state} />

      <div className="flex items-center justify-between">
        <Link href="/proveedor" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver al panel
        </Link>
        <StatusBadge state={state} />
      </div>

      {compliance && <ComplianceBanner compliance={compliance} compact />}

      {/* FOCO: el estado actual, grande. */}
      <StatusHero state={state} role="gruero" />

      {/* Envío de ubicación en vivo (invisible) mientras el viaje está en curso. */}
      {ACTIVE_TRACK.includes(state) && <LocationSender orderId={order.id} intervalMs={7000} />}

      {/* LA acción de este paso: un solo botón grande. */}
      <ServiceActionsPanel
        orderId={order.id}
        state={state}
        origen={order.origin_lat != null && order.origin_lng != null ? { lat: order.origin_lat, lng: order.origin_lng } : null}
        destino={order.dest_lat != null && order.dest_lng != null ? { lat: order.dest_lat, lng: order.dest_lng } : null}
        motivoCancelacion={order.cancellation_reason}
        facturaUrl={facturaUrl}
      />

      {/* Liquidación: total a cobrarle al cliente (saldo + adicionales aprobados). */}
      {paid && pricing?.saldo_estimado_gruero != null && (
        <SettlementCard
          saldoBase={pricing.saldo_estimado_gruero}
          extras={(extras ?? []) as SettlementExtra[]}
          role="gruero"
        />
      )}

      {/* Para cumplirla: navegar y contactar. Es el trabajo, va visible (post-pago). */}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-brand-ink py-3 text-sm font-semibold text-brand-cream"
        >
          <Navigation className="h-4 w-4" /> Abrir ruta en Google Maps
        </a>
      )}

      {paid && client && (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4 text-brand-green" /> {[client.first_name, client.last_name].filter(Boolean).join(' ') || 'Cliente'}
          </p>
          {vehicle && (
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Car className="h-3.5 w-3.5" />
              {vehicle.color ? `${vehicle.color} ` : ''}{vehicle.brand} {vehicle.model} {vehicle.year ?? ''} · patente {vehicle.patente}
            </p>
          )}
          {clientPhone && (
            <div className="mt-3 flex gap-2">
              <a href={`tel:${clientPhone}`} className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-input py-2 text-sm font-medium hover:bg-accent">
                <Phone className="h-4 w-4" /> Llamar
              </a>
              <a href={`https://wa.me/${clientPhone}`} target="_blank" rel="noopener noreferrer" className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-green py-2 text-sm font-semibold text-brand-cream">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* Todo lo secundario, plegado: ruta escrita, monto a cobrar y adicionales. */}
      <FocusDetails summary="Ruta, monto y adicionales">
        <div>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span><strong>Recogida:</strong> {paid ? order.origin_address : 'Zona aproximada (se revela al pagar)'}</span>
          </p>
          <p className="mt-1.5 flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
            <span><strong>Destino:</strong> {order.dest_address}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Distancia {order.distance_meters ? formatDistance(order.distance_meters) : '—'}
            {order.dollys > 0 && ` · ${order.dollys} dolly(s)`}
            {order.wheels_blocked > 0 && ` · ${order.wheels_blocked} rueda(s) sin girar`}
          </p>
        </div>

        {paid && (
          <div>
            <p className="mb-1 text-sm font-medium">Adicionales</p>
            <p className="text-xs text-muted-foreground">
              Peajes, espera y demás. Llevan motivo y se suman al total en el acto.
            </p>
            <ul className="mt-3 space-y-2">
              {(extras ?? []).map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <span><strong>{e.category}</strong> — {e.reason}</span>
                  <span className="tabular-nums">{formatARS(e.amount)}</span>
                </li>
              ))}
              {(!extras || extras.length === 0) && <li className="text-sm text-muted-foreground">Sin adicionales.</li>}
            </ul>
            <div className="mt-4">
              <ExtraForm orderId={order.id} adicionales={settings.adicionales} />
            </div>
          </div>
        )}
      </FocusDetails>

      {/* Ayuda humana siempre a mano (también con el servicio ya cerrado). */}
      <SupportButton role="gruero" orderId={order.id} stateLabel={STATE_LABELS[state]} />
      {!isTerminal(state) && <EmergencyButton />}
    </div>
  );
}
