import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/features/pricing/settings';
import { getProfile } from '@/lib/auth/session';
import { AvailabilityToggle } from '@/features/providers/availability-toggle';
import { OfferCard } from '@/features/providers/offer-card';
import { StatusBadge } from '@/components/orders/status-badge';
import { formatARS } from '@/lib/format';
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

  const settings = await getPlatformSettings();

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

  // Cargamos el detalle de las órdenes ofertadas (solo lo que el proveedor puede ver antes del pago).
  const orderIds = (offers ?? []).map((o) => o.order_id);
  const { data: offerOrders } = orderIds.length
    ? await supabase
        .from('service_orders')
        .select('id, dest_address, distance_meters, dollys, wheels_blocked, pricing, state')
        .in('id', orderIds)
    : { data: [] };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{provider.legal_name}</h1>
          <p className="text-sm text-muted-foreground">★ {provider.rating_avg.toFixed(1)} · {provider.rating_count} servicios</p>
        </div>
        <AvailabilityToggle initial={provider.is_available} />
      </div>

      {active && (
        <Link
          href={`/proveedor/servicios/${active.id}`}
          className="focus-ring block rounded-2xl border-2 border-brand-orange bg-brand-orange/5 p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-green">Servicio en curso</span>
            <StatusBadge state={active.state as OrderState} />
          </div>
          <p className="mt-2 text-sm">Destino: {active.dest_address}</p>
          <span className="mt-2 inline-block text-sm font-medium text-brand-green">Abrir servicio →</span>
        </Link>
      )}

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
                  rank={offer.rank}
                  createdAt={offer.created_at}
                  offerSeconds={settings.oferta_proveedor_segundos}
                  destAddress={order.dest_address}
                  distanceMeters={order.distance_meters}
                  dollys={order.dollys}
                  wheelsBlocked={order.wheels_blocked}
                  amountProvider={
                    (order.pricing as { saldo_estimado_gruero?: number } | null)?.saldo_estimado_gruero ?? null
                  }
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

      {active?.amount_upfront != null && (
        <p className="text-xs text-muted-foreground">Anticipo cobrado por gruafy: {formatARS(active.amount_upfront)}</p>
      )}
    </div>
  );
}
