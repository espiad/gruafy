'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isNotExpired } from '@/lib/validation/argentina';

const recordSchema = z.object({
  providerId: z.string().uuid(),
  ownerKind: z.enum(['provider', 'truck', 'driver']),
  docType: z.string().min(1),
  docNumber: z.string().max(60).optional(),
  storagePath: z.string().min(3),
  expiresAt: z.string().optional(),
});

/**
 * Registra un documento ya subido a Storage. Valida vencimiento (no puede estar
 * vencido al enviar) y que el path pertenezca a la carpeta del proveedor.
 */
export async function recordDocument(input: z.infer<typeof recordSchema>) {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Datos inválidos' };
  const d = parsed.data;

  if (!d.storagePath.startsWith(`${d.providerId}/`)) {
    return { ok: false as const, error: 'Ruta de archivo inválida' };
  }
  if (d.expiresAt && !isNotExpired(d.expiresAt)) {
    return { ok: false as const, error: 'El documento está vencido' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('provider_documents').insert({
    provider_id: d.providerId,
    owner_kind: d.ownerKind,
    doc_type: d.docType,
    doc_number: d.docNumber ?? null,
    storage_path: d.storagePath,
    expires_at: d.expiresAt ?? null,
    review_status: 'pending',
  });
  if (error) return { ok: false as const, error: 'No pudimos registrar el documento' };
  revalidatePath('/proveedor/estado-solicitud');
  return { ok: true as const };
}

export async function deleteDocument(docId: string) {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from('provider_documents')
    .select('id, storage_path')
    .eq('id', docId)
    .single();
  if (doc) {
    await supabase.storage.from('documents').remove([doc.storage_path]);
    await supabase.from('provider_documents').delete().eq('id', docId);
  }
  revalidatePath('/proveedor/estado-solicitud');
  return { ok: true as const };
}
