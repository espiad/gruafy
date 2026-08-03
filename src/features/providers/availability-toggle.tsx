'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, MapPinOff } from 'lucide-react';
import { setAvailability } from './actions';
import { cn } from '@/lib/utils';

/** Botón Disponible / No disponible. Al activarse pide permiso de ubicación. */
export function AvailabilityToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    const next = !on;
    if (!next) {
      start(async () => {
        const res = await setAvailability(false);
        if (res.ok) {
          setOn(false);
          router.refresh();
        } else setError(res.error ?? 'Error');
      });
      return;
    }
    // Activar: pedir ubicación primero.
    if (!('geolocation' in navigator)) {
      start(async () => {
        const res = await setAvailability(true);
        if (res.ok) setOn(true);
        else setError(res.error ?? 'Error');
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        start(async () => {
          const res = await setAvailability(true, pos.coords.latitude, pos.coords.longitude);
          if (res.ok) {
            setOn(true);
            router.refresh();
          } else setError(res.error ?? 'Error');
        });
      },
      () => setError('Necesitamos tu ubicación para recibir pedidos cercanos.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="text-right">
      <button
        onClick={toggle}
        disabled={pending}
        className={cn(
          'focus-ring inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors',
          on ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? <MapPin className="h-4 w-4" /> : <MapPinOff className="h-4 w-4" />}
        {on ? 'Disponible' : 'No disponible'}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-destructive">{error}</p>}
    </div>
  );
}
