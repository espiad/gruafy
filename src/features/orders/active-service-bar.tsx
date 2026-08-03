'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';
import { STATE_LABELS, isTerminal, type OrderState } from '@/features/orders/state-machine';

/**
 * Barra fija "servicio en curso". Ancla al cliente al seguimiento: aunque toque
 * el navbar y cambie de pantalla, siempre tiene un acceso de un toque para volver.
 * Se oculta si ya está en la pantalla de ese pedido.
 */
export function ActiveServiceBar() {
  const pathname = usePathname();
  const [active, setActive] = useState<{ id: string; state: OrderState } | null>(null);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = createClient();
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from('service_orders')
        .select('id, state, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!alive) return;
      const a = (data ?? []).find((o) => !isTerminal(o.state as OrderState) && o.state !== 'draft');
      setActive(a ? { id: a.id, state: a.state as OrderState } : null);
    }
    void load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!active) return null;
  if (pathname === `/cliente/solicitudes/${active.id}`) return null;

  return (
    <Link
      href={`/cliente/solicitudes/${active.id}`}
      className="focus-ring sticky top-0 z-30 flex items-center justify-between gap-3 bg-brand-orange px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-md"
    >
      <span className="flex items-center gap-2">
        <Radar className="h-4 w-4 animate-pulse-soft" /> Servicio en curso · {STATE_LABELS[active.state]}
      </span>
      <span className="flex items-center gap-1">Ver <ChevronRight className="h-4 w-4" /></span>
    </Link>
  );
}
