import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatARS, formatDateTime } from '@/lib/format';
import { RefundButton } from '@/features/admin/refund-button';
import type { PaymentStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Pagos' };

const TONE: Record<PaymentStatus, string> = {
  created: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/15 text-warning-foreground',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/10 text-destructive',
};

export default async function AdminPagos() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from('payments')
    .select('id, order_id, amount, status, mp_payment_id, live_mode, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Pagos</h1>
        <a href="/api/admin/pagos/export" className="focus-ring rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">Exportar CSV</a>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {(payments ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <Link href={`/admin/servicios/${p.order_id}`} className="text-sm font-medium hover:underline">
                {formatARS(p.amount)}
              </Link>
              <p className="text-xs text-muted-foreground">
                {p.mp_payment_id ? `MP ${p.mp_payment_id} · ` : ''}{p.live_mode ? 'producción' : 'prueba'} · {formatDateTime(p.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[p.status]}`}>{p.status}</span>
              {p.status === 'approved' && <RefundButton paymentId={p.id} amount={p.amount} />}
            </div>
          </li>
        ))}
        {(!payments || payments.length === 0) && <li className="p-8 text-center text-sm text-muted-foreground">Sin pagos registrados.</li>}
      </ul>
    </div>
  );
}
