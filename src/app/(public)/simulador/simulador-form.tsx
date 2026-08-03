'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { quote, DEFAULT_PRICING } from '@/features/pricing/pricing';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { hasGeoapify, route, type GeoPoint } from '@/lib/geoapify';
import { formatDistance } from '@/lib/format';

/**
 * Simulador público. Si hay Geoapify configurado, autocompleta direcciones y
 * calcula la ruta real. Si no, permite estimar con un control de distancia para
 * que la herramienta siga siendo útil (marcado explícitamente como estimación).
 */
export function SimuladorForm() {
  const geo = hasGeoapify();
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [dest, setDest] = useState<GeoPoint | null>(null);
  const [manualKm, setManualKm] = useState(10);
  const [routedMeters, setRoutedMeters] = useState<number | null>(null);
  const [dollys, setDollys] = useState(0);
  const [loading, setLoading] = useState(false);

  const distanceMeters = routedMeters ?? manualKm * 1000;

  async function recomputeRoute(o: GeoPoint | null, d: GeoPoint | null) {
    if (!geo || !o || !d) return;
    setLoading(true);
    const r = await route(o, d);
    setLoading(false);
    if (r) setRoutedMeters(r.distanceMeters);
  }

  const breakdown = useMemo(
    () => quote({ distanceMeters, dollys }, DEFAULT_PRICING),
    [distanceMeters, dollys],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        {geo ? (
          <>
            <AddressAutocomplete
              label="¿Dónde estás? (punto A)"
              placeholder="Dirección de origen"
              onSelect={(p) => {
                setOrigin(p);
                setRoutedMeters(null);
                void recomputeRoute(p, dest);
              }}
            />
            <AddressAutocomplete
              label="¿A dónde vas? (punto B)"
              placeholder="Dirección de destino"
              onSelect={(p) => {
                setDest(p);
                setRoutedMeters(null);
                void recomputeRoute(origin, p);
              }}
            />
            {routedMeters != null && (
              <p className="text-sm text-muted-foreground">
                Ruta estimada: <strong>{formatDistance(routedMeters)}</strong>
              </p>
            )}
            {loading && <p className="text-sm text-muted-foreground">Calculando ruta…</p>}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Estimación por distancia. Al pedir de verdad, gruafy calcula la ruta exacta entre tu
                origen y destino.
              </p>
            </div>
            <label className="block text-sm font-medium">
              Distancia aproximada: <span className="text-brand-green">{manualKm} km</span>
            </label>
            <input
              type="range"
              min={1}
              max={80}
              value={manualKm}
              onChange={(e) => setManualKm(Number(e.target.value))}
              className="w-full accent-brand-orange"
              aria-label="Distancia en kilómetros"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">
            Dollys (si una rueda está trabada, ausente o bloqueada)
          </label>
          <div className="flex gap-2">
            {[0, 1, 2].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDollys(n)}
                className={`focus-ring h-11 flex-1 rounded-md border text-sm font-medium ${
                  dollys === n
                    ? 'border-brand-orange bg-brand-orange/15 text-brand-green'
                    : 'border-input hover:bg-accent'
                }`}
              >
                {n === 0 ? 'Ninguno' : `${n} dolly${n > 1 ? 's' : ''}`}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Un dolly es un carrito que levanta las ruedas que no giran para poder remolcar.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <QuoteBreakdownCard quote={breakdown} />
        <Button asChild size="lg" className="w-full">
          <Link href="/registro">Registrate para pedir esta grúa</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          El simulador no crea una orden. Para pedir de verdad necesitás una cuenta y confirmar el
          presupuesto con la ruta real.
        </p>
      </div>
    </div>
  );
}
