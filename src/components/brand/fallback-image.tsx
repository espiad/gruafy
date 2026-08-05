'use client';

import { useState } from 'react';

/**
 * Imagen que, si el archivo no existe todavía (404), cae con gracia a un
 * placeholder. Sirve para dejar el hueco listo: subís el archivo a la ruta indicada
 * y aparece sola, sin tocar código.
 */
export function FallbackImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />
  );
}
