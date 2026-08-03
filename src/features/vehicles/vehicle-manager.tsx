'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addVehicle, deleteVehicle } from './actions';
import { isValidPatente } from '@/lib/validation/argentina';

/** Formulario para agregar un vehículo (se muestra si quedan cupos libres). */
export function AddVehicleForm({ remaining }: { remaining: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const form = e.currentTarget;
    const f = new FormData(form);
    const patente = String(f.get('patente') ?? '');
    if (!isValidPatente(patente)) return setError('Revisá la patente (formato AAA123 o AB123CD).');
    const yearRaw = String(f.get('year') ?? '').trim();
    start(async () => {
      const res = await addVehicle({
        brand: String(f.get('brand') ?? ''),
        model: String(f.get('model') ?? ''),
        year: yearRaw ? Number(yearRaw) : undefined,
        patente,
        gearbox: (String(f.get('gearbox') ?? 'unknown') as 'manual' | 'automatic' | 'unknown'),
        color: String(f.get('color') ?? '') || undefined,
        has_keys: f.get('has_keys') === 'on',
      });
      if (res.ok) {
        form.reset();
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
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Nuevo vehículo</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" name="brand" required placeholder="Ej: Volkswagen" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" name="model" required placeholder="Ej: Gol" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="patente">Patente</Label>
          <Input id="patente" name="patente" required placeholder="AAA123 o AB123CD" autoCapitalize="characters" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">Año (opcional)</Label>
          <Input id="year" name="year" inputMode="numeric" placeholder="Ej: 2015" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Color (opcional)</Label>
          <Input id="color" name="color" placeholder="Ej: Gris" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gearbox">Caja</Label>
          <select
            id="gearbox"
            name="gearbox"
            defaultValue="unknown"
            className="focus-ring h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="unknown">No sé</option>
            <option value="manual">Manual</option>
            <option value="automatic">Automática</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="has_keys" defaultChecked className="h-4 w-4 rounded border-input" />
        Tengo las llaves del vehículo
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Botón para borrar un vehículo, con confirmación. */
export function DeleteVehicleButton({ vehicleId, label }: { vehicleId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    start(async () => {
      const res = await deleteVehicle(vehicleId);
      if (res.ok) router.refresh();
      else {
        setError(res.error ?? 'No se pudo borrar');
        setConfirm(false);
      }
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        aria-label={`Borrar ${label}`}
        className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Borrar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={pending}>
          No
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
