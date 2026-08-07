'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, Clock, XCircle, Trash2, Loader2, Eye, Sun, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';
import { recordDocument, deleteDocument } from './document-actions';
import { compressImage } from '@/lib/image/compress';

const REVIEW_UI = {
  pending: { icon: Clock, tone: 'text-warning', label: 'Cargada · en revisión' },
  approved: { icon: CheckCircle2, tone: 'text-success', label: 'Validada' },
  rejected: { icon: XCircle, tone: 'text-destructive', label: 'Con observaciones' },
};

interface ExistingPhoto {
  id: string;
  review_status: 'pending' | 'approved' | 'rejected';
}

/**
 * Foto del conductor con un mini-instructivo amigable (3 pasos) antes de abrir la
 * cámara. Se comprime antes de subir. El cliente la ve para reconocer al conductor.
 */
export function DriverPhotoUpload({
  providerId,
  memberId,
  existing,
}: {
  providerId: string;
  memberId: string;
  existing: ExistingPhoto | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onUpload(file: File) {
    setError(null);
    setGuide(false);
    if (!hasSupabaseConfig) return setError('Almacenamiento no configurado.');
    setBusy(true);
    try {
      const blob = await compressImage(file, 800, 0.7);
      const supabase = createClient();
      const path = `${providerId}/foto-${memberId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);
      const res = await recordDocument({ providerId, ownerKind: 'driver', docType: 'foto', storagePath: path, memberId });
      if (!res.ok) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir la foto');
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!existing) return;
    start(async () => {
      await deleteDocument(existing.id);
      router.refresh();
    });
  }

  if (existing) {
    const ui = REVIEW_UI[existing.review_status];
    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-xs ${ui.tone}`}>
          <ui.icon className="h-3.5 w-3.5" /> Foto {ui.label}
        </span>
        <button onClick={remove} disabled={pending} aria-label="Quitar foto" className="focus-ring rounded-md p-1 text-muted-foreground hover:text-destructive">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* input oculto: se dispara desde el instructivo */}
      {/* `capture="user"`: cámara en vivo, frontal por defecto (el cliente tiene que
          reconocer a quién lo asiste, así que NO vale una foto de la galería). En la
          mayoría de los celulares se puede dar vuelta la cámara desde el visor. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onUpload(f);
        }}
      />
      <button
        onClick={() => setGuide(true)}
        disabled={busy}
        className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        Foto del conductor
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      {guide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setGuide(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Foto del conductor</h3>
              <button onClick={() => setGuide(false)} aria-label="Cerrar" className="focus-ring rounded-md p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <Eye className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                <span>Tus <strong>clientes van a ver esta foto</strong> para reconocer al conductor cuando la grúa llegue.</span>
              </li>
              <li className="flex gap-3">
                <Sun className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                <span>Que se vea la <strong>cara, de frente y bien iluminada</strong> (sin lentes de sol ni gorra).</span>
              </li>
              <li className="flex gap-3">
                <Camera className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                <span>Tocá el botón y <strong>sacate la foto</strong>. Se guarda liviana, no te preocupes por el peso.</span>
              </li>
            </ol>
            <button
              onClick={() => inputRef.current?.click()}
              className="focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-green py-3 text-sm font-semibold text-brand-cream"
            >
              <Camera className="h-4 w-4" /> Abrir la cámara
            </button>
          </div>
        </div>
      )}
    </>
  );
}
