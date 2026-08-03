import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatARS, formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Reembolsos' };

const TONE = {
  pending: 'bg-warning/15 text-warning-foreground',
  processed: 'bg-success/15 text-success',
  failed: 'bg-destructive/10 text-destructive',
};

export default async function AdminReembolsos() {
  const supabase = await createClient();
  const { data: refunds } = await supabase
    .from('refunds')
    .select('id, payment_id, amount, reason, status, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Reembolsos</h1>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {(refunds ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{formatARS(r.amount)}</p>
              <p className="truncate text-xs text-muted-foreground">{r.reason} · {formatDateTime(r.created_at)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[r.status]}`}>{r.status}</span>
          </li>
        ))}
        {(!refunds || refunds.length === 0) && <li className="p-8 text-center text-sm text-muted-foreground">Sin reembolsos.</li>}
      </ul>
    </div>
  );
}
