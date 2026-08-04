'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, Clock, XCircle, Trash2, Loader2 } from 'lucide-react';
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
 * Foto del conductor (cámara o galería). Se comprime antes de subir. Es obligatoria
 * para que el cliente vea la cara de quien lo rescata, y el admin la aprueba
 * comparándola con la licencia (misma persona). Debe ser la cara, bien iluminada.
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

  async function onUpload(file: File) {
    setError(null);
    if (!hasSupabaseConfig) return setError('Almacenamiento no configurado.');
    setBusy(true);
    try {
      const blob = await compressImage(file, 900, 0.7);
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
    <div className="flex flex-col items-end gap-1">
      <label className="focus-ring inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        Falta foto — cargar
        <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); }} />
      </label>
      <span className="text-[10px] text-muted-foreground">Cara, bien iluminada</span>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
