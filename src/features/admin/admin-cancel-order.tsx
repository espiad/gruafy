'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminCancelOrder } from './actions';

export function AdminCancelOrder({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setError(null);
    if (!reason.trim()) return setError('El motivo es obligatorio.');
    start(async () => {
      const res = await adminCancelOrder(orderId, reason);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else setError(res.error ?? 'Error');
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="border-destructive/40 text-destructive">
        Cancelar servicio (admin)
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm font-medium">Cancelación administrativa</p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (obligatorio)"
        className="focus-ring h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={cancel} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar cancelación
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Volver</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
