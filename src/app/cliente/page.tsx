import Link from 'next/link';
import { PlusCircle, ArrowRight, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/orders/status-badge';
import { formatDateTime, formatARS } from '@/lib/format';
import { isTerminal, type OrderState } from '@/features/orders/state-machine';

export default async function ClienteHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, state, origin_address, dest_address, amount_upfront, created_at')
    .eq('client_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const active = (orders ?? []).find((o) => !isTerminal(o.state as OrderState));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Hola de nuevo</h1>
          <p className="text-sm text-muted-foreground">¿Necesitás una grúa? Resolvémoslo.</p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/cliente/solicitar">
            <PlusCircle className="h-4 w-4" /> Pedir grúa
          </Link>
        </Button>
      </div>

      {active ? (
        <Link
          href={`/cliente/solicitudes/${active.id}`}
          className="focus-ring block rounded-2xl border-2 border-brand-orange bg-brand-orange/5 p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-green">
              Servicio en curso
            </span>
            <StatusBadge state={active.state as OrderState} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-brand-orange" />
            {active.origin_address ?? 'Origen'} → {active.dest_address ?? 'Destino'}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-green">
            Ver seguimiento <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="font-semibold">No tenés servicios activos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando pidas una grúa, la vas a seguir en vivo desde acá.
          </p>
          <Button asChild className="mt-4">
            <Link href="/cliente/solicitar">
              <PlusCircle className="h-4 w-4" /> Pedir una grúa
            </Link>
          </Button>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Últimas solicitudes
        </h2>
        {orders && orders.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/cliente/solicitudes/${o.id}`}
                  className="focus-ring flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {o.origin_address ?? 'Origen'} → {o.dest_address ?? 'Destino'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {o.amount_upfront != null && (
                      <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
                        {formatARS(o.amount_upfront)}
                      </span>
                    )}
                    <StatusBadge state={o.state as OrderState} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Todavía no pediste ninguna grúa.
          </p>
        )}
      </section>
    </div>
  );
}
