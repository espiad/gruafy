import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/orders/status-badge';
import { formatDateTime, formatARS } from '@/lib/format';
import { type OrderState } from '@/features/orders/state-machine';

export const metadata: Metadata = { title: 'Servicios' };

const GROUPS: Record<string, OrderState[]> = {
  searching_provider: ['searching_provider'],
  awaiting_payment: ['awaiting_payment', 'payment_pending'],
  activos: ['paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending'],
  completed: ['completed'],
  cancelados: ['cancelled_by_client', 'cancelled_by_provider', 'cancelled_by_admin', 'no_provider', 'payment_expired', 'refunded'],
};

export default async function AdminServicios({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from('service_orders')
    .select('id, state, origin_address, dest_address, amount_upfront, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (estado && GROUPS[estado]) query = query.in('state', GROUPS[estado]);
  const { data: orders } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Servicios</h1>
        <a href="/api/admin/servicios/export" className="focus-ring rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          Exportar CSV
        </a>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/servicios" className="focus-ring rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">Todos</Link>
        {Object.keys(GROUPS).map((k) => (
          <Link key={k} href={`/admin/servicios?estado=${k}`} className={`focus-ring rounded-md border px-3 py-2 text-sm ${estado === k ? 'border-brand-orange bg-brand-orange/15' : 'border-input hover:bg-accent'}`}>
            {k}
          </Link>
        ))}
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {(orders ?? []).map((o) => (
          <li key={o.id}>
            <Link href={`/admin/servicios/${o.id}`} className="focus-ring flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{o.origin_address ?? '—'} → {o.dest_address ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                {o.amount_upfront != null && <span className="hidden text-sm text-muted-foreground sm:inline">{formatARS(o.amount_upfront)}</span>}
                <StatusBadge state={o.state as OrderState} />
              </div>
            </Link>
          </li>
        ))}
        {(!orders || orders.length === 0) && <li className="p-8 text-center text-sm text-muted-foreground">Sin servicios.</li>}
      </ul>
    </div>
  );
}
