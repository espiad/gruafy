'use client';

import { useState, useTransition } from 'react';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminSetPassword } from './actions';

/** Cambio de contraseña de un usuario por parte del admin (soporte). */
export function AdminPasswordReset({ userId, label }: { userId: string; label?: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    if (value.length < 8) return setError('Mínimo 8 caracteres.');
    start(async () => {
      const res = await adminSetPassword({ userId, password: value });
      if (res.ok) {
        setDone(true);
        setValue('');
        setOpen(false);
      } else setError(res.error ?? 'No pudimos cambiar la contraseña');
    });
  }

  if (!open) {
    return (
      <div className="space-y-1">
        {done && (
          <p className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Contraseña actualizada.
          </p>
        )}
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <KeyRound className="h-4 w-4" /> Cambiar contraseña{label ? ` de ${label}` : ''}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nueva contraseña (mín. 8)"
        className="h-9 w-56"
        autoComplete="new-password"
      />
      <Button size="sm" onClick={save} disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}
