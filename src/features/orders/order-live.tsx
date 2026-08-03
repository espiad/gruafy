'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cancelOrderByClient, resolveSearchTimeout } from './actions';

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
 * Pantalla de búsqueda con countdown: el pedido se ofrece a todas las grúas a la
 * vez y hay una ventana (por defecto 2 min) para que una acepte. Anillo de progreso,
 * cuenta regresiva y cancelación. Al llegar a cero sin aceptación, cierra la búsqueda.
 */
export function SearchingCard({
  orderId,
  deadline,
  windowSeconds = 120,
}: {
  orderId: string;
  deadline: string | null;
  windowSeconds?: number;
}) {
  const router = useRouter();
  const [left, setLeft] = useState(windowSeconds);
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const target = deadline ? new Date(deadline).getTime() : Date.now() + windowSeconds * 1000;
    const tick = () => {
      const secs = Math.max(0, Math.round((target - Date.now()) / 1000));
      setLeft(secs);
      if (secs <= 0) setTimedOut(true);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline, windowSeconds]);

  // Cuando se agota el tiempo, cerramos la búsqueda (si nadie aceptó).
  useEffect(() => {
    if (!timedOut) return;
    (async () => {
      await resolveSearchTimeout(orderId);
      router.refresh();
    })();
  }, [timedOut, orderId, router]);

  function cancel() {
    start(async () => {
      await cancelOrderByClient(orderId, 'El cliente canceló la búsqueda');
      router.refresh();
    });
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pct = Math.max(0, Math.min(100, (left / windowSeconds) * 100));
  const R = 42;
  const C = 2 * Math.PI * R;

  return (
    <div className="rounded-3xl border-2 border-brand-orange bg-brand-orange/5 p-8 text-center">
      <div className="relative mx-auto h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="7" className="text-brand-orange/20" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            className="text-brand-orange transition-all duration-500"
            strokeDasharray={C}
            strokeDashoffset={C - (pct / 100) * C}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums text-brand-green">{mm}:{ss}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">restante</span>
        </div>
      </div>

      <h2 className="mt-5 font-display text-xl text-brand-green">Buscando tu grúa…</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Les avisamos a las grúas disponibles. La primera que acepta te toma el viaje. No cierres esta
        pantalla; todavía no se cobra nada.
      </p>

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
