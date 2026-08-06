'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { reviewExtra } from './actions';
import { formatARS } from '@/lib/format';
import { notify } from '@/lib/alerts';

export interface PendingExtra {
  id: string;
  order_id: string;
  category: string;
  reason: string;
  amount: number;
}

/**
 * Adicionales que superaron el tope y esperan decisión del admin. Avisa con sonido
 * cuando entra uno nuevo: si no, el gruero carga un extra caro y queda esperando sin
 * que nadie lo vea.
 */
export function ExtrasReview({ extras }: { extras: PendingExtra[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const prev = useRef<number | null>(null);

  // Aviso sonoro cuando aparece uno nuevo.
  useEffect(() => {
    if (prev.current !== null && extras.length > prev.current) {
      notify('💰 Un adicional necesita tu aprobación');
    }
    prev.current = extras.length;
  }, [extras.length]);

  if (extras.length === 0) return null;

  function decidir(id: string, decision: 'approved' | 'rejected') {
    setError(null);
    start(async () => {
      const res = await reviewExtra(id, decision);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No pudimos guardar la decisión');
    });
  }

  return (
    <section className="rounded-2xl border-2 border-warning bg-warning/10 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-5 w-5 text-warning-foreground" />
        {extras.length} adicional{extras.length === 1 ? '' : 'es'} espera{extras.length === 1 ? '' : 'n'} tu aprobación
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Superan el tope de auto-aprobación. Hasta que decidas, <strong>no se le cobran al cliente</strong>.
      </p>

      <ul className="mt-3 space-y-2">
        {extras.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {e.category} · <span className="tabular-nums">{formatARS(e.amount)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {e.reason} ·{' '}
                <Link href={`/admin/servicios/${e.order_id}`} className="underline hover:text-brand-green">
                  ver servicio
                </Link>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => decidir(e.id, 'approved')}
                disabled={pending}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-brand-cream disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprobar
              </button>
              <button
                onClick={() => decidir(e.id, 'rejected')}
                disabled={pending}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
