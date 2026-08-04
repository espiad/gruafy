'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { quote, DEFAULT_PRICING } from '@/features/pricing/pricing';
import { formatARS } from '@/lib/format';

/**
 * Simulador de ganancias para grueros (espejo del simulador de costos del cliente).
 * Muestra lo que cobra el gruero por un viaje típico y una proyección mensual
 * según cuántos viajes por día haga. Estimación explícita, con precios de ejemplo.
 */
const WORK_DAYS = 26;

export function EarningsSimulator() {
  const [km, setKm] = useState(12);
  const [dollys, setDollys] = useState(0);
  const [perDay, setPerDay] = useState(3);

  const perTrip = useMemo(
    () => quote({ distanceMeters: km * 1000, dollys }, DEFAULT_PRICING).saldo_estimado_gruero,
    [km, dollys],
  );
  const perMonth = perTrip * perDay * WORK_DAYS;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <label className="block text-sm font-medium">
            Distancia típica del acarreo: <span className="text-brand-green">{km} km</span>
          </label>
          <input
            type="range"
            min={2}
            max={60}
            value={km}
            onChange={(e) => setKm(Number(e.target.value))}
            className="mt-2 w-full accent-brand-orange"
            aria-label="Distancia en kilómetros"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Dollys</label>
          <div className="flex gap-2">
            {[0, 1, 2].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDollys(n)}
                className={`focus-ring h-11 flex-1 rounded-md border text-sm font-medium ${
                  dollys === n ? 'border-brand-orange bg-brand-orange/15 text-brand-green' : 'border-input hover:bg-accent'
                }`}
              >
                {n === 0 ? 'Ninguno' : `${n}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Viajes por día: <span className="text-brand-green">{perDay}</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={perDay}
            onChange={(e) => setPerDay(Number(e.target.value))}
            className="mt-2 w-full accent-brand-orange"
            aria-label="Viajes por día"
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-accent p-3 text-xs text-accent-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Estimación con precios de ejemplo sobre {WORK_DAYS} días trabajados al mes. El saldo lo cobrás directo del cliente al finalizar; gruafy solo cobra su comisión por adelantado.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-brand-green bg-brand-green/5 p-6">
          <p className="text-sm text-muted-foreground">Cobrás por este viaje</p>
          <p className="font-display text-4xl text-brand-green">{formatARS(perTrip)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Directo del cliente, al finalizar.</p>
        </div>
        <div className="rounded-2xl bg-brand-ink p-6 text-brand-cream">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-orange" />
            <p className="text-sm text-brand-cream/80">Proyección mensual estimada</p>
          </div>
          <p className="mt-1 font-display text-4xl">{formatARS(perMonth)}</p>
          <p className="mt-1 text-xs text-brand-cream/70">
            {perDay} viaje{perDay > 1 ? 's' : ''}/día · {WORK_DAYS} días
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/registro/proveedor">Sumar mi grúa y empezar a cobrar</Link>
        </Button>
      </div>
    </div>
  );
}
