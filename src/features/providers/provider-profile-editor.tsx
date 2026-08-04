'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Building2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { editProviderCompany, editTruck } from './actions';
import { formatCuit, isValidCuit, isValidPatente } from '@/lib/validation/argentina';

interface Company {
  legal_name: string;
  cuit: string;
  contact_email: string | null;
  contact_phone: string | null;
}
interface TruckData {
  id: string;
  patente: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  capacity: string | null;
}

/** Datos de la empresa, con edición inline. */
export function CompanyEditor({ company, statusLabel }: { company: Company; statusLabel: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const cuit = String(f.get('cuit') ?? '');
    if (!isValidCuit(cuit)) return setError('CUIT inválido.');
    start(async () => {
      const res = await editProviderCompany({
        legal_name: String(f.get('legal_name') ?? ''),
        cuit,
        contact_email: String(f.get('contact_email') ?? ''),
        contact_phone: String(f.get('contact_phone') ?? ''),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else setError(res.error ?? 'No pudimos guardar');
    });
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Editar empresa</h2>
        <div className="space-y-1.5">
          <Label htmlFor="legal_name">Razón social</Label>
          <Input id="legal_name" name="legal_name" required defaultValue={company.legal_name} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cuit">CUIT</Label>
            <Input id="cuit" name="cuit" required defaultValue={company.cuit} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_phone">Teléfono</Label>
            <Input id="contact_phone" name="contact_phone" type="tel" required defaultValue={company.contact_phone ?? ''} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_email">Email (opcional)</Label>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={company.contact_email ?? ''} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>Cancelar</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <h2 className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" /> {company.legal_name}</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{statusLabel}</span>
          <button onClick={() => setEditing(true)} aria-label="Editar empresa" className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">CUIT {formatCuit(company.cuit)}</p>
      <p className="text-sm text-muted-foreground">{company.contact_email ?? ''} {company.contact_phone ?? ''}</p>
    </div>
  );
}

/** Una grúa con edición inline. */
export function TruckEditor({ truck }: { truck: TruckData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const patente = String(f.get('patente') ?? '');
    if (!isValidPatente(patente)) return setError('Patente inválida.');
    const yearRaw = String(f.get('year') ?? '').trim();
    start(async () => {
      const res = await editTruck({
        truckId: truck.id,
        patente,
        brand: String(f.get('brand') ?? '') || undefined,
        model: String(f.get('model') ?? '') || undefined,
        year: yearRaw ? Number(yearRaw) : undefined,
        capacity: String(f.get('capacity') ?? '') || undefined,
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else setError(res.error ?? 'No pudimos guardar');
    });
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} className="space-y-3 rounded-lg border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`patente-${truck.id}`}>Patente</Label>
              <Input id={`patente-${truck.id}`} name="patente" required defaultValue={truck.patente} autoCapitalize="characters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`brand-${truck.id}`}>Marca</Label>
              <Input id={`brand-${truck.id}`} name="brand" defaultValue={truck.brand ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`model-${truck.id}`}>Modelo</Label>
              <Input id={`model-${truck.id}`} name="model" defaultValue={truck.model ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`year-${truck.id}`}>Año</Label>
              <Input id={`year-${truck.id}`} name="year" inputMode="numeric" defaultValue={truck.year ?? ''} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`capacity-${truck.id}`}>Capacidad (opcional)</Label>
              <Input id={`capacity-${truck.id}`} name="capacity" defaultValue={truck.capacity ?? ''} placeholder="Ej: hasta 3.5 t" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>Cancelar</Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
      <span>
        <strong>{truck.patente}</strong> · {[truck.brand, truck.model, truck.year].filter(Boolean).join(' ')}
        {truck.capacity && <span className="text-muted-foreground"> · {truck.capacity}</span>}
      </span>
      <button onClick={() => setEditing(true)} aria-label="Editar grúa" className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
        <Pencil className="h-4 w-4" />
      </button>
    </li>
  );
}

/** Encabezado de la sección de grúas (para reusar el ícono). */
export function TrucksHeading() {
  return <h2 className="mb-3 flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> Grúa(s)</h2>;
}
