import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings, toPricingSettings } from '@/features/pricing/settings';
import { SolicitarWizard } from './wizard';

export const metadata: Metadata = { title: 'Pedir una grúa' };

export default async function SolicitarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, patente, gearbox, gearbox_locked, has_keys')
    .eq('client_id', user!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const settings = await getPlatformSettings();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl">Pedir una grúa</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tres pasos y listo. Primero una grúa acepta; recién ahí pagás el anticipo.
      </p>
      <div className="mt-6">
        <SolicitarWizard
          vehicles={vehicles ?? []}
          pricing={toPricingSettings(settings)}
          maxPasajeros={settings.max_pasajeros}
        />
      </div>
    </div>
  );
}
