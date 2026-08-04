import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { ProviderReviews } from '@/features/reviews/provider-reviews';
import { CompanyEditor, TruckEditor, TrucksHeading } from '@/features/providers/provider-profile-editor';

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
    .select('id, patente, brand, model, year, capacity')
    .eq('provider_id', provider.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl">Perfil de la grúa</h1>

      <CompanyEditor
        company={{
          legal_name: provider.legal_name,
          cuit: provider.cuit,
          contact_email: provider.contact_email,
          contact_phone: provider.contact_phone,
        }}
        statusLabel={PROVIDER_STATUS_LABEL[provider.status] ?? provider.status}
      />
      <p className="-mt-3 px-1 text-sm text-muted-foreground">★ {provider.rating_avg.toFixed(1)} · {provider.rating_count} servicios</p>

      <div className="rounded-2xl border border-border bg-card p-6">
        <TrucksHeading />
        <ul className="space-y-2">
          {(trucks ?? []).map((t) => (
            <TruckEditor key={t.id} truck={t} />
          ))}
          {(!trucks || trucks.length === 0) && <li className="text-sm text-muted-foreground">Sin grúas cargadas.</li>}
        </ul>
      </div>

      <ProviderReviews providerId={provider.id} title="Lo que dicen tus clientes" />
    </div>
  );
}
