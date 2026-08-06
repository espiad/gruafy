'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSignedDocUrl, reviewDocument } from './actions';
import { ImageViewer } from '@/components/ui/image-viewer';

const DOC_LABELS: Record<string, string> = {
  seguro_empresa: 'Seguro de la empresa',
  habilitacion: 'Habilitación / RUTA',
  vtv: 'VTV de la grúa',
  seguro_grua: 'Seguro de la grúa',
  licencia: 'Licencia del conductor',
  linti: 'LiNTI',
};

const REVIEW_UI = {
  pending: { icon: Clock, tone: 'text-warning', label: 'En revisión' },
  approved: { icon: CheckCircle2, tone: 'text-success', label: 'Aprobado' },
  rejected: { icon: XCircle, tone: 'text-destructive', label: 'Rechazado' },
};

export function DocReviewItem({
  docId,
  docType,
  storagePath,
  reviewStatus,
  adminNote,
  expiresAt,
}: {
  docId: string;
  docType: string;
  storagePath: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  adminNote: string | null;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verUrl, setVerUrl] = useState<string | null>(null);
  const [cargandoUrl, setCargandoUrl] = useState(false);
  const review = REVIEW_UI[reviewStatus];

  async function view() {
    setError(null);
    setCargandoUrl(true);
    const url = await getSignedDocUrl(storagePath);
    setCargandoUrl(false);
    // Se ve dentro de la app: abrir una pestaña nueva dejaba al admin sin vuelta atrás.
    if (url) setVerUrl(url);
    else setError('No pudimos generar el enlace.');
  }

  function decide(decision: 'approved' | 'rejected') {
    setError(null);
    if (decision === 'rejected' && !note.trim()) {
      setError('El motivo es obligatorio para rechazar.');
      return;
    }
    start(async () => {
      const res = await reviewDocument({ docId, decision, note: decision === 'rejected' ? note : undefined });
      if (res.ok) {
        setRejecting(false);
        setNote('');
        router.refresh();
      } else setError(res.error ?? 'Error');
    });
  }

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{DOC_LABELS[docType] ?? docType}</p>
          <span className={`inline-flex items-center gap-1 text-xs ${review.tone}`}>
            <review.icon className="h-3.5 w-3.5" /> {review.label}
            {expiresAt && ` · vence ${expiresAt}`}
          </span>
          {adminNote && <p className="text-xs text-muted-foreground">Nota: {adminNote}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={view} disabled={cargandoUrl}>
          {cargandoUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Ver
        </Button>
      </div>

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo del rechazo (obligatorio)"
            className="focus-ring h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => decide('rejected')} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar rechazo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => decide('approved')} disabled={pending} variant={reviewStatus === 'approved' ? 'outline' : 'primary'}>
            <CheckCircle2 className="h-4 w-4" /> Aprobar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={pending}>
            <XCircle className="h-4 w-4" /> Rechazar
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {verUrl && (
        <ImageViewer
          url={verUrl}
          alt={DOC_LABELS[docType] ?? docType}
          onClose={() => setVerUrl(null)}
        />
      )}
    </li>
  );
}
