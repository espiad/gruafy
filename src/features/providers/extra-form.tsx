'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addExtra } from './actions';
import { formatARS } from '@/lib/format';
import type { AdicionalDef } from '@/features/pricing/settings';

/**
 * Carga de adicionales del gruero, guiada por el catálogo del admin. Según el modo
 * de la categoría elegida, el monto es fijo (no editable), acotado a un rango, o
 * libre. Así el gruero no puede inventar montos fuera de lo permitido.
 */
export function ExtraForm({ orderId, adicionales }: { orderId: string; adicionales: AdicionalDef[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<{ label: string; amount: number; enRevision: boolean } | null>(null);
  const activos = useMemo(() => adicionales.filter((a) => a.activo), [adicionales]);
  const [key, setKey] = useState<string>(activos[0]?.key ?? '');

  const def = activos.find((a) => a.key === key);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    // En modo fijo el monto lo pone el catálogo; en los otros, lo escribe el gruero.
    const amount = def?.mode === 'fijo' ? (def.amount ?? 0) : Number(f.get('amount'));
    if (def?.mode === 'rango') {
      const min = def.min ?? 0;
      const max = def.max ?? Number.MAX_SAFE_INTEGER;
      if (amount < min || amount > max) {
        setError(`El monto debe estar entre ${formatARS(min)} y ${formatARS(max)}.`);
        return;
      }
    }
    start(async () => {
      const res = await addExtra({ orderId, category: key, reason: String(f.get('reason')), amount });
      if (res.ok) {
        form.reset();
        // Confirmación explícita: antes se agregaba en silencio (y la lista queda
        // plegada), así que parecía que no se había cargado.
        setOk({ label: def?.label ?? 'Adicional', amount, enRevision: Boolean(res.needsReview) });
        router.refresh();
      } else setError(res.error ?? 'No pudimos cargar el adicional');
    });
  }

  if (activos.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay adicionales habilitados.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Tipo de adicional</label>
          <select
            name="category"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="focus-ring h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {activos.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Monto</label>
          {def?.mode === 'fijo' ? (
            <div className="flex h-11 items-center rounded-md border border-input bg-muted px-3 text-sm font-medium">
              {formatARS(def.amount ?? 0)} <span className="ml-1 text-xs text-muted-foreground">(fijo)</span>
            </div>
          ) : (
            <Input
              name="amount"
              inputMode="numeric"
              required
              placeholder={def?.mode === 'rango' ? `${def.min}–${def.max}` : '0'}
              className="h-11"
            />
          )}
          {def?.mode === 'rango' && (
            <p className="mt-1 text-xs text-muted-foreground">
              Permitido: {formatARS(def.min ?? 0)} a {formatARS(def.max ?? 0)}
              {def.max_cantidad ? ` · hasta ${def.max_cantidad}` : ''}
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Motivo / detalle</label>
        <Input name="reason" required placeholder="Ej: peaje Autopista Illia" className="h-11" />
      </div>
      {ok && (
        <div className={`rounded-lg p-3 text-sm ${ok.enRevision ? 'bg-warning/15 text-warning-foreground' : 'bg-success/10 text-success'}`}>
          {ok.enRevision ? (
            <>
              <strong>{ok.label} · {formatARS(ok.amount)} quedó EN REVISIÓN.</strong> Supera el tope de
              auto-aprobación, así que todavía <strong>no suma</strong> al total a cobrar. Un
              administrador lo revisa.
            </>
          ) : (
            <>
              <strong>{ok.label} · {formatARS(ok.amount)} agregado.</strong> Ya suma al total a cobrarle
              al cliente.
            </>
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Agregar adicional
      </Button>
    </form>
  );
}
