'use client';

import { useEffect, useState } from 'react';
import { X, HelpCircle, ChevronDown } from 'lucide-react';

interface Step {
  title: string;
  text: string;
}

const STEPS: Record<'cliente' | 'gruero', Step[]> = {
  cliente: [
    { title: '1. Cargá tu vehículo y una foto', text: 'Elegí auto o moto, poné los datos y sacá una foto de cómo quedó. Así la grúa sabe a qué va.' },
    { title: '2. Marcá dónde estás y a dónde vas', text: 'Con un toque usás tu ubicación y elegís el destino. Vas a ver el precio total antes de aceptar.' },
    { title: '3. Una grúa acepta y pagás el anticipo', text: 'Ves quién viene, su reputación y su patente. Pagás solo el anticipo por Mercado Pago para reservar.' },
    { title: '4. Seguila en vivo hasta el destino', text: 'La ves venir en el mapa. El resto del servicio se lo pagás al gruero al finalizar.' },
  ],
  gruero: [
    { title: '1. Ponete disponible', text: 'Con el interruptor entrás a la red y empezás a recibir pedidos cercanos. Solo cuando querés.' },
    { title: '2. Te llega un pedido: aceptá o no', text: 'Ves la zona, el vehículo, la foto de la situación y cuánto cobrás. Tenés 2 minutos para aceptar.' },
    { title: '3. Hacé el servicio paso a paso', text: 'Un solo botón por etapa: voy → llegué → cargué → entregué. Cargá adicionales si corresponde.' },
    { title: '4. Cobrá al finalizar', text: 'El saldo (más adicionales) lo cobrás directo al cliente. gruafy ya cobró su comisión por adelantado.' },
  ],
};

/**
 * Guía de uso post-registro (how-to). No es un tutorial que bloquea: es un panel
 * que acompaña, se puede plegar y descartar. Una vez descartado no vuelve a molestar
 * (queda en localStorage), pero deja un acceso chico para reabrirlo.
 */
export function HowTo({ role }: { role: 'cliente' | 'gruero' }) {
  const key = `gruafy_howto_${role}`;
  const [dismissed, setDismissed] = useState<boolean | null>(null); // null = sin decidir (SSR)
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(key) === '1');
  }, [key]);

  function dismiss() {
    localStorage.setItem(key, '1');
    setDismissed(true);
  }
  function reopen() {
    localStorage.removeItem(key);
    setDismissed(false);
    setOpen(true);
  }

  if (dismissed === null) return null; // evita parpadeo en la hidratación

  if (dismissed) {
    return (
      <button onClick={reopen} className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand-green/40 hover:text-brand-green">
        <HelpCircle className="h-3.5 w-3.5" /> ¿Cómo funciona?
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => setOpen((o) => !o)} className="focus-ring flex items-center gap-2 rounded-md text-left">
          <HelpCircle className="h-5 w-5 text-brand-orange" />
          <h2 className="font-semibold">Cómo usar gruafy en 4 pasos</h2>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={dismiss} aria-label="No mostrar más" className="focus-ring rounded-md p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {STEPS[role].map((s) => (
              <li key={s.title} className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
          <button onClick={dismiss} className="focus-ring mt-4 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-brand-cream">
            Entendido, ¡a usarlo!
          </button>
        </>
      )}
    </div>
  );
}
