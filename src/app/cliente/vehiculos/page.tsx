import type { Metadata } from 'next';
import Link from 'next/link';
import { Car, PlusCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Mis vehículos' };

const GEARBOX = { manual: 'Caja manual', automatic: 'Caja automática', unknown: 'Caja sin especificar' };

export default async function VehiculosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, patente, gearbox, has_keys')
    .eq('client_id', user!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Mis vehículos</h1>
        <Button asChild size="sm">
          <Link href="/cliente/solicitar"><PlusCircle className="h-4 w-4" /> Agregar</Link>
        </Button>
      </div>
      {vehicles && vehicles.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <li key={v.id} className="rounded-xl border border-border bg-card p-4">
              <Car className="h-5 w-5 text-brand-orange" />
              <p className="mt-2 font-semibold">{v.brand} {v.model} {v.year ?? ''}</p>
              <p className="text-sm text-muted-foreground">{v.patente} · {GEARBOX[v.gearbox]}</p>
              <p className="text-xs text-muted-foreground">{v.has_keys ? 'Con llaves' : 'Sin llaves'}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Cuando pidas una grúa vas a poder guardar tu vehículo acá.</p>
        </div>
      )}
    </div>
  );
}
