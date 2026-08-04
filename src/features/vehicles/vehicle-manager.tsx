'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2, CheckCircle2, Pencil, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addVehicle, editVehicle, deleteVehicle } from './actions';
import { isValidPatente } from '@/lib/validation/argentina';
import type { VehicleInput } from '@/features/orders/schema';

export interface VehicleData {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  patente: string;
  gearbox: 'manual' | 'automatic' | 'unknown';
  has_keys: boolean | null;
  color: string | null;
}

const GEARBOX_LABEL = { manual: 'Caja manual', automatic: 'Caja automática', unknown: 'Caja sin especificar' };

/** Campos compartidos entre alta y edición. Devuelve el input parseado en submit. */
function VehicleFields({
  defaults,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
  error,
}: {
  defaults?: Partial<VehicleData>;
  pending: boolean;
  submitLabel: string;
  onSubmit: (v: VehicleInput) => void;
  onCancel: () => void;
  error: string | null;
}) {
  const [localError, setLocalError] = useState<string | null>(null);

  function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const f = new FormData(e.currentTarget);
    const patente = String(f.get('patente') ?? '');
    if (!isValidPatente(patente)) return setLocalError('Revisá la patente (formato AAA123 o AB123CD).');
    const yearRaw = String(f.get('year') ?? '').trim();
    onSubmit({
      brand: String(f.get('brand') ?? ''),
      model: String(f.get('model') ?? ''),
      year: yearRaw ? Number(yearRaw) : undefined,
      patente,
      gearbox: String(f.get('gearbox') ?? 'unknown') as 'manual' | 'automatic' | 'unknown',
      color: String(f.get('color') ?? '') || undefined,
      has_keys: f.get('has_keys') === 'on',
    });
  }

  return (
    <form onSubmit={handle} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" name="brand" required defaultValue={defaults?.brand ?? ''} placeholder="Ej: Volkswagen" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" name="model" required defaultValue={defaults?.model ?? ''} placeholder="Ej: Gol" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="patente">Patente</Label>
          <Input id="patente" name="patente" required defaultValue={defaults?.patente ?? ''} placeholder="AAA123 o AB123CD" autoCapitalize="characters" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">Año (opcional)</Label>
          <Input id="year" name="year" inputMode="numeric" defaultValue={defaults?.year ?? ''} placeholder="Ej: 2015" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Color (opcional)</Label>
          <Input id="color" name="color" defaultValue={defaults?.color ?? ''} placeholder="Ej: Gris" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gearbox">Caja</Label>
          <select
            id="gearbox"
            name="gearbox"
            defaultValue={defaults?.gearbox ?? 'unknown'}
            className="focus-ring h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="unknown">No sé</option>
            <option value="manual">Manual</option>
            <option value="automatic">Automática</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="has_keys" defaultChecked={defaults?.has_keys ?? true} className="h-4 w-4 rounded border-input" />
        Tengo las llaves del vehículo
      </label>
      {(error || localError) && <p className="text-sm text-destructive">{error ?? localError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Formulario para agregar un vehículo (se muestra si quedan cupos libres). */
export function AddVehicleForm({ remaining }: { remaining: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function submit(v: VehicleInput) {
    setError(null);
    setOk(false);
    start(async () => {
      const res = await addVehicle(v);
      if (res.ok) {
        setOk(true);
        setOpen(false);
        router.refresh();
      } else setError(res.error ?? 'No pudimos guardar el vehículo');
    });
  }

  if (remaining <= 0) {
    return (
      <p className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">
        Llegaste al máximo de 3 vehículos. Borrá uno para agregar otro.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {ok && (
          <p className="flex items-center gap-1 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Vehículo guardado.
          </p>
        )}
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <PlusCircle className="h-4 w-4" /> Agregar vehículo
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 font-semibold">Nuevo vehículo</h2>
      <VehicleFields pending={pending} submitLabel="Guardar" onSubmit={submit} onCancel={() => setOpen(false)} error={error} />
    </div>
  );
}

/** Tarjeta de un vehículo con acciones de editar y borrar (edición inline). */
export function VehicleCard({ vehicle }: { vehicle: VehicleData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function saveEdit(v: VehicleInput) {
    setError(null);
    start(async () => {
      const res = await editVehicle(vehicle.id, v);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else setError(res.error ?? 'No pudimos guardar');
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await deleteVehicle(vehicle.id);
      if (res.ok) router.refresh();
      else {
        setError(res.error ?? 'No se pudo borrar');
        setConfirmDelete(false);
      }
    });
  }

  if (editing) {
    return (
      <li className="sm:col-span-2">
        <h3 className="mb-2 text-sm font-semibold">Editar {vehicle.brand} {vehicle.model}</h3>
        <VehicleFields defaults={vehicle} pending={pending} submitLabel="Guardar cambios" onSubmit={saveEdit} onCancel={() => setEditing(false)} error={error} />
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <Car className="h-5 w-5 text-brand-orange" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            aria-label="Editar"
            className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Borrar"
              className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Borrar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={pending}>No</Button>
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 font-semibold">{vehicle.brand} {vehicle.model} {vehicle.year ?? ''}</p>
      <p className="text-sm text-muted-foreground">
        {vehicle.patente} · {GEARBOX_LABEL[vehicle.gearbox]}
        {vehicle.color ? ` · ${vehicle.color}` : ''}
      </p>
      <p className="text-xs text-muted-foreground">{vehicle.has_keys ? 'Con llaves' : 'Sin llaves'}</p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </li>
  );
}
