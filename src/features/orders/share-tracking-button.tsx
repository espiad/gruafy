'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { publicEnv } from '@/lib/env';

/** Comparte un link público de seguimiento (como Uber): usa Web Share o copia. */
export function ShareTrackingButton({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${publicEnv.appUrl}/seguir/${orderId}`;

  async function share() {
    const data = { title: 'Seguí mi grúa en gruafy', text: 'Mirá dónde está la grúa en vivo:', url };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* cancelado: caemos a copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin permiso de portapapeles */
    }
  }

  return (
    <button
      onClick={share}
      className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-input py-2.5 text-sm font-medium hover:bg-accent"
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
      {copied ? 'Link copiado' : 'Compartir seguimiento'}
    </button>
  );
}
