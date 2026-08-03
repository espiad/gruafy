import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { TrackingMap } from '@/components/maps/tracking-map';
import { StatusHero } from '@/features/orders/status-hero';
import { OrderAutoRefresh } from '@/features/orders/order-live';
import { haversineMeters } from '@/lib/geo/distance';
import { STATE_LABELS, isTerminal, type OrderState } from '@/features/orders/state-machine';

export const metadata: Metadata = { title: 'Seguimiento en vivo', robots: { index: false } };

const TRACK_STATES: OrderState[] = ['paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending'];

/**
 * Seguimiento público y read-only (link compartible, tipo Uber). No pide login ni
 * muestra datos personales: solo estado, mapa con la grúa, y ETA. Se accede con el
 * id de la orden (UUID no adivinable).
 */
export default async function SeguirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { createAdminClient } = await import('@/lib/supabase/admin');
  let order: {
    state: string;
    origin_lat: number | null;
    origin_lng: number | null;
    dest_lat: number | null;
    dest_lng: number | null;
    provider_id: string | null;
  } | null = null;
  let providerName: string | null = null;
  let lastLoc: { lat: number; lng: number; created_at: string } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('service_orders')
      .select('state, origin_lat, origin_lng, dest_lat, dest_lng, provider_id')
      .eq('id', id)
      .single();
    order = data;
    if (order?.provider_id) {
      const [{ data: p }, { data: loc }] = await Promise.all([
        admin.from('provider_accounts').select('legal_name, last_lat, last_lng, last_location_at').eq('id', order.provider_id).single(),
        admin.from('tracking_locations').select('lat, lng, created_at').eq('order_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      providerName = p?.legal_name ?? null;
      lastLoc =
        loc ??
        (p?.last_lat != null && p?.last_lng != null
          ? { lat: p.last_lat, lng: p.last_lng, created_at: p.last_location_at ?? new Date().toISOString() }
          : null);
    }
  } catch {
    order = null;
  }

  if (!order) notFound();
  const state = order.state as OrderState;

  let etaMin: number | null = null;
  if (state === 'provider_en_route' && lastLoc && order.origin_lat != null && order.origin_lng != null) {
    const meters = haversineMeters({ lat: lastLoc.lat, lng: lastLoc.lng }, { lat: order.origin_lat, lng: order.origin_lng });
    etaMin = Math.max(1, Math.round((meters / 1000 / 30) * 60));
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-brand-cream/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="focus-ring rounded-md"><Logo variant="green" /></Link>
          <span className="text-xs text-muted-foreground">Seguimiento en vivo</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {!isTerminal(state) && <OrderAutoRefresh active intervalMs={4000} />}

        {TRACK_STATES.includes(state) ? (
          <>
            <StatusHero state={state} role="cliente" etaMin={etaMin} />
            <TrackingMap
              orderId={id}
              origin={order.origin_lat != null && order.origin_lng != null ? { lat: order.origin_lat, lng: order.origin_lng } : null}
              dest={order.dest_lat != null && order.dest_lng != null ? { lat: order.dest_lat, lng: order.dest_lng } : null}
              initialProvider={lastLoc ? { lat: lastLoc.lat, lng: lastLoc.lng, at: lastLoc.created_at } : null}
            />
            {providerName && <p className="text-center text-sm text-muted-foreground">Grúa: <strong>{providerName}</strong></p>}
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="font-display text-xl">Seguimiento</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isTerminal(state) ? 'Este servicio ya finalizó.' : `Estado: ${STATE_LABELS[state]}. El mapa en vivo se activa cuando la grúa está en camino.`}
            </p>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">Compartido desde gruafy · seguimiento sin datos personales</p>
      </main>
    </div>
  );
}
