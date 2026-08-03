import type { Metadata } from 'next';
import { getPlatformSettings } from '@/features/pricing/settings';
import { SettingsForm } from '@/features/admin/settings-form';
import { paymentsMode, isDemoMode, publicEnv, hasSupabaseConfig } from '@/lib/env';

export const metadata: Metadata = { title: 'Configuración' };

function Flag({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <span className={ok ? 'text-success' : 'text-destructive'}>{ok ? 'Presente' : 'Ausente'}</span>
    </li>
  );
}

export default async function AdminConfiguracion() {
  const settings = await getPlatformSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Los cambios económicos se aplican solo a órdenes nuevas y quedan auditados.
        </p>
      </div>

      <SettingsForm initial={settings} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Diagnóstico (sin exponer secretos)
        </h2>
        <ul className="space-y-2">
          <Flag label="Supabase configurado" ok={hasSupabaseConfig} />
          <Flag label="Geoapify (mapas)" ok={Boolean(publicEnv.geoapifyKey)} />
          <Flag label={`Mercado Pago — modo ${paymentsMode()}`} ok={paymentsMode() === 'test' || paymentsMode() === 'production'} />
          <Flag label="WhatsApp de soporte" ok={Boolean(publicEnv.whatsapp)} />
          <Flag label="Datos legales reales" ok={Boolean(publicEnv.legal.cuit)} />
          <Flag label="DEMO_MODE desactivado" ok={!isDemoMode} />
        </ul>
      </section>
    </div>
  );
}
