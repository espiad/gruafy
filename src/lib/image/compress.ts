'use client';

/**
 * Comprime una imagen en el navegador antes de subirla: la reescala a un máximo de
 * lado y la re-encodea como JPEG con calidad reducida. Así una foto de celular de
 * varios MB queda en ~100–300 KB, sube rápido y se ve rápido del otro lado.
 */
export async function compressImage(file: File, maxDim = 1280, quality = 0.7): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
  );
  if (!blob) throw new Error('No se pudo comprimir la imagen');
  return blob;
}
