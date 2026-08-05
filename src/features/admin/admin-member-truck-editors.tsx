'use client';

import { useState, useTransition } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminUpdateMember, adminUpdateTruck } from './actions';

const ROLE_LABEL = { owner: 'Conductor dueño', driver: 'Conductor' } as const;

/** Edición inline de un conductor por parte del admin. */
export function AdminMemberEditor({
  member,
}: {
  member: { id: string; full_name: string; dni: string | null; phone: string | null; role: 'owner' | 'driver' };
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = await adminUpdateMember({
        memberId: member.id,
        full_name: String(f.get('full_name') ?? ''),
        dni: String(f.get('dni') ?? '') || undefined,
        phone: String(f.get('phone') ?? ''),
      });
      if (res.ok) setEditing(false);
      else setError(res.error ?? 'No pudimos guardar');
    });
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} className="space-y-2 rounded-lg border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input name="full_name" required defaultValue={member.full_name} placeholder="Nombre" />
            <Input name="dni" defaultValue={member.dni ?? ''} placeholder="DNI" inputMode="numeric" />
            <Input name="phone" required defaultValue={member.phone ?? ''} placeholder="Teléfono" type="tel" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
      <span>
        {member.full_name} {member.dni && `· DNI ${member.dni}`} {member.phone && `· ${member.phone}`}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{ROLE_LABEL[member.role]}</span>
        <button onClick={() => setEditing(true)} aria-label="Editar conductor" className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Pencil className="h-4 w-4" />
        </button>
      </span>
    </li>
  );
}

/** Edición inline de una grúa por parte del admin. */
export function AdminTruckEditor({
  truck,
}: {
  truck: { id: string; patente: string; brand: string | null; model: string | null; year: number | null; capacity: string | null };
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const yearRaw = String(f.get('year') ?? '').trim();
    start(async () => {
      const res = await adminUpdateTruck({
        truckId: truck.id,
        patente: String(f.get('patente') ?? ''),
        brand: String(f.get('brand') ?? '') || undefined,
        model: String(f.get('model') ?? '') || undefined,
        year: yearRaw ? Number(yearRaw) : undefined,
        capacity: String(f.get('capacity') ?? '') || undefined,
      });
      if (res.ok) setEditing(false);
      else setError(res.error ?? 'No pudimos guardar');
    });
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} className="space-y-2 rounded-lg border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input name="patente" required defaultValue={truck.patente} placeholder="Patente" autoCapitalize="characters" />
            <Input name="brand" defaultValue={truck.brand ?? ''} placeholder="Marca" />
            <Input name="model" defaultValue={truck.model ?? ''} placeholder="Modelo" />
            <Input name="year" defaultValue={truck.year ?? ''} placeholder="Año" inputMode="numeric" />
            <Input name="capacity" defaultValue={truck.capacity ?? ''} placeholder="Capacidad" className="sm:col-span-2" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
      <span>
        <strong>{truck.patente}</strong> · {[truck.brand, truck.model, truck.year].filter(Boolean).join(' ')} {truck.capacity && `· ${truck.capacity}`}
      </span>
      <button onClick={() => setEditing(true)} aria-label="Editar grúa" className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
        <Pencil className="h-4 w-4" />
      </button>
    </li>
  );
}
