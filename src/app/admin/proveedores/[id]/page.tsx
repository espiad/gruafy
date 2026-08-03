import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Truck, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatCuit } from '@/lib/validation/argentina';
import { formatDateTime } from '@/lib/format';
import { DocReviewItem } from '@/features/admin/doc-review-item';
import { ProviderDecision } from '@/features/admin/provider-decision';

export default async function AdminProveedorDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: provider } = await supabase.from('provider_accounts').select('*').eq('id', id).single();
  if (!provider) notFound();

  const [{ data: trucks }, { data: members }, { data: docs }] = await Promise.all([
    supabase.from('tow_trucks').select('*').eq('provider_id', id),
    supabase.from('provider_members').select('*').eq('provider_id', id),
    supabase.from('provider_documents').select('*').eq('provider_id', id).order('created_at', { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/proveedores" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl">{provider.legal_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">CUIT {formatCuit(provider.cuit)}</p>
        <p className="text-sm text-muted-foreground">{provider.contact_email} · {provider.contact_phone}</p>
        <p className="mt-1 text-xs text-muted-foreground">Alta: {formatDateTime(provider.created_at)}</p>
        {provider.rejection_reason && (
          <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive"><strong>Último rechazo:</strong> {provider.rejection_reason}</p>
        )}
      </div>

      <ProviderDecision providerId={provider.id} status={provider.status} />

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> Grúas</h2>
        <ul className="space-y-2">
          {(trucks ?? []).map((t) => (
            <li key={t.id} className="rounded-lg border border-border p-3 text-sm">
              <strong>{t.patente}</strong> · {[t.brand, t.model, t.year].filter(Boolean).join(' ')} {t.capacity && `· ${t.capacity}`}
            </li>
          ))}
          {(!trucks || trucks.length === 0) && <li className="text-sm text-muted-foreground">Sin grúas cargadas.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Conductores</h2>
        <ul className="space-y-2">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span>{m.full_name} {m.dni && `· DNI ${m.dni}`}</span>
              <span className="text-xs text-muted-foreground">{m.role === 'owner' ? 'Dueño' : 'Conductor'}</span>
            </li>
          ))}
          {(!members || members.length === 0) && <li className="text-sm text-muted-foreground">Sin conductores.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 font-semibold">Documentación</h2>
        <ul className="space-y-2">
          {(docs ?? []).map((d) => (
            <DocReviewItem
              key={d.id}
              docId={d.id}
              docType={d.doc_type}
              storagePath={d.storage_path}
              reviewStatus={d.review_status}
              adminNote={d.admin_note}
              expiresAt={d.expires_at}
            />
          ))}
          {(!docs || docs.length === 0) && <li className="text-sm text-muted-foreground">El proveedor no subió documentación.</li>}
        </ul>
      </section>
    </div>
  );
}
