'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { decideProvider } from './actions';
import type { ProviderStatus } from '@/types/database';

const LABEL: Record<ProviderStatus, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  under_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  suspended: 'Suspendida',
};

export function ProviderDecision({ providerId, status }: { providerId: string; status: ProviderStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState<ProviderStatus>(status);
  const [loading, setLoading] = useState<null | 'approved' | 'rejected' | 'suspended'>(null);
  const [mode, setMode] = useState<'idle' | 'rejecting' | 'suspending'>('idle');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function decide(decision: 'approved' | 'rejected' | 'suspended') {
    setError(null);
    setOkMsg(null);
    if (decision === 'rejected' && !reason.trim()) {
      setError('El motivo es obligatorio para rechazar.');
      return;
    }
    setLoading(decision);
    const res = await decideProvider({ providerId, decision, reason: reason || undefined });
    setLoading(null);
    if (!res.ok) {
      setError(res.error ?? 'No pudimos aplicar la decisión.');
      return;
    }
    // Feedback inmediato (no dejamos el botón "congelado" esperando el refresh).
    setCurrent(decision);
    setMode('idle');
    setReason('');
    setOkMsg(
      decision === 'approved' ? 'Cuenta aprobada.' : decision === 'rejected' ? 'Cuenta rechazada.' : 'Cuenta suspendida.',
    );
    router.refresh();
  }

  return (
    <div className="rounded-2xl border-2 border-brand-orange/40 bg-brand-orange/5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Decisión de la cuenta</h2>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{LABEL[current]}</span>
      </div>

      {mode !== 'idle' ? (
        <div className="mt-3 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === 'rejecting' ? 'Motivo del rechazo (obligatorio)' : 'Motivo de la suspensión'}
            className="focus-ring h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => decide(mode === 'rejecting' ? 'rejected' : 'suspended')} disabled={loading !== null}>
              {loading !== null && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Aprobar/Reactivar: disponible en pendiente, rechazado o suspendido. */}
          {current !== 'approved' && (
            <Button size="sm" onClick={() => decide('approved')} disabled={loading !== null}>
              {loading === 'approved' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {current === 'suspended' || current === 'rejected' ? 'Reactivar (aprobar)' : 'Aprobar'}
            </Button>
          )}
          {/* Rechazar: SOLO mientras está pendiente de decisión inicial. */}
          {(current === 'draft' || current === 'submitted' || current === 'under_review') && (
            <Button size="sm" variant="outline" onClick={() => setMode('rejecting')} disabled={loading !== null}>
              <XCircle className="h-4 w-4" /> Rechazar
            </Button>
          )}
          {/* Suspender: SOLO si ya está aprobado. */}
          {current === 'approved' && (
            <Button size="sm" variant="outline" onClick={() => setMode('suspending')} disabled={loading !== null}>
              <Ban className="h-4 w-4" /> Suspender
            </Button>
          )}
        </div>
      )}
      {okMsg && <p className="mt-2 text-sm text-success">{okMsg}</p>}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
