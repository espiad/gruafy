'use client';

import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatARS } from '@/lib/format';

/**
 * Botón de pago del anticipo. Pide al servidor crear la preference de Mercado
 * Pago y redirige a Checkout Pro. El retorno del navegador NO confirma el pago:
 * la confirmación llega por webhook.
 */
export function PayButton({ orderId, amount }: { orderId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        initPoint?: string;
        sandboxInitPoint?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'No pudimos iniciar el pago');
      const target = data.checkoutUrl ?? data.initPoint ?? data.sandboxInitPoint;
      if (!target) throw new Error('No se pudo abrir Mercado Pago');
      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Celeste corporativo de Mercado Pago: alcanza como señal de a dónde lo
          mandamos, sin usar su isotipo (marca de un tercero). El texto va entero
          adentro del botón; antes quedaba partido en dos renglones. */}
      <button
        onClick={pay}
        disabled={loading}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-[#00A6E0] px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#0090c4] disabled:opacity-60"
      >
        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        <span>Pagar {formatARS(amount)} con Mercado Pago</span>
      </button>
      {error && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Pagás solo el anticipo de gruafy. El saldo se lo abonás al gruero al finalizar.
      </p>
    </div>
  );
}
