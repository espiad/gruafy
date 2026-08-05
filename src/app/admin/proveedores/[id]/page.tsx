import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Truck, Users, MessageCircle, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatCuit } from '@/lib/validation/argentina';
import { formatDateTime } from '@/lib/format';
import { DocReviewItem } from '@/features/admin/doc-review-item';
import { ProviderDecision } from '@/features/admin/provider-decision';
import { ProviderReviews } from '@/features/reviews/provider-reviews';
import { OrderAutoRefresh } from '@/features/orders/order-live';
import { AdminPasswordReset } from '@/features/admin/admin-password-reset';
import { AdminProviderEditor } from '@/features/admin/admin-provider-editor';
import { AdminMemberEditor, AdminTruckEditor } from '@/features/admin/admin-member-truck-editors';

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

  // Email de login del dueño (para que el admin lo pueda corregir).
  let loginEmail: string | null = null;
  if (provider.owner_id) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const { data: u } = await createAdminClient().auth.admin.getUserById(provider.owner_id);
      loginEmail = u.user?.email ?? null;
    } catch {
      loginEmail = null;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <OrderAutoRefresh active intervalMs={8000} />
      <Link href="/admin/proveedores" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl">{provider.legal_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">CUIT {formatCuit(provider.cuit)}</p>
        <p className="text-sm text-muted-foreground">{provider.contact_email} · {provider.contact_phone}</p>
        <p className="mt-1 text-sm">
          ★ <strong>{provider.rating_avg.toFixed(1)}</strong> · {provider.rating_count} reseña{provider.rating_count === 1 ? '' : 's'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Alta: {formatDateTime(provider.created_at)}</p>
        {provider.rejection_reason && (
          <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive"><strong>Último rechazo:</strong> {provider.rejection_reason}</p>
        )}
      </div>

      {/* Alerta de reputación: si acumula malas reseñas, el admin decide si suspende. */}
      {provider.rating_count >= 1 && provider.rating_avg <= 2 && provider.status === 'approved' && (
        <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold text-destructive">Reputación baja</p>
          <p className="mt-1 text-muted-foreground">
            Promedio {provider.rating_avg.toFixed(1)}★ sobre {provider.rating_count} reseñas. Revisá los
            comentarios más abajo y evaluá suspender la cuenta si corresponde.
          </p>
        </div>
      )}

      <ProviderDecision providerId={provider.id} status={provider.status} />

      <AdminProviderEditor
        company={{
          providerId: provider.id,
          legal_name: provider.legal_name,
          cuit: provider.cuit,
          contact_email: provider.contact_email,
          contact_phone: provider.contact_phone,
        }}
        userId={provider.owner_id}
        loginEmail={loginEmail}
      />

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold">Soporte de cuenta</h2>
        {provider.contact_phone && (
          <div className="mb-3 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/${provider.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Hola ${provider.legal_name}, te escribo de gruafy. Entrá a tu cuenta para ver el estado de tu solicitud y qué documentación te falta o hay que renovar. ¡Gracias!`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-brand-cream"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <a
              href={`tel:${provider.contact_phone.replace(/\D/g, '')}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Phone className="h-4 w-4" /> Llamar
            </a>
          </div>
        )}
        {provider.owner_id && <AdminPasswordReset userId={provider.owner_id} label={provider.legal_name} />}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> Grúas</h2>
        <ul className="space-y-2">
          {(trucks ?? []).map((t) => (
            <AdminTruckEditor key={t.id} truck={t} />
          ))}
          {(!trucks || trucks.length === 0) && <li className="text-sm text-muted-foreground">Sin grúas cargadas.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Conductores</h2>
        <ul className="space-y-2">
          {(members ?? []).map((m) => (
            <AdminMemberEditor key={m.id} member={m} />
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

      <ProviderReviews providerId={provider.id} title="Reseñas recibidas" />
    </div>
  );
}
