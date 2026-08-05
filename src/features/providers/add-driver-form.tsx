'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addDriver } from './actions';
import { isValidDni } from '@/lib/validation/argentina';

export function AddDriverForm({ remaining }: { remaining: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    const dni = String(f.get('dni') ?? '');
    if (dni && !isValidDni(dni)) return setError('Revisá el DNI.');
    const phone = String(f.get('phone') ?? '').trim();
    if (phone.length < 6) return setError('El teléfono del conductor es obligatorio (puede ser el de la empresa).');
    start(async () => {
      const res = await addDriver({
        full_name: String(f.get('full_name')),
        dni: dni || undefined,
        phone,
      });
      if (res.ok) {
        form.reset();
        setOk(true);
        setOpen(false);
        router.refresh();
      } else setError(res.error ?? 'No pudimos agregar el conductor');
    });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {ok && (
          <p className="flex items-center gap-1 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Conductor agregado.
          </p>
        )}
        <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
          <UserPlus className="h-4 w-4" /> Agregar conductor ({remaining} disponible{remaining > 1 ? 's' : ''})
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Nuevo conductor</h2>
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nombre y apellido</Label>
        <Input id="full_name" name="full_name" required placeholder="Ej: Ana Gómez" autoComplete="name" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dni">DNI</Label>
          <Input id="dni" name="dni" inputMode="numeric" placeholder="Ej: 30111222" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" type="tel" required placeholder="11 5555 5555" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Agregar
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
