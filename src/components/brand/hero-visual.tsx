'use client';

import { useState } from 'react';
import { GruafyMark } from '@/components/brand/logo';

/**
 * Imagen del hero. Muestra `public/brand/hero.jpg` cuando exista; hasta que se
 * cargue, cae con gracia al isotipo sobre fondo de marca. Reemplazá el archivo
 * (o su formato) para cambiar la imagen sin tocar código.
 */
export function HeroVisual() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex aspect-square w-full max-w-sm items-center justify-center rounded-[2rem] bg-brand-ink shadow-2xl">
        <GruafyMark className="h-28 w-auto text-brand-orange sm:h-40" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/hero.jpg"
      alt="gruafy — asistencia vial"
      onError={() => setFailed(true)}
      className="aspect-square w-full max-w-sm rounded-[2rem] object-cover shadow-2xl"
    />
  );
}
