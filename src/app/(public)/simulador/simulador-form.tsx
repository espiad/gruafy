'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { quote, DEFAULT_PRICING, type PricingSettings } from '@/features/pricing/pricing';

/**
 * Simulador público de costo (B2C), simplificado: una sola perilla de distancia
 * aproximada a recorrer con el vehículo acarreado. Sin direcciones ni dollys, para
 * que dar una idea de precio sea instantáneo.
 */
export function SimuladorForm({ pricing = DEFAULT_PRICING }: { pricing?: PricingSettings }) {
  const [km, setKm] = useState(30);

  const breakdown = useMemo(
    () => quote({ distanceMeters: km * 1000, dollys: 0 }, pricing),
    [km, pricing],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <label className="block text-sm font-medium">
            Distancia aprox. a recorrer con el vehículo acarreado
          </label>
          <p className="mt-2 font-display text-3xl text-brand-green">{km} km</p>
          <input
            type="range"
            min={10}
            max={120}
            step={10}
            value={km}
            onChange={(e) => setKm(Number(e.target.value))}
            className="mt-3 w-full accent-brand-orange"
            aria-label="Distancia aproximada en kilómetros"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>10 km</span>
            <span>120 km</span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-accent p-3 text-xs text-accent-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Es una estimación por distancia. Al pedir de verdad, gruafy calcula la ruta exacta entre tu
            origen y destino.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <QuoteBreakdownCard quote={breakdown} />
        <Button asChild size="lg" className="w-full">
          <Link href="/registro">Registrate para pedir tu grúa</Link>
        </Button>
      </div>
    </div>
  );
}
