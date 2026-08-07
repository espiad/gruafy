import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Alta de proveedor' };

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (!profile) redirect('/ingresar?next=/proveedor/onboarding');
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from('provider_accounts')
    .select('id, status')
    .eq('owner_id', profile.id)
    .maybeSingle();

  // Si ya existe la cuenta, el alta continúa en estado-solicitud (docs + envío).
  if (provider) redirect('/proveedor/estado-solicitud');

  // Datos que el dueño ya cargó al registrarse: los usamos para precargar y no
  // pedir dos veces lo mismo (nombre, teléfono, email).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl">Alta de tu grúa</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cargá los datos de la empresa y la grúa. Después subís la documentación y lo enviás a
        revisión. Una cuenta = una grúa habilitada.
      </p>
      <div className="mt-6">
        <OnboardingForm
          ownerName={ownerName}
          ownerPhone={profile.phone ?? ''}
          ownerEmail={user?.email ?? ''}
        />
      </div>
    </div>
  );
}
