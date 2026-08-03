'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cancelOrderByClient } from './actions';

/**
 * Refresca la página cada pocos segundos mientras la orden está en un estado de
 * espera, para que el cambio (grúa acepta → pagar, pago → tracking) aparezca solo.
 */
export function OrderAutoRefresh({ active, intervalMs = 4000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}

/**
 * Pantalla de búsqueda: loader enfocado, tiempo transcurrido y opción de cancelar.
 * No pasa nada más hasta que una grúa acepta (y ahí aparece el pago).
 */
export function SearchingCard({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function cancel() {
    start(async () => {
      await cancelOrderByClient(orderId, 'El cliente canceló la búsqueda');
      router.refresh();
    });
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="rounded-3xl border-2 border-brand-orange bg-brand-orange/5 p-8 text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange/30" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange">
          <Loader2 className="h-8 w-8 animate-spin text-brand-ink" />
        </span>
      </div>
      <h2 className="mt-5 font-display text-xl text-brand-green">Buscando una grúa cerca tuyo…</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Te avisamos apenas una acepte. No cierres esta pantalla. Todavía no se cobra nada.
      </p>
      <p className="mt-3 font-mono text-2xl tabular-nums text-brand-green">{mm}:{ss}</p>

      {!confirmCancel ? (
        <button
          onClick={() => setConfirmCancel(true)}
          className="mt-5 text-sm text-muted-foreground underline hover:text-destructive"
        >
          Cancelar búsqueda
        </button>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-2">
          <p className="text-sm">¿Seguro que querés cancelar?</p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={cancel} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Sí, cancelar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>Seguir buscando</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Cuenta regresiva del tiempo de pago (mm:ss) para el bloque de pago. */
export function PaymentCountdown({ deadline }: { deadline: string | null }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const target = new Date(deadline).getTime();
    const tick = () => setLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (left == null) return null;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <p className="text-center text-sm text-muted-foreground">
      Tenés <strong className="tabular-nums text-brand-green">{mm}:{ss}</strong> para pagar y confirmar la reserva.
    </p>
  );
}
