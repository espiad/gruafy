'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
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
 * Actualización en tiempo real de una orden: se suscribe a los cambios de la fila
 * (Supabase Realtime) y refresca al instante, sin depender del polling. Requiere
 * que `service_orders` esté en la publicación de realtime; si no lo está, no pasa
 * nada: el OrderAutoRefresh (4s) es el que GARANTIZA la actualización. Realtime es
 * un extra que la hace instantánea, nunca la única vía. Silencioso.
 */
export function OrderRealtime({ orderId }: { orderId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-rt-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_orders', filter: `id=eq.${orderId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, router]);
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
  const [cancelError, setCancelError] = useState<string | null>(null);
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
    setCancelError(null);
    start(async () => {
      // Carrera real y frecuente: una grúa puede aceptar en el mismo instante en
      // que el cliente cancela. Antes no se miraba el resultado, así que creía
      // haber cancelado y aparecía en la pantalla de cobro sin entender por qué.
      const res = await cancelOrderByClient(orderId, 'El cliente canceló la búsqueda');
      if (!res.ok) {
        setCancelError(
          res.error === 'La solicitud ya no se puede cancelar'
            ? 'Justo te aceptó una grúa. Mirá los datos abajo: si no querés seguir, podés soltar la reserva sin pagar.'
            : (res.error ?? 'No pudimos cancelar'),
        );
      }
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
      {cancelError && (
        <p className="mt-3 rounded-lg bg-warning/15 p-3 text-sm text-warning-foreground">{cancelError}</p>
      )}
    </div>
  );
}

/**
 * Botón discreto para soltar la reserva antes de pagar (sin quedar atrapado en la
 * pantalla de pago). Pide confirmación porque libera la grúa que ya te aceptó.
 */
export function CancelAwaitingPayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setError(null);
    start(async () => {
      const res = await cancelOrderByClient(orderId, 'El cliente no confirmó el pago');
      if (res.ok) router.refresh();
      else {
        setError(res.error ?? 'No se pudo cancelar');
        router.refresh();
      }
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="focus-ring mx-auto block rounded-md px-2 py-1 text-sm font-medium text-destructive underline underline-offset-2 hover:opacity-80"
      >
        No quiero seguir, cancelar la reserva
      </button>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground">Se libera la grúa que te aceptó. ¿Confirmás?</p>
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={cancel} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Sí, cancelar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={pending}>
          Seguir con el pago
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Cuenta regresiva del tiempo de pago. Es el MISMO anillo que el de la búsqueda:
 * el número vive dentro de un círculo de tamaño fijo, así que al cambiar los
 * dígitos no re-fluye el texto de alrededor (antes, embebido en una frase, hacía
 * saltar el renglón en mobile a cada segundo).
 */
export function PaymentCountdown({
  deadline,
  windowSeconds = 600,
}: {
  deadline: string | null;
  windowSeconds?: number;
}) {
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
  const pct = Math.max(0, Math.min(100, (left / windowSeconds) * 100));
  const R = 42;
  const C = 2 * Math.PI * R;
  // Último minuto: el anillo pasa a rojo para que se note sin leer el número.
  const urgente = left <= 60;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-brand-orange/20" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={`transition-all duration-500 ${urgente ? 'text-destructive' : 'text-brand-orange'}`}
            strokeDasharray={C}
            strokeDashoffset={C - (pct / 100) * C}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono text-lg font-semibold tabular-nums ${urgente ? 'text-destructive' : 'text-brand-green'}`}>
            {mm}:{ss}
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-center text-xs text-muted-foreground">
        {left === 0 ? 'Se venció el tiempo de pago' : 'para confirmar la reserva'}
      </p>
    </div>
  );
}
