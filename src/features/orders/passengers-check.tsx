'use client';

import { useEffect, useState } from 'react';
import { Users, Check, AlertTriangle, MessageCircle } from 'lucide-react';
import { publicEnv } from '@/lib/env';

/**
 * Aviso de cupo con confirmación explícita. Antes era un párrafo más y pasaba
 * desapercibido: ahora hay que responder cuántos son. Si son más de 2, se les
 * explica qué hacer ANTES de que llegue la grúa (después es tarde: el gruero no
 * puede dejar a nadie en la ruta). La respuesta queda guardada por pedido.
 */
export function PassengersCheck({ orderId, max = 2 }: { orderId: string; max?: number }) {
  const key = `gruafy_pax_${orderId}`;
  const [respuesta, setRespuesta] = useState<'ok' | 'mas' | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(key);
    setRespuesta(v === 'ok' || v === 'mas' ? v : null);
    setListo(true);
  }, [key]);

  function responder(v: 'ok' | 'mas') {
    localStorage.setItem(key, v);
    setRespuesta(v);
  }

  if (!listo) return null;

  // Ya confirmó que entran: recordatorio mínimo, sin ocupar pantalla.
  if (respuesta === 'ok') {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-success" /> Confirmaste que viajan {max} personas o menos.
      </p>
    );
  }

  const wa = publicEnv.whatsapp;

  return (
    <div className="rounded-2xl border-2 border-warning bg-warning/10 p-5">
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-6 w-6 shrink-0 text-warning-foreground" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg">¿Cuántas personas viajan?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Con la grúa entran <strong>{max} personas como máximo</strong>. Si son más, hay que
            resolverlo <strong>antes</strong> de que llegue: el gruero no puede dejar a nadie en la vía
            pública, y esperar demora el servicio.
          </p>

          {respuesta === 'mas' ? (
            <div className="mt-3 rounded-lg bg-card p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" /> Son más de {max}: coordiná otro transporte ahora
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pedí un remís o taxi, o que alguien los pase a buscar, así salen apenas llegue la grúa.
                Suben {max} con el vehículo y el resto va por su cuenta.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {wa && (
                  <a
                    href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola gruafy 👋 Somos más de ' + max + ' personas para el auxilio y necesito una mano para coordinar.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-brand-cream"
                  >
                    <MessageCircle className="h-4 w-4" /> Pedir ayuda a soporte
                  </a>
                )}
                <button
                  onClick={() => responder('ok')}
                  className="focus-ring rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  Ya lo resolví
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => responder('ok')}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-brand-cream"
              >
                <Check className="h-4 w-4" /> Somos {max} o menos
              </button>
              <button
                onClick={() => responder('mas')}
                className="focus-ring rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Somos más de {max}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
