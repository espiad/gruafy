import type { Metadata } from 'next';
import { Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AddVehicleForm, DeleteVehicleButton } from '@/features/vehicles/vehicle-manager';

export const metadata: Metadata = { title: 'Mis vehículos' };

const GEARBOX = { manual: 'Caja manual', automatic: 'Caja automática', unknown: 'Caja sin especificar' };
const MAX_VEHICLES = 3;

export default async function VehiculosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, patente, gearbox, has_keys, color')
    .eq('client_id', user!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const count = vehicles?.length ?? 0;
  const remaining = MAX_VEHICLES - count;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Mis vehículos</h1>
        <p className="text-sm text-muted-foreground">
          Guardá hasta {MAX_VEHICLES} para pedir una grúa más rápido. Tenés {count} de {MAX_VEHICLES}.
        </p>
      </div>

      {vehicles && vehicles.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <li key={v.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <Car className="h-5 w-5 text-brand-orange" />
                <DeleteVehicleButton vehicleId={v.id} label={`${v.brand} ${v.model}`} />
              </div>
              <p className="mt-2 font-semibold">{v.brand} {v.model} {v.year ?? ''}</p>
              <p className="text-sm text-muted-foreground">
                {v.patente} · {GEARBOX[v.gearbox]}
                {v.color ? ` · ${v.color}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">{v.has_keys ? 'Con llaves' : 'Sin llaves'}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no cargaste ningún vehículo. Agregá el primero para tenerlo listo.
          </p>
        </div>
      )}

      <AddVehicleForm remaining={remaining} />
    </div>
  );
}
