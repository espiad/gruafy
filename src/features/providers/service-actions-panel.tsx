'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

/** Punto contra el que se chequea la cercanía en cada paso, y cómo se llama. */
const PUNTO_ESPERADO: Partial<Record<OrderState, { campo: 'origen' | 'destino'; nombre: string }>> = {
  provider_en_route: { campo: 'origen', nombre: 'el punto de recogida' },
  provider_arrived: { campo: 'origen', nombre: 'el punto de recogida' },
  in_transit: { campo: 'destino', nombre: 'el destino' },
};

const TOLERANCIA_M = 500;

export function ServiceActionsPanel({
  orderId,
  state,
  origen,
  destino,
}: {
  orderId: string;
  state: OrderState;
  origen?: { lat: number; lng: number } | null;
  destino?: { lat: number; lng: number } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [lejos, setLejos] = useState<number | null>(null);
  const next = NEXT[state];

  if (!next) {
    if (state === 'completed') {
      return <p className="rounded-xl border border-success/40 bg-success/5 p-4 text-center text-sm font-medium text-success">Servicio finalizado. ¡Buen viaje!</p>;
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
        // Sin permiso de ubicación no molestamos: seguimos normal.
        setVerificando(false);
        avanzar();
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const esperado = PUNTO_ESPERADO[state];

  if (lejos !== null) {
    return (
      <div className="rounded-2xl border-2 border-warning bg-warning/10 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-warning-foreground" /> Parece que todavía estás lejos
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Estás a <strong>{formatDistance(lejos)}</strong> de {esperado?.nombre ?? 'el punto'}. Puede ser
          el GPS o que la dirección esté mal cargada. ¿Confirmás igual?
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
    </div>
  );
}
