'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSettings } from './actions';
import type { PlatformValues } from '@/features/pricing/settings';

const FIELDS: { key: keyof PlatformValues; label: string; hint?: string; percent?: boolean }[] = [
  { key: 'movida_base', label: 'Movida base (ARS)' },
  { key: 'precio_km', label: 'Precio por km (ARS)' },
  { key: 'dolly', label: 'Dolly (ARS)' },
  { key: 'comision_gruafy', label: 'Comisión gruafy', percent: true },
  { key: 'iva_gruero', label: 'IVA gruero', percent: true },
  { key: 'fee_mp', label: 'Fee Mercado Pago', percent: true },
  { key: 'iva_fee_mp', label: 'IVA fee MP', percent: true },
  { key: 'oferta_proveedor_segundos', label: 'Segundos de oferta al proveedor' },
  { key: 'pago_cliente_segundos', label: 'Segundos para pagar (cliente)' },
  { key: 'radio_busqueda_km', label: 'Radio de búsqueda (km)' },
  { key: 'extra_tope_auto', label: 'Tope auto-aprobación de adicionales (ARS)' },
];

/** Interruptores (booleanos). Van aparte de los campos numéricos. */
const SWITCHES: { key: keyof PlatformValues; label: string; hint: string }[] = [
  {
    key: 'permitir_pago_simulado',
    label: 'Permitir pago simulado',
    hint:
      'Agrega un botón "Simular pago y continuar" en la pantalla de pago del cliente. Sirve para ' +
      'demostraciones o si Mercado Pago se cae. Apagado, el botón desaparece y la acción queda ' +
      'bloqueada también en el servidor.',
  },
  {
    key: 'radio_busqueda_activo',
    label: 'Limitar por radio de búsqueda',
    hint:
      'Activado, el pedido solo se ofrece a las grúas dentro del radio configurado abajo. Apagado, ' +
      'se ofrece a todas las grúas disponibles sin importar la distancia.',
  },
];

export function SettingsForm({ initial }: { initial: PlatformValues }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switches, setSwitches] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SWITCHES.map((s) => [s.key as string, initial[s.key] !== false])),
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    // Mandamos SOLO lo que este formulario edita. Antes se hacía `{...initial}`, que
    // arrastraba `adicionales` (un array de objetos): la validación del servidor lo
    // rechazaba y NADA se guardaba nunca, con la UI diciendo "Guardado". El servidor
    // hace merge, así que lo que no mandamos queda intacto.
    const values: Record<string, number | boolean> = {};
    const f = new FormData(e.currentTarget);
    for (const field of FIELDS) {
      const raw = Number(f.get(field.key));
      if (!Number.isFinite(raw)) {
        setError(`Revisá el valor de "${field.label}".`);
        return;
      }
      values[field.key as string] = field.percent ? raw / 100 : raw;
    }
    for (const s of SWITCHES) values[s.key as string] = switches[s.key as string] ?? false;

    start(async () => {
      const res = await updateSettings(values);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else setError(res.error ?? 'No pudimos guardar');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={String(field.key)} className="space-y-1.5">
            <Label htmlFor={String(field.key)}>{field.label}{field.percent ? ' (%)' : ''}</Label>
            <Input
              id={String(field.key)}
              name={String(field.key)}
              inputMode="numeric"
              defaultValue={field.percent ? (initial[field.key] as number) * 100 : (initial[field.key] as number)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
        {SWITCHES.map((s) => {
          const on = switches[s.key as string] ?? false;
          return (
            <div key={String(s.key)} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={s.label}
                onClick={() => setSwitches((prev) => ({ ...prev, [s.key as string]: !on }))}
                className={`focus-ring relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-green' : 'bg-input'}`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar parámetros
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Guardado</span>}
      </div>
    </form>
  );
}
