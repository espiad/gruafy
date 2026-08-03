import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatCuit } from '@/lib/validation/argentina';
import { formatDateTime } from '@/lib/format';
import type { ProviderStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Proveedores' };

const STATUS_LABEL: Record<ProviderStatus, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  under_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  suspended: 'Suspendida',
};
const STATUS_TONE: Record<ProviderStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-warning/15 text-warning-foreground',
  under_review: 'bg-warning/15 text-warning-foreground',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  suspended: 'bg-destructive/10 text-destructive',
};

const FILTERS: { key: string; label: string; states: ProviderStatus[] }[] = [
  { key: 'pendientes', label: 'Pendientes', states: ['submitted', 'under_review'] },
  { key: 'aprobados', label: 'Aprobados', states: ['approved'] },
  { key: 'todos', label: 'Todos', states: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended'] },
];

export default async function AdminProveedores({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const filter = FILTERS.find((f) => f.key === estado) ?? FILTERS[0]!;
  const supabase = await createClient();
  const { data: providers } = await supabase
    .from('provider_accounts')
    .select('id, legal_name, cuit, status, created_at')
    .in('status', filter.states)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Proveedores</h1>
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/proveedores?estado=${f.key}`}
            className={`focus-ring rounded-md border px-4 py-2 text-sm font-medium ${
              filter.key === f.key ? 'border-brand-orange bg-brand-orange/15 text-brand-green' : 'border-input hover:bg-accent'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {providers && providers.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {providers.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/proveedores/${p.id}`} className="focus-ring flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.legal_name}</p>
                  <p className="text-xs text-muted-foreground">CUIT {formatCuit(p.cuit)} · {formatDateTime(p.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hay proveedores en este filtro.
        </p>
      )}
    </div>
  );
}
