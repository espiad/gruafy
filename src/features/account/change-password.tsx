'use client';

import { useState, useTransition } from 'react';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword } from './password-actions';

/**
 * Cambio de contraseña desde el propio perfil. Es el camino principal para
 * recuperar el control de la cuenta mientras el envío de mails no esté configurado:
 * soporte entrega una contraseña temporal y la persona la cambia acá.
 */
export function ChangePassword() {
  const [abierto, setAbierto] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setListo(false);
    const form = e.currentTarget;
    const f = new FormData(form);
    start(async () => {
      const res = await changePassword({
        actual: String(f.get('actual') ?? ''),
        nueva: String(f.get('nueva') ?? ''),
        repetir: String(f.get('repetir') ?? ''),
      });
      if (res.ok) {
        form.reset();
        setListo(true);
        setAbierto(false);
      } else setError(res.error ?? 'No pudimos cambiarla');
    });
  }

  if (!abierto) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4 text-muted-foreground" /> Contraseña
        </h2>
        {listo ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Listo, ya tenés tu contraseña nueva.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Cambiala cuando quieras. Si soporte te dio una temporal, este es el lugar para poner la
            tuya.
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setAbierto(true)}>
          Cambiar contraseña
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4 text-muted-foreground" /> Cambiar contraseña
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="actual">Contraseña actual</Label>
        <Input id="actual" name="actual" type="password" required autoComplete="current-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nueva">Contraseña nueva</Label>
        <Input id="nueva" name="nueva" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="repetir">Repetí la contraseña nueva</Label>
        <Input id="repetir" name="repetir" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setAbierto(false);
            setError(null);
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
