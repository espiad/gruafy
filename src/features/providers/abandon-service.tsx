'use client';

import { useState } from 'react';
import { AlertTriangle, MessageCircle, Phone } from 'lucide-react';
import { publicEnv } from '@/lib/env';

/**
 * Salida del gruero cuando no puede terminar un servicio ya empezado (se le rompe
 * la grúa, el auto no se puede cargar, un imprevisto).
 *
 * A propósito NO cancela solo. Hay una persona varada y plata de por medio: la baja
 * la hace soporte a mano, después de coordinar cómo sigue el cliente. El botón
 * existe para que el gruero tenga un camino claro en vez de abandonar el viaje en
 * silencio (que es lo que pasaba antes: no había ninguna acción posible).
 *
 * Las consecuencias se dicen ANTES de que escriba, sin letra chica.
 */
export function AbandonService({ orderId }: { orderId: string }) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="focus-ring mx-auto block rounded-md px-2 py-1 text-sm font-medium text-destructive underline underline-offset-2 hover:opacity-80"
      >
        No puedo terminar este servicio
      </button>
    );
  }

  const mensaje = `Hola, no puedo terminar el servicio ${orderId.slice(0, 8)} y necesito cancelarlo. Motivo: `;

  return (
    <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-5">
      <p className="flex items-center gap-2 font-display text-lg text-destructive">
        <AlertTriangle className="h-5 w-5 shrink-0" /> Antes de cancelar, leé esto
      </p>

      <ul className="mt-3 space-y-2.5 text-sm">
        <li className="flex gap-2">
          <span aria-hidden className="text-destructive">•</span>
          <span>
            Tenés que dejar <strong>a la persona en un lugar seguro</strong>, no en la banquina ni en
            la ruta.
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-destructive">•</span>
          <span>
            El <strong>vehículo también</strong>: bien estacionado y en un lugar seguro. No lo dejes
            donde estorbe o se lo puedan llevar.
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-destructive">•</span>
          <span>
            <strong>No vas a cobrar nada</strong> de este viaje, ni el saldo ni los adicionales que
            hayas cargado.
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-destructive">•</span>
          <span>
            Al cliente le devolvemos el anticipo y lo llamamos nosotros para ver cómo sigue.
          </span>
        </li>
      </ul>

      <p className="mt-4 rounded-xl bg-card p-3 text-sm text-muted-foreground">
        La cancelación la hace <strong>soporte</strong>, no se hace sola: escribinos y lo resolvemos
        con vos en el momento.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {publicEnv.whatsapp && (
          <>
            <a
              href={`https://wa.me/${publicEnv.whatsapp}?text=${encodeURIComponent(mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" /> Escribir a soporte
            </a>
            <a
              href={`tel:+${publicEnv.whatsapp}`}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-input px-5 py-3 text-sm font-medium"
            >
              <Phone className="h-4 w-4" /> Llamar
            </a>
          </>
        )}
        <button
          onClick={() => setAbierto(false)}
          className="focus-ring rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sigo con el viaje
        </button>
      </div>
    </div>
  );
}
