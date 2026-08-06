'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteDriver } from './actions';

/** Baja de un conductor, con confirmación. El conductor dueño no se puede eliminar. */
export function DeleteDriverButton({ memberId, name }: { memberId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function eliminar() {
    setError(null);
    start(async () => {
      const res = await deleteDriver(memberId);
      if (res.ok) router.refresh();
      else {
        setError(res.error ?? 'No pudimos eliminarlo');
        setConfirmar(false);
      }
    });
  }

  if (!confirmar) {
    return (
      <div className="flex flex-col items-end">
        <button
          onClick={() => setConfirmar(true)}
          aria-label={`Eliminar a ${name}`}
          className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        {error && <p className="mt-1 max-w-[220px] text-right text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <p className="text-xs text-muted-foreground">¿Eliminar a {name}?</p>
      <div className="flex gap-1">
        <Button variant="destructive" size="sm" onClick={eliminar} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirmar(false)} disabled={pending}>
          No
        </Button>
      </div>
      {error && <p className="max-w-[220px] text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
