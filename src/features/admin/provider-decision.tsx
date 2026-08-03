'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { decideProvider } from './actions';
import type { ProviderStatus } from '@/types/database';

export function ProviderDecision({ providerId, status }: { providerId: string; status: ProviderStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<'idle' | 'rejecting' | 'suspending'>('idle');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function decide(decision: 'approved' | 'rejected' | 'suspended') {
    setError(null);
    if (decision === 'rejected' && !reason.trim()) {
      setError('El motivo es obligatorio para rechazar.');
      return;
    }
    start(async () => {
      const res = await decideProvider({ providerId, decision, reason: reason || undefined });
      if (res.ok) {
        setMode('idle');
        setReason('');
        router.refresh();
      } else setError(res.error ?? 'Error');
    });
  }

  return (
    <div className="rounded-2xl border-2 border-brand-orange/40 bg-brand-orange/5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Decisión de la cuenta</h2>
        <span className="text-xs text-muted-foreground">Estado actual: {status}</span>
      </div>

      {mode === 'rejecting' || mode === 'suspending' ? (
        <div className="mt-3 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === 'rejecting' ? 'Motivo del rechazo (obligatorio)' : 'Motivo de la suspensión'}
            className="focus-ring h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => decide(mode === 'rejecting' ? 'rejected' : 'suspended')} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => decide('approved')} disabled={pending || status === 'approved'}>
            <CheckCircle2 className="h-4 w-4" /> Aprobar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode('rejecting')} disabled={pending}>
            <XCircle className="h-4 w-4" /> Rechazar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode('suspending')} disabled={pending || status !== 'approved'}>
            <Ban className="h-4 w-4" /> Suspender
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
