'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Flag, Timer, Car, Bike, User, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { acceptOffer, rejectOffer } from './actions';
import { formatARS, formatDistance } from '@/lib/format';

interface Driver {
  id: string;
  full_name: string;
  role: string;
}

interface Props {
  orderId: string;
  expiresAt: string;
  originZone: string;
  destAddress: string | null;
  distanceMeters: number | null;
  dollys: number;
  wheelsBlocked: number;
  wheelsUnsure?: boolean;
  vehicleType?: 'auto' | 'moto';
  vehicle?: { brand: string; model: string; year: number | null } | null;
  amountProvider: number | null;
  drivers: Driver[];
  situationPhotoUrl?: string | null;
}

/**
 * Tarjeta de oferta (broadcast). Le damos al gruero los datos para decidir: ZONA de
 * recogida (no el domicilio exacto, que es dato sensible de una persona varada),
 * destino, distancia, condiciones, vehículo y monto. La dirección exacta y el
 * contacto del cliente se revelan recién cuando acepta y el cliente paga.
 */
export function OfferCard(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [driverId, setDriverId] = useState<string>(props.drivers[0]?.id ?? '');

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
      const res = await acceptOffer(props.orderId, driverId || undefined);
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

  const VType = props.vehicleType === 'moto' ? Bike : Car;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="rounded-2xl border-2 border-brand-orange bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-green">
          <Timer className="h-3.5 w-3.5" /> {mm}:{ss}
        </span>
        {props.amountProvider != null && (
          <span className="font-display text-lg text-brand-green">{formatARS(props.amountProvider)}</span>
        )}
      </div>

      {/* Zona de recogida (aprox.) y destino, para decidir sin exponer el domicilio. */}
      <div className="mt-3 space-y-2 text-sm">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
          <span><strong>Zona de recogida:</strong> {props.originZone}</span>
        </p>
        <p className="flex items-start gap-2">
          <Flag className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span><strong>Destino:</strong> {props.destAddress ?? '—'}</span>
        </p>
      </div>

      {props.situationPhotoUrl && (
        <a
          href={props.situationPhotoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring group relative mt-3 block overflow-hidden rounded-lg border border-border"
          title="Tocá para ver la foto completa"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.situationPhotoUrl} alt="Situación del vehículo" className="max-h-40 w-full object-cover" />
          <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-brand-ink/80 px-2 py-1 text-xs font-medium text-brand-cream">
            <Maximize2 className="h-3 w-3" /> Ver foto
          </span>
        </a>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><VType className="h-3.5 w-3.5" />
          {props.vehicle ? `${props.vehicle.brand} ${props.vehicle.model} ${props.vehicle.year ?? ''}` : props.vehicleType === 'moto' ? 'Moto' : 'Auto'}
        </span>
        <span>· {props.distanceMeters ? formatDistance(props.distanceMeters) : '—'}</span>
        {props.dollys > 0 && <span>· {props.dollys} dolly(s)</span>}
        {props.wheelsBlocked > 0 && <span>· {props.wheelsBlocked} rueda(s) sin girar</span>}
        {props.wheelsUnsure && <span>· estado de ruedas a confirmar</span>}
      </div>

      {/* Selector de conductor (si hay más de uno) */}
      {props.drivers.length > 1 && (
        <div className="mt-3">
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <User className="h-3.5 w-3.5" /> ¿Quién maneja?
          </label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="focus-ring h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {props.drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} {d.role === 'owner' ? '(dueño)' : '(conductor)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button onClick={accept} disabled={pending || remaining <= 0} className="flex-1">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Aceptar
        </Button>
        <Button onClick={reject} disabled={pending} variant="outline">Rechazar</Button>
      </div>
    </div>
  );
}
