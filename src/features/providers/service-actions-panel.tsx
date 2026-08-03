'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { advanceOrderState } from './actions';
import { STATE_LABELS, type OrderState } from '@/features/orders/state-machine';

/** Próximo paso permitido para el proveedor según el estado actual. */
const NEXT: Partial<Record<OrderState, { to: OrderState; label: string }>> = {
  paid: { to: 'provider_en_route', label: 'Iniciar viaje al cliente' },
  provider_en_route: { to: 'provider_arrived', label: 'Confirmar llegada' },
  provider_arrived: { to: 'vehicle_loaded', label: 'Confirmar carga del vehículo' },
  vehicle_loaded: { to: 'in_transit', label: 'Iniciar viaje al destino' },
  in_transit: { to: 'completion_pending', label: 'Confirmar entrega' },
  completion_pending: { to: 'completed', label: 'Finalizar servicio' },
};

export function ServiceActionsPanel({ orderId, state }: { orderId: string; state: OrderState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = NEXT[state];

  if (!next) {
    if (state === 'completed') {
      return <p className="rounded-xl border border-success/40 bg-success/5 p-4 text-center text-sm font-medium text-success">Servicio finalizado. ¡Buen viaje!</p>;
    }
    return null;
  }

  function advance() {
    setError(null);
    start(async () => {
      const res = await advanceOrderState(orderId, next!.to);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No pudimos actualizar');
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={advance} disabled={pending} size="lg" className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} {next.label}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Próximo estado: {STATE_LABELS[next.to]}
      </p>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
