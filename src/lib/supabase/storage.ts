import 'server-only';
import { createClient } from '@/lib/supabase/server';

export const DOCUMENTS_BUCKET = 'documents';

/** Extensiones/MIME permitidos para documentación de proveedores. */
export const ALLOWED_DOC_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8 MB

export { sanitizeFilename } from '@/lib/validation/filename';

/** Devuelve una URL firmada de corta duración para ver un documento privado. */
export async function signedDocUrl(path: string, expiresIn = 60): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
