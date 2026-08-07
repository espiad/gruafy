'use client';

import { useEffect, useState } from 'react';
import { Users, Check } from 'lucide-react';

/**
 * Aviso de cupo con acuse de recibo. La regla es simple: viajan hasta 2 personas
 * además del conductor de la grúa; si son más, tienen que pedirse otro transporte.
 * No hace falta ramificar ni ofrecer soporte: alcanza con que lo lean y lo confirmen.
 * La confirmación queda guardada por pedido para no repetirla.
 */
export function PassengersCheck({ orderId, max = 2 }: { orderId: string; max?: number }) {
  const key = `gruafy_pax_${orderId}`;
  const [entendido, setEntendido] = useState<boolean | null>(null);

  useEffect(() => {
    setEntendido(localStorage.getItem(key) === '1');
  }, [key]);

  if (entendido === null) return null;

  if (entendido) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-success" /> Viajan hasta {max} personas con la grúa.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-warning bg-warning/10 p-5">
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-6 w-6 shrink-0 text-warning-foreground" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg">Viajan {max} personas como máximo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            En la grúa suben <strong>hasta {max} personas</strong>, además del conductor. Si son más,
            pedite otro transporte (remís, taxi o que alguien los pase a buscar) <strong>antes</strong> de
            que llegue la grúa.
          </p>
          <button
            onClick={() => {
              localStorage.setItem(key, '1');
              setEntendido(true);
            }}
            className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-brand-cream"
          >
            <Check className="h-4 w-4" /> Lo entiendo
          </button>
        </div>
      </div>
    </div>
  );
}
