'use client';

import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatARS } from '@/lib/format';

/**
 * Marca de Mercado Pago (el apretón de manos), simplificada e inline. Va embebida
 * y no como archivo remoto para que el botón nunca aparezca "pelado" si falla la
 * carga de un asset.
 */
function LogoMercadoPago({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 34" className={className} aria-hidden="true" fill="none">
      <ellipse cx="24" cy="17" rx="23.5" ry="16.5" fill="#fff" />
      <path
        d="M11 15.6c1.2-1.6 3.3-3.3 5-3.3 1 0 1.7.3 2.6.9.8.5 1.4.8 2.2.8.9 0 1.6-.3 2.7-.9 1.3-.7 2.3-1 3.4-1 1.6 0 3 .7 4.6 2l4.7 4c.7.6.8 1.4.3 2-.5.6-1.3.6-2 .1l-.6-.5c-.3-.2-.6-.2-.8 0-.5.6-1.4.8-2.2.3l-.6-.4c-.3-.2-.6-.1-.8.1-.5.6-1.4.8-2.2.3l-.5-.3c-.3-.2-.6-.1-.8.1-.6.7-1.6.8-2.4.2l-3.6-2.6c-.4-.3-.5-.8-.2-1.2.3-.4.8-.5 1.2-.2l2.4 1.7"
        stroke="#00A6E0"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 15.6l-3.4 2.9c-.6.5-.7 1.3-.2 1.9.4.5 1.1.6 1.7.3M24 12.9c-1.5 1.3-3 2.6-3.6 3.1"
        stroke="#00A6E0"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
      {/* Los colores de Mercado Pago (celeste corporativo) hacen de señal de
          confianza: el usuario reconoce a dónde lo mandamos antes de tocar. */}
      <button
        onClick={pay}
        disabled={loading}
        className="focus-ring flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#00A6E0] px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#0090c4] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <LogoMercadoPago className="h-6 w-8 shrink-0" />
        )}
        <span>Pagar {formatARS(amount)}</span>
      </button>
      <p className="text-center text-xs font-medium text-muted-foreground">con Mercado Pago</p>
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
