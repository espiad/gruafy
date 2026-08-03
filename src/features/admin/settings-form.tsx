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

export function SettingsForm({ initial }: { initial: PlatformValues }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const f = new FormData(e.currentTarget);
    const values: Record<string, number | string[]> = { ...initial } as never;
    for (const field of FIELDS) {
      const raw = Number(f.get(field.key));
      values[field.key as string] = field.percent ? raw / 100 : raw;
    }
    values['extras_categorias'] = initial.extras_categorias;
    values['km_redondeo'] = initial.km_redondeo;
    values['max_pasajeros'] = initial.max_pasajeros;

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
