import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { StatusBadge } from '@/components/orders/status-badge';
import { formatDateTime } from '@/lib/format';
import { type OrderState } from '@/features/orders/state-machine';

export const metadata: Metadata = { title: 'Historial' };

export default async function ProveedorHistorial() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from('provider_accounts')
    .select('id')
    .eq('owner_id', profile!.id)
    .maybeSingle();

  const { data: orders } = provider
    ? await supabase
        .from('service_orders')
        .select('id, state, dest_address, created_at')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Historial de servicios</h1>
      {orders && orders.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/proveedor/servicios/${o.id}`} className="focus-ring flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Destino: {o.dest_address ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
                </div>
                <StatusBadge state={o.state as OrderState} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no tenés servicios.
        </p>
      )}
    </div>
  );
}
