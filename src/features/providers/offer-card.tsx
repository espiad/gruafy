'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { acceptOffer, rejectOffer } from './actions';
import { formatARS, formatDistance } from '@/lib/format';

interface Props {
  orderId: string;
  expiresAt: string;
  destAddress: string | null;
  distanceMeters: number | null;
  dollys: number;
  wheelsBlocked: number;
  amountProvider: number | null;
}

/**
 * Tarjeta de oferta con cuenta regresiva a la expiración común (broadcast).
 * Muestra zona/destino y monto estimado a cobrar; nunca la dirección exacta del A.
 * El primero que acepta se lo lleva (aceptación atómica en el servidor).
 */
export function OfferCard(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const to = new Date(props.expiresAt).getTime();
    const tick = () => {
      const r = Math.max(0, Math.round((to - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) router.refresh();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [props.expiresAt, router]);

  function accept() {
    setError(null);
    start(async () => {
      const res = await acceptOffer(props.orderId);
      if (res.ok) router.push(`/proveedor/servicios/${props.orderId}`);
      else {
        setError(res.error ?? 'No se pudo aceptar');
        router.refresh();
      }
    });
  }

  function reject() {
    start(async () => {
      await rejectOffer(props.orderId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border-2 border-brand-orange bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-green">
          <Timer className="h-3.5 w-3.5" /> {String(Math.floor(remaining / 60)).padStart(2, '0')}:
          {String(remaining % 60).padStart(2, '0')}
        </span>
        {props.amountProvider != null && (
          <span className="font-display text-lg text-brand-green">{formatARS(props.amountProvider)}</span>
        )}
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
        <span>
          Destino: {props.destAddress ?? '—'}
          <br />
          <span className="text-muted-foreground">
            Distancia total {props.distanceMeters ? formatDistance(props.distanceMeters) : '—'}
            {props.dollys > 0 && ` · ${props.dollys} dolly(s)`}
            {props.wheelsBlocked > 0 && ` · ${props.wheelsBlocked} rueda(s) bloqueadas`}
          </span>
        </span>
      </p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button onClick={accept} disabled={pending || remaining <= 0} className="flex-1">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Aceptar
        </Button>
        <Button onClick={reject} disabled={pending} variant="outline">
          Rechazar
        </Button>
      </div>
    </div>
  );
}
