import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { type OrderState } from '@/features/orders/state-machine';
import { OrderAutoRefresh } from '@/features/orders/order-live';
import { CountAlert } from '@/features/orders/live-alert';
import { ExtrasReview } from '@/features/admin/extras-review';

async function count(table: string, filter?: (q: ReturnType<Awaited<ReturnType<typeof createClient>>['from']>) => unknown) {
  const supabase = await createClient();
  let q = supabase.from(table as 'service_orders').select('*', { count: 'exact', head: true });
  if (filter) q = filter(q) as typeof q;
  const { count: c } = await q;
  return c ?? 0;
}

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: string }) {
  return (
    <Link href={href} className={`focus-ring block rounded-2xl border border-border bg-card p-5 hover:border-brand-orange ${tone ?? ''}`}>
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const inState = (states: OrderState[]) => async () => {
    const { count: c } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .in('state', states);
    return c ?? 0;
  };

  const [searching, awaiting, active, completed, cancelled, providersPending, paymentsApproved, paymentsRejected] =
    await Promise.all([
      inState(['searching_provider'])(),
      inState(['awaiting_payment', 'payment_pending'])(),
      inState(['paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending'])(),
      inState(['completed'])(),
      inState(['cancelled_by_client', 'cancelled_by_provider', 'cancelled_by_admin', 'no_provider', 'payment_expired'])(),
      count('provider_accounts', (q) => q.in('status', ['submitted', 'under_review'])),
      count('payments', (q) => q.eq('status', 'approved')),
      count('payments', (q) => q.eq('status', 'rejected')),
    ]);

  // Adicionales que superaron el tope y esperan decisión.
  const { data: extrasPendientes } = await supabase
    .from('service_extras')
    .select('id, order_id, category, reason, amount')
    .eq('status', 'needs_review')
    .order('created_at', { ascending: false });

  // Novedades accionables: si suben, suena/vibra para que el admin no las pierda.
  const actionable = searching + awaiting + providersPending + (extrasPendientes?.length ?? 0);

  return (
    <div className="space-y-8">
      {/* Se refresca solo y avisa cuando entran novedades para atender. */}
      <OrderAutoRefresh active intervalMs={8000} />
      <CountAlert count={actionable} message="🔔 Nueva actividad en gruafy (admin)" />
      <h1 className="font-display text-2xl">Dashboard</h1>

      <ExtrasReview extras={extrasPendientes ?? []} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Servicios</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Buscando grúa" value={searching} href="/admin/servicios?estado=searching_provider" />
          <Stat label="Esperando pago" value={awaiting} href="/admin/servicios?estado=awaiting_payment" />
          <Stat label="Activos" value={active} href="/admin/servicios?estado=activos" />
          <Stat label="Finalizados" value={completed} href="/admin/servicios?estado=completed" />
          <Stat label="Cancelados" value={cancelled} href="/admin/servicios?estado=cancelados" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Operación</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Proveedores pendientes" value={providersPending} href="/admin/proveedores?estado=pendientes" tone={providersPending > 0 ? 'border-brand-orange' : ''} />
          <Stat label="Pagos aprobados" value={paymentsApproved} href="/admin/pagos" />
          <Stat label="Pagos rechazados" value={paymentsRejected} href="/admin/pagos" />
        </div>
      </section>
    </div>
  );
}
