import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/orders/status-badge';
import { ServiceActionsPanel } from '@/features/providers/service-actions-panel';
import { ExtraForm } from '@/features/providers/extra-form';
import { LocationSender } from '@/features/tracking/location-sender';
import { getPlatformSettings } from '@/features/pricing/settings';
import { formatARS, formatDistance, formatDateTime } from '@/lib/format';
import { type OrderState } from '@/features/orders/state-machine';

const PAID_STATES: OrderState[] = ['paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending'];
const ACTIVE_TRACK: OrderState[] = ['provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit'];

export default async function ServicioPanel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase.from('service_orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const state = order.state as OrderState;
  const paid = PAID_STATES.includes(state);
  const settings = await getPlatformSettings();

  // Datos del cliente y vehículo solo después del pago.
  let client: { first_name: string | null; last_name: string | null; phone: string | null } | null = null;
  let vehicle: { brand: string; model: string; patente: string } | null = null;
  if (paid) {
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase.from('profiles').select('first_name, last_name, phone').eq('id', order.client_id).single(),
      order.vehicle_id
        ? supabase.from('vehicles').select('brand, model, patente').eq('id', order.vehicle_id).single()
        : Promise.resolve({ data: null }),
    ]);
    client = c;
    vehicle = v;
  }

  const { data: extras } = await supabase
    .from('service_extras')
    .select('id, category, reason, amount, status')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  const pricing = order.pricing as { saldo_estimado_gruero?: number } | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/proveedor" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver al panel
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Servicio</h1>
        <StatusBadge state={state} />
      </div>

      {state === 'awaiting_payment' && (
        <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-5">
          <p className="font-medium">Esperando el pago del cliente</p>
          <p className="text-sm text-muted-foreground">No inicies el recorrido hasta que el pago esté confirmado.</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span>
            <strong>Origen:</strong> {paid ? order.origin_address : 'Zona aproximada (se revela al pagar)'}
            <br />
            <strong>Destino:</strong> {order.dest_address}
          </span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Distancia {order.distance_meters ? formatDistance(order.distance_meters) : '—'}
          {order.dollys > 0 && ` · ${order.dollys} dolly(s)`}
          {order.wheels_blocked > 0 && ` · ${order.wheels_blocked} rueda(s) bloqueadas`}
        </p>
        {pricing?.saldo_estimado_gruero != null && (
          <p className="mt-2 text-sm font-medium text-brand-green">
            A cobrar al cliente al finalizar: {formatARS(pricing.saldo_estimado_gruero)}
          </p>
        )}
      </div>

      {paid && client && (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-5">
          <h2 className="font-semibold">Cliente y vehículo</h2>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <User className="h-4 w-4" /> {[client.first_name, client.last_name].filter(Boolean).join(' ') || 'Cliente'}
          </p>
          {vehicle && <p className="text-sm text-muted-foreground">{vehicle.brand} {vehicle.model} · {vehicle.patente}</p>}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-green">
              <Phone className="h-4 w-4" /> Llamar al cliente
            </a>
          )}
        </div>
      )}

      {ACTIVE_TRACK.includes(state) && (
        <LocationSender orderId={order.id} intervalMs={7000} />
      )}

      <ServiceActionsPanel orderId={order.id} state={state} />

      {paid && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Adicionales</h2>
          <p className="text-sm text-muted-foreground">
            Peajes, espera u otros. Llevan motivo. Sobre {formatARS(settings.extra_tope_auto)} van a revisión.
          </p>
          <ul className="mt-3 space-y-2">
            {(extras ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span>
                  <strong>{e.category}</strong> — {e.reason}
                </span>
                <span className="tabular-nums">{formatARS(e.amount)}</span>
              </li>
            ))}
            {(!extras || extras.length === 0) && <li className="text-sm text-muted-foreground">Sin adicionales.</li>}
          </ul>
          <div className="mt-4">
            <ExtraForm orderId={order.id} categories={settings.extras_categorias} />
          </div>
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">Creado el {formatDateTime(order.created_at)}</p>
    </div>
  );
}
