'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Radio } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';
import { saveLocation } from './actions';
import { haversineMeters } from '@/lib/geo/distance';

/**
 * Comparte la ubicación del proveedor mientras la pantalla está activa.
 * Publica por Supabase Realtime (canal por orden) para el mapa del cliente, y
 * persiste cada cierto tiempo/distancia. No promete tracking en segundo plano.
 */
export function LocationSender({ orderId, intervalMs = 7000 }: { orderId: string; intervalMs?: number }) {
  const [status, setStatus] = useState<'idle' | 'sharing' | 'denied' | 'unsupported'>('idle');
  const lastSent = useRef<{ lat: number; lng: number; t: number } | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    const channel = hasSupabaseConfig ? createClient().channel(`order:${orderId}`) : null;
    channel?.subscribe();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('sharing');
        const { latitude: lat, longitude: lng, accuracy, heading, speed } = pos.coords;
        const now = Date.now();
        const prev = lastSent.current;
        const movedEnough = !prev || haversineMeters(prev, { lat, lng }) > 25;
        const timeEnough = !prev || now - prev.t > intervalMs;
        if (!movedEnough && !timeEnough) return;
        lastSent.current = { lat, lng, t: now };

        channel?.send({
          type: 'broadcast',
          event: 'location',
          payload: { lat, lng, heading, speed, at: now },
        });
        void saveLocation({
          orderId,
          lat,
          lng,
          accuracy: accuracy ?? undefined,
          heading: heading ?? undefined,
          speed: speed ?? undefined,
        });
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      channel?.unsubscribe();
    };
  }, [orderId, intervalMs]);

  if (status === 'denied' || status === 'unsupported') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          No pudimos acceder a tu ubicación. El cliente no te ve en el mapa. Activá los permisos de
          ubicación del navegador y mantené gruafy abierto durante el servicio.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-brand-orange/40 bg-brand-orange/5 p-4 text-sm">
      <Radio className="h-4 w-4 animate-pulse-soft text-brand-orange" />
      <p>Compartiendo tu ubicación con el cliente. Mantené gruafy abierto durante el servicio.</p>
    </div>
  );
}
