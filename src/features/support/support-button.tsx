'use client';

import { MessageCircle, Phone } from 'lucide-react';
import { publicEnv } from '@/lib/env';

/**
 * Botón de ayuda humana: WhatsApp con un mensaje pre-armado (rol, pedido, estado)
 * para no perder tiempo explicando contexto, y llamada directa. Si no hay número
 * configurado, no se muestra.
 */
export function SupportButton({
  role,
  orderId,
  stateLabel,
  variant = 'full',
}: {
  role: 'cliente' | 'gruero';
  orderId?: string;
  stateLabel?: string;
  variant?: 'full' | 'compact';
}) {
  const wa = publicEnv.whatsapp;
  if (!wa) return null;

  const shortId = orderId ? orderId.slice(0, 8) : null;
  const lines = [
    'Hola gruafy 👋',
    `Soy ${role} y necesito una mano.`,
    shortId ? `Pedido: #${shortId}` : null,
    stateLabel ? `Estado: ${stateLabel}` : null,
    'Mi situación: ',
  ].filter(Boolean);
  const text = encodeURIComponent(lines.join('\n'));
  const waUrl = `https://wa.me/${wa}?text=${text}`;
  const telUrl = `tel:+${wa}`;

  if (variant === 'compact') {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-brand-green hover:bg-accent"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Ayuda
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-medium">¿Necesitás una mano?</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Te contactamos con soporte al toque, con tu contexto ya cargado.</p>
      <div className="mt-3 flex gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-green py-2.5 text-sm font-semibold text-brand-cream"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <a
          href={telUrl}
          className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg border border-input py-2.5 text-sm font-semibold hover:bg-accent"
        >
          <Phone className="h-4 w-4" /> Llamar
        </a>
      </div>
    </div>
  );
}
