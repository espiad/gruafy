'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteMyAccount } from './actions';

/**
 * Baja de cuenta a pedido del titular. Pide escribir ELIMINAR porque es
 * irreversible y no hay forma de deshacerla desde la app.
 */
export function DeleteAccount() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function eliminar() {
    setError(null);
    start(async () => {
      const res = await deleteMyAccount(texto);
      if (res.ok) router.push('/?cuenta=eliminada');
      else setError(res.error ?? 'No pudimos eliminar la cuenta');
    });
  }

  if (!abierto) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-card p-5">
        <h2 className="font-semibold">Eliminar mi cuenta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Borramos tus datos personales: nombre, teléfono, DNI, vehículos y documentación. Los
          comprobantes de servicios ya prestados se conservan por obligaciones contables, pero
          quedan anonimizados: no van a estar asociados a vos.
        </p>
        <button
          onClick={() => setAbierto(true)}
          className="focus-ring mt-3 rounded-md px-2 py-1 text-sm font-medium text-destructive underline underline-offset-2"
        >
          Quiero eliminar mi cuenta
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-5">
      <p className="flex items-center gap-2 font-semibold text-destructive">
        <AlertTriangle className="h-5 w-5" /> Esto no se puede deshacer
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Vas a perder el acceso al instante. Después vas a poder registrarte de nuevo con el mismo
        mail, pero como una cuenta nueva y vacía.
      </p>
      <label className="mt-4 block text-sm font-medium" htmlFor="confirmar-baja">
        Escribí <strong>ELIMINAR</strong> para confirmar
      </label>
      <Input
        id="confirmar-baja"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="ELIMINAR"
        autoComplete="off"
        className="mt-1.5 h-11"
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="destructive"
          onClick={eliminar}
          disabled={pending || texto.trim().toUpperCase() !== 'ELIMINAR'}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Eliminar mi cuenta
        </Button>
        <Button variant="ghost" onClick={() => setAbierto(false)} disabled={pending}>
          Mejor no
        </Button>
      </div>
    </div>
  );
}
