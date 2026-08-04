'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { simulatePayment } from './actions';
import { formatARS } from '@/lib/format';

/**
 * Botón de pago de PRUEBA (no es un cobro real). En modo test permite recorrer
 * el flujo posterior al pago sin depender de Mercado Pago en vivo.
 * - `context='no-mp'`: MP no está configurado, es la única forma de avanzar.
 * - `context='fallback'`: MP sí está activo, pero se ofrece como red de seguridad
 *   (p. ej. para la demo, si el pago real falla). Se muestra más discreto.
 */
export function SimulatePaymentButton({
  orderId,
  amount,
  context = 'no-mp',
}: {
  orderId: string;
  amount: number;
  context?: 'no-mp' | 'fallback';
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pay() {
    setError(null);
    start(async () => {
      const res = await simulatePayment({ orderId });
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No pudimos simular el pago');
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-brand-green/40 bg-brand-green/5 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-green">
        <FlaskConical className="h-4 w-4" /> Modo prueba
      </p>
      <p className="text-sm text-muted-foreground">
        {context === 'fallback'
          ? `¿El pago real no avanza? Podés simular el pago del anticipo (${formatARS(amount)}) para seguir la demo. No es un cobro real.`
          : `Mercado Pago todavía no está configurado. Para seguir probando el servicio y el seguimiento, podés simular el pago del anticipo (${formatARS(amount)}). No es un cobro real.`}
      </p>
      <Button
        onClick={pay}
        disabled={pending}
        className="w-full"
        variant={context === 'fallback' ? 'outline' : 'secondary'}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Simular pago y continuar
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
