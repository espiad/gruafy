'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateAdicionales } from './actions';
import type { AdicionalDef, AdicionalMode } from '@/features/pricing/settings';

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const MODE_LABEL: Record<AdicionalMode, string> = {
  libre: 'Libre',
  fijo: 'Precio fijo',
  rango: 'Rango',
};

/**
 * ABM del catálogo de adicionales. El admin define, por categoría, el modo
 * (libre / fijo / rango), los montos permitidos y el tope de cantidad. Es la
 * herramienta anti-fraude: el gruero solo puede cargar dentro de esto.
 */
export function AdicionalesEditor({ initial }: { initial: AdicionalDef[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AdicionalDef[]>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<AdicionalDef>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
    setSaved(false);
  }
  function remove(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  function add() {
    setRows((r) => [...r, { key: `nuevo-${r.length + 1}`, label: '', mode: 'rango', min: 0, max: 0, max_cantidad: 1, activo: true }]);
    setSaved(false);
  }

  function save() {
    setError(null);
    setSaved(false);
    const catalog = rows.map((r) => ({ ...r, key: slug(r.label) || r.key }));
    if (catalog.some((r) => !r.label.trim())) return setError('Cada adicional necesita un nombre.');
    start(async () => {
      const res = await updateAdicionales(catalog);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else setError(res.error ?? 'No pudimos guardar');
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="font-semibold">Adicionales (anti-fraude)</h2>
        <p className="text-sm text-muted-foreground">
          Definí qué adicionales puede cargar el gruero y con qué límites. El monto libre queda a
          criterio; fijo lo ponés vos; rango lo acota entre mínimo y máximo.
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="rounded-xl border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Input
                value={row.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Nombre (ej: Peaje)"
              />
              <select
                value={row.mode}
                onChange={(e) => update(i, { mode: e.target.value as AdicionalMode })}
                className="focus-ring h-10 rounded-md border border-input bg-background px-2 text-sm"
              >
                {(['libre', 'fijo', 'rango'] as AdicionalMode[]).map((m) => (
                  <option key={m} value={m}>{MODE_LABEL[m]}</option>
                ))}
              </select>
              <button
                onClick={() => remove(i)}
                aria-label="Quitar"
                className="focus-ring rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-3">
              {row.mode === 'fijo' && (
                <label className="text-xs">
                  <span className="mb-1 block font-medium">Precio fijo</span>
                  <Input
                    value={row.amount ?? ''}
                    onChange={(e) => update(i, { amount: Number(e.target.value) })}
                    inputMode="numeric"
                    className="h-9 w-28"
                  />
                </label>
              )}
              {row.mode === 'rango' && (
                <>
                  <label className="text-xs">
                    <span className="mb-1 block font-medium">Mínimo</span>
                    <Input value={row.min ?? ''} onChange={(e) => update(i, { min: Number(e.target.value) })} inputMode="numeric" className="h-9 w-24" />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-medium">Máximo</span>
                    <Input value={row.max ?? ''} onChange={(e) => update(i, { max: Number(e.target.value) })} inputMode="numeric" className="h-9 w-24" />
                  </label>
                </>
              )}
              <label className="text-xs">
                <span className="mb-1 block font-medium">Tope cant.</span>
                <Input value={row.max_cantidad ?? ''} onChange={(e) => update(i, { max_cantidad: Number(e.target.value) })} inputMode="numeric" className="h-9 w-20" />
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={row.activo} onChange={(e) => update(i, { activo: e.target.checked })} className="h-4 w-4" />
                Activo
              </label>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" /> Agregar adicional
        </Button>
        <Button type="button" onClick={save} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar catálogo
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Guardado</span>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
