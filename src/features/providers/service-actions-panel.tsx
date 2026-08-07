'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MapPin, ArrowRight, MessageCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';
import { AbandonService } from './abandon-service';
import { advanceOrderState } from './actions';
import { haversineMeters } from '@/lib/geo/distance';
import { formatDistance } from '@/lib/format';
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

/**
 * Puntos donde se chequea la cercanía. A propósito son SOLO dos: confirmar la
 * llegada al cliente y confirmar la entrega. Antes también se pedía al cargar el
 * vehículo, que es el mismo lugar donde ya se verificó al llegar: verificar dos
 * veces seguidas lo mismo era pura fricción.
 */
const PUNTO_ESPERADO: Partial<Record<OrderState, { campo: 'origen' | 'destino'; nombre: string }>> = {
  provider_en_route: { campo: 'origen', nombre: 'el punto de recogida' },
  in_transit: { campo: 'destino', nombre: 'el destino' },
};

const TOLERANCIA_M = 500;

/** Estados en los que el servicio se cortó y el gruero tiene que enterarse. */
const CANCELADOS: OrderState[] = [
  'cancelled_by_admin',
  'cancelled_by_client',
  'cancelled_by_provider',
  'refund_pending',
  'refunded',
  // Faltaban: 'disputed' dejaba al gruero con la pantalla muda Y contándole como
  // servicio activo, así que no veía ninguna oferta nueva. Y 'payment_expired' lo
  // dejaba esperando un pago que ya se había caído.
  'disputed',
  'payment_expired',
];

