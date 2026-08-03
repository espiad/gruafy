'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, Clock, XCircle, Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';
import { recordDocument, deleteDocument } from './document-actions';
import { sanitizeFilename } from '@/lib/validation/filename';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 8 * 1024 * 1024;

interface DocType {
  key: string;
  label: string;
  kind: 'provider' | 'truck' | 'driver';
}
interface ExistingDoc {
  id: string;
  doc_type: string;
  review_status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  storage_path: string;
  expires_at: string | null;
}

const REVIEW_UI = {
  pending: { icon: Clock, tone: 'text-warning', label: 'En revisión' },
  approved: { icon: CheckCircle2, tone: 'text-success', label: 'Aprobado' },
  rejected: { icon: XCircle, tone: 'text-destructive', label: 'Rechazado' },
};

export function DocumentsManager({
  providerId,
  docTypes,
  existing,
  editable,
}: {
  providerId: string;
  docTypes: DocType[];
  existing: ExistingDoc[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(dt: DocType, file: File) {
    setError(null);
    if (!ALLOWED.includes(file.type)) return setError('Formato no permitido. Subí imagen o PDF.');
    if (file.size > MAX_BYTES) return setError('El archivo supera los 8 MB.');
    if (!hasSupabaseConfig) return setError('Supabase no está configurado todavía.');

    setBusy(dt.key);
    try {
      const supabase = createClient();
      const path = `${providerId}/${dt.key}-${Date.now()}-${sanitizeFilename(file.name)}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);
      const res = await recordDocument({
        providerId,
        ownerKind: dt.kind,
        docType: dt.key,
        storagePath: path,
      });
      if (!res.ok) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir el documento');
    } finally {
      setBusy(null);
    }
  }

  function remove(id: string) {
    start(async () => {
      await deleteDocument(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-semibold">Documentación</h2>
      <p className="text-sm text-muted-foreground">
        Imágenes o PDF, hasta 8 MB. Un administrador revisa cada documento.
      </p>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <ul className="divide-y divide-border">
        {docTypes.map((dt) => {
          const doc = existing.find((d) => d.doc_type === dt.key);
          const review = doc ? REVIEW_UI[doc.review_status] : null;
          return (
            <li key={dt.key} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{dt.label}</p>
                {doc && review && (
                  <span className={`inline-flex items-center gap-1 text-xs ${review.tone}`}>
                    <review.icon className="h-3.5 w-3.5" /> {review.label}
                    {doc.admin_note && ` · ${doc.admin_note}`}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {doc ? (
                  editable && (
                    <button onClick={() => remove(doc.id)} disabled={pending} className="focus-ring rounded-md p-2 text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )
                ) : (
                  editable && (
                    <label className="focus-ring inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-accent">
                      {busy === dt.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Subir
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        disabled={busy !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onUpload(dt, f);
                        }}
                      />
                    </label>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
