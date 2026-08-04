import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { formatCuit } from '@/lib/validation/argentina';
import { ProviderReviews } from '@/features/reviews/provider-reviews';

export const metadata: Metadata = { title: 'Perfil de la grúa' };

const PROVIDER_STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  under_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Con observaciones',
  suspended: 'Suspendida',
};

export default async function ProveedorPerfil() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from('provider_accounts')
    .select('*')
    .eq('owner_id', profile!.id)
    .maybeSingle();
  if (!provider) redirect('/proveedor/onboarding');

  const { data: trucks } = await supabase
    .from('tow_trucks')
    .select('patente, brand, model, year, capacity')
    .eq('provider_id', provider.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl">Perfil de la grúa</h1>

      <div className="space-y-2 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{provider.legal_name}</h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {PROVIDER_STATUS_LABEL[provider.status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">CUIT {formatCuit(provider.cuit)}</p>
        <p className="text-sm text-muted-foreground">{provider.contact_email ?? ''} {provider.contact_phone ?? ''}</p>
        <p className="text-sm text-muted-foreground">★ {provider.rating_avg.toFixed(1)} · {provider.rating_count} servicios</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 font-semibold">Grúa(s)</h2>
        <ul className="space-y-2">
          {(trucks ?? []).map((t, i) => (
            <li key={i} className="rounded-lg border border-border p-3 text-sm">
              <strong>{t.patente}</strong> · {[t.brand, t.model, t.year].filter(Boolean).join(' ')}
              {t.capacity && <span className="text-muted-foreground"> · {t.capacity}</span>}
            </li>
          ))}
        </ul>
      </div>

      <ProviderReviews providerId={provider.id} title="Lo que dicen tus clientes" />
    </div>
  );
}
