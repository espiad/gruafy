'use client';

import { useState } from 'react';
import { Siren, PhoneCall, X } from 'lucide-react';

/**
 * Botón de emergencia → 911. Deliberadamente en DOS pasos (no se marca de un
 * toque): primero abre una confirmación clara, y recién ahí dispara la llamada.
 * Evita llamadas accidentales al 911 pero lo deja a un toque real en una urgencia.
 */
export function EmergencyButton() {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-4 text-center">
        <p className="font-semibold text-destructive">¿Es una emergencia?</p>
        <p className="mt-1 text-sm text-muted-foreground">Vas a llamar al 911 (policía / emergencias).</p>
        <div className="mt-3 flex justify-center gap-2">
          <a
            href="tel:911"
            className="focus-ring inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white"
          >
            <PhoneCall className="h-4 w-4" /> Sí, llamar al 911
          </a>
          <button
            onClick={() => setConfirm(false)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-accent"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border-2 border-destructive/40 bg-destructive/5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
    >
      <Siren className="h-4 w-4" /> Emergencia — llamar al 911
    </button>
  );
}