export function ServiceActionsPanel({
  orderId,
  state,
  origen,
  destino,
  motivoCancelacion,
  facturaUrl,
}: {
  orderId: string;
  state: OrderState;
  origen?: { lat: number; lng: number } | null;
  destino?: { lat: number; lng: number } | null;
  motivoCancelacion?: string | null;
  /** Link de WhatsApp al cliente con la factura (solo al finalizar). */
  facturaUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [lejos, setLejos] = useState<number | null>(null);
  const next = NEXT[state];

  if (!next) {
    if (CANCELADOS.includes(state)) {
      // El servicio se cortó desde afuera. Antes solo desaparecía el botón, así que
      // el gruero seguía trabajando sin enterarse de que ya no había viaje.
      return (
        <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-5 text-center">
          <p className="font-display text-lg text-destructive">
            {state === 'payment_expired'
              ? 'El cliente no llegó a pagar'
              : state === 'disputed'
                ? 'Este servicio está en revisión'
                : state === 'refunded' || state === 'refund_pending'
                  ? 'Este servicio se reembolsó'
                  : 'Este servicio fue cancelado'}
          </p>
          {motivoCancelacion ? (
            <div className="mt-3 rounded-xl bg-card p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo</p>
              <p className="mt-1 text-base">{motivoCancelacion}</p>
            </div>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">
            {state === 'payment_expired'
              ? 'Se venció la ventana de pago y la reserva se liberó. No salgas: ya podés tomar otro viaje.'
              : 'No sigas con el traslado. Si ya habías empezado, escribinos y lo resolvemos.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/proveedor"
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-brand-green px-5 py-3 text-sm font-semibold text-brand-cream"
            >
              Volver al panel <ArrowRight className="h-4 w-4" />
            </Link>
            {publicEnv.whatsapp && (
              <a
                href={`https://wa.me/${publicEnv.whatsapp}?text=${encodeURIComponent(
                  `Hola, me cancelaron el servicio ${orderId.slice(0, 8)} y quiero consultar.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" /> Hablar con soporte
              </a>
            )}
          </div>
        </div>
      );
    }
    if (state === 'completed') {
      // Cerrado el servicio, lo que quiere el gruero es volver a trabajar: le damos
      // la vuelta al panel en grande, no una pantalla muerta.
      return (
        <div className="rounded-2xl border-2 border-success bg-success/5 p-5 text-center">
          <p className="font-display text-lg text-success">¡Servicio finalizado!</p>
          <p className="mt-1 text-sm text-muted-foreground">Ya podés tomar otro viaje.</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            {facturaUrl && (
              <a
                href={facturaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-semibold text-white sm:w-auto"
              >
                <FileText className="h-4 w-4" /> Enviarle la factura al cliente
              </a>
            )}
            <Link
              href="/proveedor"
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-green px-5 py-3 text-sm font-semibold text-brand-cream sm:w-auto"
            >
              Buscar más viajes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      );
    }
    return null;
  }

  function avanzar() {
    setError(null);
    setLejos(null);
    start(async () => {
      const res = await advanceOrderState(orderId, next!.to);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No pudimos actualizar');
    });
  }

  /**
   * Antes de confirmar un paso que implica "estoy ahí", comparamos la ubicación real
   * con el punto esperado. NO bloquea: solo avisa, porque el GPS falla, hay
   * estacionamientos, subsuelos y direcciones mal cargadas. La decisión es del gruero.
   *
   * Tres desenlaces, y ninguno es silencioso: cerca → avanza solo; lejos → aviso con
   * la distancia; no se pudo medir → lo decimos y se confirma a mano. Antes, cualquier
   * fallo del GPS (o el timeout de 4s) caía en `avanzar()` sin decir nada, así que
   * estando a kilómetros el paso se daba igual y parecía que el control no existía.
   */
  function intentarAvanzar() {
    const esperado = PUNTO_ESPERADO[state];
    const punto = esperado?.campo === 'destino' ? destino : origen;
    if (!esperado || !punto || !('geolocation' in navigator)) return avanzar();

    setVerificando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVerificando(false);
        const metros = haversineMeters({ lat: pos.coords.latitude, lng: pos.coords.longitude }, punto);
        if (metros > TOLERANCIA_M) setLejos(Math.round(metros));
        else avanzar();
      },
      () => {
        setVerificando(false);
        setLejos(-1); // -1 = no pudimos medir (permiso denegado, sin señal o timeout)
      },
      // El seguimiento en vivo ya mantiene un GPS fresco corriendo (watchPosition),
      // así que aceptamos una posición reciente (hasta 5 min) en vez de forzar una
      // lectura nueva. Antes, en el 2º chequeo (entrega) esa lectura fresca se pasaba
      // del timeout y fallaba, aunque el GPS estuviera perfecto. Alta precisión para
      // que la posición sea compatible con la del seguimiento.
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 },
    );
  }

  const esperado = PUNTO_ESPERADO[state];

  if (lejos !== null) {
    const noSePudo = lejos < 0;
    return (
      <div className="rounded-2xl border-2 border-warning bg-warning/10 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-warning-foreground" />
          {noSePudo ? 'No pudimos verificar tu ubicación' : 'Parece que todavía estás lejos'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {noSePudo ? (
            <>
              No conseguimos la señal del GPS (puede ser el permiso de ubicación o que estés bajo
              techo). Confirmá vos mismo que ya estás en {esperado?.nombre ?? 'el punto'}.
            </>
          ) : (
            <>
              Estás a <strong>{formatDistance(lejos)}</strong> de {esperado?.nombre ?? 'el punto'}. Puede
              ser el GPS o que la dirección esté mal cargada. ¿Confirmás igual?
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={avanzar} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Sí, confirmar igual
          </Button>
          <Button variant="ghost" onClick={() => setLejos(null)} disabled={pending}>
            Todavía no
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={intentarAvanzar} disabled={pending || verificando} size="lg" className="w-full">
        {(pending || verificando) && <Loader2 className="h-4 w-4 animate-spin" />}
        {verificando ? 'Verificando tu ubicación…' : next.label}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Próximo estado: {STATE_LABELS[next.to]}
      </p>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      {/* Salida para cuando algo sale mal a mitad del viaje. Solo con el servicio ya
          arrancado: antes de eso el gruero simplemente no acepta la oferta. */}
      {state !== 'paid' && <AbandonService orderId={orderId} />}
    </div>
  );
}
