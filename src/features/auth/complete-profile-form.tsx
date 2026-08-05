'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeProfile } from './profile-actions';
import { isValidDni } from '@/lib/validation/argentina';

export function CompleteProfileForm({
  next,
  defaults,
}: {
  next: string;
  defaults: { first_name: string; last_name: string; phone: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const dni = String(f.get('dni') ?? '');
    if (!isValidDni(dni)) return setError('Revisá el DNI.');
    start(async () => {
      const res = await completeProfile({
        first_name: String(f.get('first_name') ?? ''),
        last_name: String(f.get('last_name') ?? ''),
        phone: String(f.get('phone') ?? ''),
        dni,
      });
      if (res.ok) {
        router.push(next || '/cliente');
        router.refresh();
      } else setError(res.error ?? 'No pudimos guardar');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">Nombre</Label>
          <Input id="first_name" name="first_name" required defaultValue={defaults.first_name} autoComplete="given-name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Apellido</Label>
          <Input id="last_name" name="last_name" required defaultValue={defaults.last_name} autoComplete="family-name" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" type="tel" required defaultValue={defaults.phone} placeholder="11 5555 5555" autoComplete="tel" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dni">DNI</Label>
        <Input id="dni" name="dni" inputMode="numeric" required placeholder="Ej: 30111222" />
        <p className="text-xs text-muted-foreground">Lo necesitamos para identificarte ante el gruero y por seguridad.</p>
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar y continuar
      </Button>
    </form>
  );
}
