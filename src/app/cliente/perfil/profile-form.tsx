'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from '@/features/auth/profile-actions';

export function ProfileForm({ initial }: { initial: { first_name: string; last_name: string; phone: string } }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const form = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateProfile({
        first_name: String(form.get('first_name')),
        last_name: String(form.get('last_name')),
        phone: String(form.get('phone')),
      });
      if (res.ok) setSaved(true);
      else setError(res.error ?? 'No pudimos guardar');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">Nombre</Label>
          <Input id="first_name" name="first_name" defaultValue={initial.first_name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Apellido</Label>
          <Input id="last_name" name="last_name" defaultValue={initial.last_name} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} placeholder="11 5555 5555" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Guardado
          </span>
        )}
      </div>
    </form>
  );
}
