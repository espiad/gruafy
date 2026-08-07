'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatARS } from '@/lib/format';
import { adminAddExtra, adminRemoveExtra } from './actions';

export interface ExtraLite {
  id: string;
  category: string;
  reason: string | null;
  amount: number;
}

/**
 * Adicionales de un servicio, con carga manual por administración. El gruero solo
 * puede usar el catálogo cerrado; cualquier caso fuera de catálogo entra por acá
 * (soporte lo acuerda con las partes y lo carga un admin).
 */
export function OrderExtrasManager({
  orderId,
  extras,
  editable,
}: {
  orderId: string;
  extras: ExtraLite[];
  editable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const total = extras.reduce((a, e) => a + e.amount, 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    start(async () => {
      const res = await adminAddExtra({
        orderId,
        label: String(f.get('label') ?? ''),
        reason: String(f.get('reason') ?? ''),
        amount: Number(f.get('amount')),
      });
      if (res.ok) {
        form.reset();
        setOk('Adicional cargado. Ya lo ven el cliente y el gruero.');
        router.refresh();
      } else setError(res.error ?? 'No pudimos cargarlo');
    });
  }

  function quitar(id: string) {
    setError(null);
    start(async () => {
      const res = await adminRemoveExtra(id, orderId);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No pudimos quitarlo');
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Adicionales</h2>
        {extras.length > 0 && <span className="text-sm font-medium">{formatARS(total)}</span>}
      </div>

      {extras.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin adicionales.</p>
      ) : (
        <ul className="space-y-1.5">
          {extras.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{e.category}</p>
                {e.reason && <p className="text-xs text-muted-foreground">{e.reason}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-medium">{formatARS(e.amount)}</span>
                <button
                  onClick={() => quitar(e.id)}
                  disabled={pending}
                  aria-label={`Quitar ${e.category}`}
                  className="focus-ring rounded-md p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!editable ? (
        <p className="text-xs text-muted-foreground">
          El servicio ya está cerrado: no se pueden agregar adicionales.
        </p>
      ) : !open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Cargar adicional personalizado
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">Nombre del adicional</Label>
              <Input id="label" name="label" required placeholder="Ej: Ferry / balsa" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto (ARS)</Label>
              <Input id="amount" name="amount" inputMode="numeric" required placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Motivo</Label>
            <Input id="reason" name="reason" required placeholder="Qué se acordó y con quién" />
          </div>
          {ok && <p className="rounded-md bg-success/10 p-2.5 text-sm text-success">{ok}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Agregar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        </form>
      )}
      {!open && error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
