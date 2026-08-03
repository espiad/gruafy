import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/orders/status-badge';
import { AdminCancelOrder } from '@/features/admin/admin-cancel-order';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { formatDateTime } from '@/lib/format';
import { STATE_LABELS, isTerminal, type OrderState } from '@/features/orders/state-machine';
import type { QuoteBreakdown } from '@/features/pricing/pricing';

export default async function AdminServicioDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase.from('service_orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const [{ data: events }, { data: payments }, { data: extras }] = await Promise.all([
    supabase.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    supabase.from('service_extras').select('*').eq('order_id', id),
  ]);

  const state = order.state as OrderState;
  const pricing = order.pricing as unknown as QuoteBreakdown | null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/servicios" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Servicio</h1>
        <StatusBadge state={state} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="mb-2 font-semibold">Ruta</h2>
          <p><strong>Origen:</strong> {order.origin_address ?? '—'}</p>
          <p><strong>Destino:</strong> {order.dest_address ?? '—'}</p>
          <p className="mt-1 text-muted-foreground">Creado {formatDateTime(order.created_at)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="mb-2 font-semibold">Pagos</h2>
          {(payments ?? []).length === 0 && <p className="text-muted-foreground">Sin pagos.</p>}
          {(payments ?? []).map((p) => (
            <p key={p.id}>{p.status} · {p.mp_payment_id ?? p.mp_preference_id ?? 'sin id MP'}</p>
          ))}
        </div>
      </div>

      {pricing && (
        <details className="rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer font-medium">Desglose económico</summary>
          <div className="mt-4"><QuoteBreakdownCard quote={pricing} /></div>
        </details>
      )}

      {(extras ?? []).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-2 font-semibold">Adicionales</h2>
          {(extras ?? []).map((e) => (
            <p key={e.id} className="text-sm">{e.category} — {e.reason} ({e.status})</p>
          ))}
        </div>
      )}

      {!isTerminal(state) && <AdminCancelOrder orderId={order.id} />}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h2>
        <ol className="space-y-2">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
              <div>
                <p className="font-medium">{e.event}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(e.created_at)}{e.to_state ? ` · ${STATE_LABELS[e.to_state as OrderState]}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
