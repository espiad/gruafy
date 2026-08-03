'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { refundPayment } from './actions';
import { formatARS } from '@/lib/format';

/** Reembolso con doble confirmación (dos clics distintos). */
export function RefundButton({ paymentId, amount }: { paymentId: string; amount: number }) {
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'confirm'>('idle');
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doRefund() {
    setError(null);
    if (!reason.trim()) return setError('Motivo obligatorio.');
    start(async () => {
      const res = await refundPayment(paymentId, reason, true);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Quedó pendiente.');
      if (!res.ok) router.refresh();
    });
  }

  if (step === 'idle') {
    return (
      <Button size="sm" variant="outline" onClick={() => setStep('confirm')} className="border-destructive/40 text-destructive">
        <Undo2 className="h-4 w-4" /> Reembolsar
      </Button>
    );
  }

  return (
    <div className="w-64 space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
      <p className="text-xs font-medium">Reembolsar {formatARS(amount)}. Esta acción es irreversible.</p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo"
        className="focus-ring h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" onClick={doRefund} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStep('idle')}>Cancelar</Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
