'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, Clock, XCircle, Trash2, Loader2, IdCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';
import { recordDocument, deleteDocument } from './document-actions';
import { sanitizeFilename } from '@/lib/validation/filename';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 8 * 1024 * 1024;

const REVIEW_UI = {
  pending: { icon: Clock, tone: 'text-warning', label: 'Cargada · en revisión' },
  approved: { icon: CheckCircle2, tone: 'text-success', label: 'Validada' },
  rejected: { icon: XCircle, tone: 'text-destructive', label: 'Con observaciones' },
};

interface ExistingLicense {
  id: string;
  review_status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
}

/**
 * Carga de la licencia de conducir de un conductor puntual. No hace falta que un
 * admin la apruebe para que quede registrada: se guarda como historial del equipo
 * (queda "cargada · en revisión"). Sirve para trazabilidad y para el legajo.
 */
export function DriverLicenseUpload({
  providerId,
  memberId,
  existing,
}: {
  providerId: string;
  memberId: string;
  existing: ExistingLicense | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(file: File) {
    setError(null);
    if (!ALLOWED.includes(file.type)) return setError('Subí una imagen o PDF de la licencia.');
    if (file.size > MAX_BYTES) return setError('El archivo supera los 8 MB.');
    if (!hasSupabaseConfig) return setError('Almacenamiento no configurado.');

    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${providerId}/licencia-${memberId}-${Date.now()}-${sanitizeFilename(file.name)}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);
      const res = await recordDocument({
        providerId,
        ownerKind: 'driver',
        docType: 'licencia',
        storagePath: path,
        memberId,
      });
      if (!res.ok) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir la licencia');
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
          <ui.icon className="h-3.5 w-3.5" /> Licencia {ui.label}
        </span>
        <button
          onClick={remove}
          disabled={pending}
          aria-label="Quitar licencia"
          className="focus-ring rounded-md p-1 text-muted-foreground hover:text-destructive"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="focus-ring inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input px-2.5 text-xs hover:bg-accent">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IdCard className="h-3.5 w-3.5" />}
        Cargar licencia
        <input
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f);
          }}
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
