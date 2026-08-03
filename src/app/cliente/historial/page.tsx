import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/orders/status-badge';
import { formatDateTime, formatARS } from '@/lib/format';
import { isTerminal, type OrderState } from '@/features/orders/state-machine';

export const metadata: Metadata = { title: 'Historial' };

export default async function HistorialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, state, origin_address, dest_address, amount_upfront, created_at')
    .eq('client_id', user!.id)
    .order('created_at', { ascending: false });

  const finished = (orders ?? []).filter((o) => isTerminal(o.state as OrderState));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Historial</h1>
      {finished.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no tenés servicios finalizados.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {finished.map((o) => (
            <li key={o.id}>
              <Link href={`/cliente/solicitudes/${o.id}`} className="focus-ring flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.origin_address} → {o.dest_address}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {o.amount_upfront != null && <span className="hidden text-sm text-muted-foreground sm:inline">{formatARS(o.amount_upfront)}</span>}
                  <StatusBadge state={o.state as OrderState} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
