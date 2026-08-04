import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { AvailabilityToggle } from '@/features/providers/availability-toggle';
import { OfferCard } from '@/features/providers/offer-card';
import { OrderAutoRefresh } from '@/features/orders/order-live';
import { NewOfferAlert } from '@/features/orders/live-alert';
import { HowTo } from '@/features/onboarding/how-to';
import { AppNudges } from '@/features/pwa/app-nudges';
import { StatusBadge } from '@/components/orders/status-badge';
import { formatARS } from '@/lib/format';
import { zoneFromAddress } from '@/lib/geo/distance';
import { isTerminal, type OrderState } from '@/features/orders/state-machine';

export default async function ProveedorPanel() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from('provider_accounts')
    .select('*')
    .eq('owner_id', profile!.id)
    .maybeSingle();

  if (!provider) redirect('/proveedor/onboarding');
  if (provider.status !== 'approved') redirect('/proveedor/estado-solicitud');

  // Servicio activo asignado a este proveedor.
  const { data: activeOrders } = await supabase
    .from('service_orders')
    .select('id, state, dest_address, amount_upfront, distance_meters')
    .eq('provider_id', provider.id)
    .order('updated_at', { ascending: false });
  const active = (activeOrders ?? []).find((o) => !isTerminal(o.state as OrderState));

  // Ofertas pendientes para este proveedor.
  const { data: offers } = await supabase
    .from('provider_offers')
    .select('id, order_id, rank, created_at, status, expires_at')
    .eq('provider_id', provider.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  // Datos de las órdenes ofertadas. Antes del pago el proveedor no está asignado,
  // así que RLS no lo deja leer la orden: traemos con service role SOLO los campos
  // no sensibles (destino, distancia, condiciones y monto), nunca el origen exacto
  // ni el contacto del cliente. Eso se revela recién después del pago.
  const orderIds = (offers ?? []).map((o) => o.order_id);
  let offerOrders: Array<{
    id: string;
    origin_address: string | null;
    dest_address: string | null;
    distance_meters: number | null;
    dollys: number;
    wheels_blocked: number;
    conditions: Record<string, unknown> | null;
    vehicle_id: string | null;
    pricing: unknown;
    state: string;
  }> = [];
  let offerVehicles: Record<string, { brand: string; model: string; year: number | null; color: string | null; gearbox: string }> = {};
  const situationPhotos: Record<string, string | null> = {};
  if (orderIds.length) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('service_orders')
        .select('id, origin_address, dest_address, distance_meters, dollys, wheels_blocked, conditions, vehicle_id, pricing, state')
        .in('id', orderIds)
        .eq('state', 'searching_provider');
      offerOrders = (data ?? []) as typeof offerOrders;
      // URL firmada de la foto de la situación (si el cliente la cargó), para verla
      // antes de aceptar. Corta (10 min) porque es dato sensible previo al pago.
      // En paralelo (no secuencial) para no encadenar latencias.
      await Promise.all(
        offerOrders.map(async (o) => {
          const path = (o.conditions as { situation_photo_path?: string } | null)?.situation_photo_path;
          if (!path) return;
          const { data: signed } = await admin.storage.from('documents').createSignedUrl(path, 600);
          situationPhotos[o.id] = signed?.signedUrl ?? null;
        }),
      );
      const vIds = offerOrders.map((o) => o.vehicle_id).filter(Boolean) as string[];
      if (vIds.length) {
        const { data: vs } = await admin
          .from('vehicles')
          .select('id, brand, model, year, gearbox, color')
          .in('id', vIds);
        offerVehicles = Object.fromEntries((vs ?? []).map((v) => [v.id, v]));
      }
    } catch {
      offerOrders = [];
    }
  }

  // Conductores para elegir quién maneja al aceptar.
  const { data: drivers } = await supabase
    .from('provider_members')
    .select('id, full_name, role')
    .eq('provider_id', provider.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-8">
      {/* Mientras está disponible, refresca para que aparezcan pedidos nuevos. */}
      <OrderAutoRefresh active={provider.is_available} intervalMs={5000} />
      {/* Beep + vibración + parpadeo del título cuando entra un pedido nuevo. */}
      {!active && provider.is_available && <NewOfferAlert count={offers?.length ?? 0} />}

      <AppNudges />
      <HowTo role="gruero" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{provider.legal_name}</h1>
          <p className="text-sm text-muted-foreground">★ {provider.rating_avg.toFixed(1)} · {provider.rating_count} servicios</p>
        </div>
        <AvailabilityToggle initial={provider.is_available} />
      </div>

      {active ? (
        // Con un servicio en curso, el foco es ese: nada de pedidos nuevos.
        <Link
          href={`/proveedor/servicios/${active.id}`}
          className="focus-ring block rounded-2xl border-2 border-brand-orange bg-brand-orange/5 p-6 text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-green">Tenés un servicio en curso</span>
          <div className="mt-2 flex items-center justify-center">
            <StatusBadge state={active.state as OrderState} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Destino: {active.dest_address}</p>
          <span className="mt-3 inline-block font-semibold text-brand-green">Abrir el servicio →</span>
        </Link>
      ) : (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pedidos para vos
        </h2>
        {!provider.is_available ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Ponete disponible para recibir pedidos.
          </p>
        ) : offers && offers.length > 0 ? (
          <div className="space-y-3">
            {offers.map((offer) => {
              const order = (offerOrders ?? []).find((o) => o.id === offer.order_id);
              if (!order) return null;
              return (
                <OfferCard
                  key={offer.id}
                  orderId={offer.order_id}
                  expiresAt={offer.expires_at}
                  originZone={zoneFromAddress(order.origin_address)}
                  destAddress={order.dest_address}
                  distanceMeters={order.distance_meters}
                  dollys={order.dollys}
                  wheelsBlocked={order.wheels_blocked}
                  wheelsUnsure={Boolean((order.conditions as { wheels_unsure?: boolean } | null)?.wheels_unsure)}
                  vehicleType={(order.conditions as { vehicle_type?: 'auto' | 'moto' } | null)?.vehicle_type}
                  vehicle={order.vehicle_id ? offerVehicles[order.vehicle_id] ?? null : null}
                  amountProvider={
                    (order.pricing as { saldo_estimado_gruero?: number } | null)?.saldo_estimado_gruero ?? null
                  }
                  drivers={drivers ?? []}
                  situationPhotoUrl={situationPhotos[order.id] ?? null}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay pedidos por ahora. Te avisamos apenas entre uno.
          </p>
        )}
      </section>
      )}

      {active?.amount_upfront != null && (
        <p className="text-xs text-muted-foreground">Anticipo cobrado por gruafy: {formatARS(active.amount_upfront)}</p>
      )}
    </div>
  );
}
