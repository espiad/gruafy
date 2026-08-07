'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateDriverData } from './actions';

/**
 * Edición del DNI y el teléfono de un conductor ya cargado. Es el camino para
 * completar el DNI cuando falta (el aviso de documentación pedía el número y no
 * había dónde cargarlo). Arranca abierto si falta el DNI, para que salte a la vista.
 */
export function DriverDataEditor({
  memberId,
  dni,
  phone,
}: {
  memberId: string;
  dni: string | null;
  phone: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(!dni); // sin DNI → abierto de una
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateDriverData({
        memberId,
        dni: String(f.get('dni') ?? '').trim() || undefined,
        phone: String(f.get('phone') ?? '').trim(),
      });
      if (res.ok) {
        setAbierto(false);
        router.refresh();
      } else setError(res.error ?? 'No pudimos guardar');
    });
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar datos
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-2 rounded-lg border border-brand-orange/40 bg-brand-orange/5 p-3">
      {!dni && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-brand-green">
          <IdCard className="h-3.5 w-3.5" /> Cargá el DNI para completar la documentación
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input name="dni" defaultValue={dni ?? ''} inputMode="numeric" placeholder="DNI (ej: 30111222)" className="h-9" />
        <Input name="phone" defaultValue={phone ?? ''} type="tel" placeholder="Teléfono" className="h-9" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
        </Button>
        {dni && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
